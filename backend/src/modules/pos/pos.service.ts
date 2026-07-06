import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

// Client générique pour les ventes de caisse sans client identifié
const WALKIN_NAME = 'Client comptant';
const POS_NOTE = 'Vente caisse';

const ORG_SELECT = {
  name: true, address: true, phone: true, email: true,
  currency: true, country: true, logo: true, taxId: true,
} as const;

const saleLineSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
});

const saleSchema = z.object({
  lines: z.array(saleLineSchema).min(1),
  // Espèces, Wave, Orange Money, Carte bancaire (mappée sur BANK_TRANSFER)
  method: z.enum(['CASH', 'WAVE', 'ORANGE_MONEY', 'BANK_TRANSFER']),
  methodLabel: z.string().max(40).optional(),
  amountReceived: z.number().min(0).optional(),
  customerId: z.string().optional(),
  currency: z.string().length(3).default('XOF'),
  reference: z.string().max(60).optional(),
});

export class PosService {
  /** Catalogue optimisé pour la caisse : produits actifs avec prix, code-barres, photo et stock. */
  async catalog(orgId: string) {
    const products = await prisma.product.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { stockLevels: true },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      barcode: p.barcode || null,
      category: p.category || null,
      image: p.image || null,
      salePrice: Number(p.salePrice ?? 0),
      taxRate: Number(p.taxRate ?? 0),
      unitOfMeasure: p.unitOfMeasure,
      stock: p.stockLevels.reduce((s, l) => s + Number(l.quantity), 0),
    }));
  }

  /**
   * Enregistre une vente de caisse : facture PAYÉE + paiement + sortie de stock,
   * le tout dans une transaction atomique. Renvoie le ticket à imprimer.
   */
  async sale(orgId: string, userId: string, body: unknown) {
    const data = saleSchema.parse(body);

    // Résolution du client (client de passage par défaut)
    let customerId = data.customerId;
    if (customerId) {
      const c = await prisma.customer.findFirst({ where: { id: customerId, organizationId: orgId } });
      if (!c) throw new AppError('Client introuvable', 404);
    } else {
      const existing = await prisma.customer.findFirst({
        where: { organizationId: orgId, name: WALKIN_NAME },
      });
      customerId = existing
        ? existing.id
        : (await prisma.customer.create({
            data: { organizationId: orgId, name: WALKIN_NAME, type: 'INDIVIDUAL' },
          })).id;
    }

    const lines = data.lines.map((l) => ({
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
      total: l.quantity * l.unitPrice * (1 + l.taxRate / 100),
    }));
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const taxAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate / 100), 0);
    const total = subtotal + taxAmount;

    const number = await this.generateNumber(orgId);
    const now = new Date();

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: orgId,
          customerId: customerId!,
          createdById: userId,
          number,
          type: 'INVOICE',
          status: 'PAID',
          issueDate: now,
          dueDate: now,
          currency: data.currency,
          subtotal,
          taxAmount,
          total,
          paidAmount: total,
          paymentMethod: data.method,
          notes: `${POS_NOTE}${data.methodLabel ? ' — ' + data.methodLabel : ''}`,
          lines: {
            create: lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxRate: l.taxRate,
              total: l.total,
              ...(l.productId ? { productId: l.productId } : {}),
            })),
          },
        },
        include: {
          lines: true,
          customer: { select: { id: true, name: true } },
          organization: { select: ORG_SELECT },
        },
      });

      await tx.payment.create({
        data: {
          invoiceId: inv.id,
          amount: total,
          date: now,
          method: data.method,
          reference: data.reference,
          notes: data.methodLabel,
        },
      });

      // Sortie de stock pour les lignes rattachées à un produit
      const productLines = lines.filter((l) => l.productId);
      if (productLines.length) {
        let warehouse = await tx.warehouse.findFirst({ where: { organizationId: orgId } });
        if (!warehouse) {
          warehouse = await tx.warehouse.create({
            data: { organizationId: orgId, name: 'Boutique' },
          });
        }
        for (const l of productLines) {
          await tx.stockMovement.create({
            data: {
              productId: l.productId!,
              warehouseId: warehouse.id,
              type: 'SALE',
              quantity: l.quantity,
              reference: number,
              notes: POS_NOTE,
            },
          });
          await tx.stockLevel.upsert({
            where: { productId_warehouseId: { productId: l.productId!, warehouseId: warehouse.id } },
            update: { quantity: { increment: -Math.abs(l.quantity) } },
            create: { productId: l.productId!, warehouseId: warehouse.id, quantity: -Math.abs(l.quantity) },
          });
        }
      }

      return inv;
    });

    const change =
      data.amountReceived != null ? Math.max(0, data.amountReceived - total) : null;

    return { invoice, change, amountReceived: data.amountReceived ?? null };
  }

  /** Résumé de la journée de caisse (nombre de ventes, total, répartition par moyen de paiement). */
  async todaySummary(orgId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const sales = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        type: 'INVOICE',
        status: 'PAID',
        issueDate: { gte: start },
        notes: { startsWith: POS_NOTE },
      },
      select: { total: true, paymentMethod: true },
    });

    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const s of sales) {
      const amt = Number(s.total);
      total += amt;
      const m = s.paymentMethod || 'CASH';
      byMethod[m] = (byMethod[m] || 0) + amt;
    }

    return { date: start, count: sales.length, total, byMethod };
  }

  private async generateNumber(orgId: string) {
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: { organizationId: orgId, notes: { startsWith: POS_NOTE } },
    });
    return `TIC-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
