import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

// Échappe le HTML des textes saisis par l'utilisateur avant insertion dans un email
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

function clean(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) return {};
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(
      ([, v]) => v !== '' && v !== null && !(typeof v === 'number' && Number.isNaN(v)),
    ),
  );
}

const customerSchema = z.object({
  type: z.enum(['COMPANY', 'INDIVIDUAL']).default('COMPANY'),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.number().int().default(30),
  notes: z.string().optional(),
});

const lineSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
});

const invoiceSchema = z.object({
  customerId: z.string(),
  type: z.enum(['QUOTE', 'INVOICE', 'CREDIT_NOTE', 'PROFORMA']).default('INVOICE'),
  issueDate: z.string().transform((v) => new Date(v)),
  dueDate: z.string().transform((v) => new Date(v)),
  currency: z.string().length(3).default('XOF'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  date: z.string().transform((v) => new Date(v)),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'ORANGE_MONEY', 'WAVE', 'MTN_MONEY', 'FREE_MONEY', 'MOOV_MONEY', 'CHECK']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export class InvoicingService {
  async listCustomers(orgId: string) {
    return prisma.customer.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } });
  }

  async createCustomer(orgId: string, body: unknown) {
    const data = customerSchema.parse(clean(body));
    return prisma.customer.create({ data: { ...data, organizationId: orgId } });
  }

  async getCustomer(orgId: string, id: string) {
    const c = await prisma.customer.findFirst({ where: { id, organizationId: orgId } });
    if (!c) throw new AppError('Client introuvable', 404);
    return c;
  }

  async updateCustomer(orgId: string, id: string, body: unknown) {
    await this.getCustomer(orgId, id);
    const data = customerSchema.partial().parse(clean(body));
    return prisma.customer.update({ where: { id }, data });
  }

  async listSuppliers(orgId: string) {
    return prisma.supplier.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } });
  }

  async createSupplier(orgId: string, body: unknown) {
    const data = z.object({
      name: z.string().min(1), email: z.string().email().optional(), phone: z.string().optional(),
      address: z.string().optional(), country: z.string().optional(), taxId: z.string().optional(),
    }).parse(clean(body));
    return prisma.supplier.create({ data: { ...data, organizationId: orgId } });
  }

  async listInvoices(orgId: string, params: Record<string, string>) {
    const page = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '20', 10);
    const where: Record<string, unknown> = { organizationId: orgId };
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.customerId) where.customerId = params.customerId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { customer: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);
    return { invoices, total, page, limit };
  }

  async createInvoice(orgId: string, userId: string, body: unknown) {
    const data = invoiceSchema.parse(body);
    await this.getCustomer(orgId, data.customerId);

    const number = await this.generateNumber(orgId, data.type);
    const lines = data.lines.map((l) => ({
      ...l,
      total: l.quantity * l.unitPrice * (1 + l.taxRate / 100),
    }));
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const taxAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate / 100), 0);
    const total = subtotal + taxAmount;

    return prisma.invoice.create({
      data: {
        organizationId: orgId,
        customerId: data.customerId,
        createdById: userId,
        number,
        type: data.type,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        subtotal,
        taxAmount,
        total,
        notes: data.notes,
        terms: data.terms,
        lines: { create: lines },
      },
      include: { customer: true, lines: true },
    });
  }

  async getInvoice(orgId: string, id: string) {
    const inv = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        payments: true,
        createdBy: { select: { firstName: true, lastName: true } },
        organization: { select: { name: true, address: true, phone: true, email: true, taxId: true, currency: true, country: true, logo: true } },
      },
    });
    if (!inv) throw new AppError('Facture introuvable', 404);
    return inv;
  }

  async updateInvoice(orgId: string, id: string, body: unknown) {
    const inv = await this.getInvoice(orgId, id);

    // Modifiable tant qu'aucun paiement n'a été enregistré (les devis le sont toujours).
    if (inv.status === 'CANCELLED') {
      throw new AppError('Un document annulé ne peut plus être modifié.', 400);
    }
    if (Number(inv.paidAmount) > 0) {
      throw new AppError(
        'Cette facture a déjà reçu un paiement : elle ne peut plus être modifiée. Créez un avoir pour corriger.',
        400,
      );
    }

    const data = invoiceSchema.partial().parse(body);
    if (data.customerId) await this.getCustomer(orgId, data.customerId);

    const { lines: newLines, ...header } = data;

    // Sans changement de lignes : simple mise à jour de l'en-tête
    if (!newLines) {
      return prisma.invoice.update({
        where: { id },
        data: header,
        include: { customer: true, lines: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    // Recalcul complet des totaux à partir des nouvelles lignes
    const lines = newLines.map((l) => ({
      ...l,
      total: l.quantity * l.unitPrice * (1 + l.taxRate / 100),
    }));
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const taxAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate / 100), 0);
    const total = subtotal + taxAmount;

    // Remplacement atomique des lignes (compatible pooler : transaction en tableau)
    const [, updated] = await prisma.$transaction([
      prisma.invoiceLine.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: { ...header, subtotal, taxAmount, total, lines: { create: lines } },
        include: { customer: true, lines: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);
    return updated;
  }

  async sendInvoice(orgId: string, id: string) {
    const inv = await this.getInvoice(orgId, id);
    if (inv.status !== 'DRAFT') throw new AppError('Seules les factures brouillon peuvent etre envoyees', 400);
    return prisma.invoice.update({ where: { id }, data: { status: 'SENT' } });
  }

  async emailInvoice(orgId: string, id: string, body: unknown) {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;
    if (!apiKey || !fromEmail) {
      throw new AppError(
        'Service email non configuré. Ajoutez BREVO_API_KEY et EMAIL_FROM dans les variables d\'environnement du serveur.',
        503,
      );
    }

    const data = z.object({
      to: z.string().email(),
      message: z.string().max(2000).optional(),
      pdfBase64: z.string().min(100).max(4_000_000),
    }).parse(clean(body));

    const inv = await this.getInvoice(orgId, id);
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, email: true, phone: true },
    });

    const typeLabels: Record<string, string> = {
      INVOICE: 'Facture', QUOTE: 'Devis', PROFORMA: 'Facture proforma', CREDIT_NOTE: 'Avoir',
    };
    const docLabel = typeLabels[inv.type] || 'Facture';
    const subject = `${docLabel} ${inv.number} — ${org?.name || ''}`.trim();
    const total = Number(inv.total).toLocaleString('fr-FR');

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
        <div style="background:#111827;border-radius:12px 12px 0 0;padding:24px;color:#fff">
          <h2 style="margin:0;font-size:18px">${org?.name || ''}</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
          <p>Bonjour,</p>
          <p>${data.message ? escapeHtml(data.message).replace(/\n/g, '<br/>') : `Veuillez trouver ci-joint votre ${docLabel.toLowerCase()} <strong>${inv.number}</strong> d'un montant de <strong>${total} ${inv.currency}</strong>.`}</p>
          <p style="color:#6b7280;font-size:13px">Le document PDF est joint à cet email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
          <p style="color:#9ca3af;font-size:12px">${org?.name || ''}${org?.phone ? ' • ' + org.phone : ''}${org?.email ? ' • ' + org.email : ''}</p>
        </div>
      </div>`;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: org?.name || 'ERP SaaS', email: fromEmail },
        to: [{ email: data.to }],
        replyTo: org?.email ? { email: org.email, name: org.name } : undefined,
        subject,
        htmlContent,
        attachment: [{ name: `${inv.number}.pdf`, content: data.pdfBase64 }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Brevo error:', res.status, detail);
      throw new AppError('L\'envoi de l\'email a échoué. Vérifiez la configuration Brevo.', 502);
    }

    if (inv.status === 'DRAFT') {
      await prisma.invoice.update({ where: { id }, data: { status: 'SENT' } });
    }
    return { sent: true, to: data.to };
  }

  async addPayment(orgId: string, invoiceId: string, body: unknown) {
    const inv = await this.getInvoice(orgId, invoiceId);
    if (['CANCELLED', 'PAID'].includes(inv.status)) throw new AppError('Cette facture ne peut plus recevoir de paiement', 400);

    const data = paymentSchema.parse(clean(body));
    const payment = await prisma.payment.create({ data: { invoiceId, ...data } });

    const newPaid = Number(inv.paidAmount) + data.amount;
    const status = newPaid >= Number(inv.total) ? 'PAID' : 'PARTIAL';
    await prisma.invoice.update({ where: { id: invoiceId }, data: { paidAmount: newPaid, status } });

    return payment;
  }

  async deleteInvoice(orgId: string, id: string) {
    const inv = await this.getInvoice(orgId, id);
    if (inv.status !== 'DRAFT') throw new AppError('Seules les factures brouillon peuvent etre supprimees', 400);
    await prisma.invoice.delete({ where: { id } });
  }

  private async generateNumber(orgId: string, type: string) {
    const prefix = { INVOICE: 'FAC', QUOTE: 'DEV', CREDIT_NOTE: 'AVO', PROFORMA: 'PRO' }[type] || 'DOC';
    const count = await prisma.invoice.count({ where: { organizationId: orgId, type: type as never } });
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
