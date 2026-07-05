import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

function clean(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) return {};
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(
      ([, v]) => v !== '' && v !== null && !(typeof v === 'number' && Number.isNaN(v)),
    ),
  );
}

const productSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  unitOfMeasure: z.string().default('pcs'),
  costPrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).default(0),
  reorderLevel: z.number().min(0).optional(),
  barcode: z.string().optional(),
});

const movementSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  type: z.enum(['PURCHASE', 'SALE', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'PRODUCTION']),
  quantity: z.number(),
  unitCost: z.number().min(0).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().optional().transform((v) => (v ? new Date(v) : new Date())),
});

export class InventoryService {
  async listProducts(orgId: string) {
    return prisma.product.findMany({
      where: { organizationId: orgId },
      include: { stockLevels: { include: { warehouse: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createProduct(orgId: string, body: unknown) {
    const data = productSchema.parse(clean(body));
    const existing = await prisma.product.findUnique({ where: { organizationId_code: { organizationId: orgId, code: data.code } } });
    if (existing) throw new AppError('Ce code produit existe deja', 409);
    return prisma.product.create({ data: { ...data, organizationId: orgId } });
  }

  // ===== Groupes de produits (catégories avec photo) =====

  /** Catégories dérivées des produits, fusionnées avec leurs photos enregistrées. */
  async listCategories(orgId: string) {
    const [grouped, saved] = await Promise.all([
      prisma.product.groupBy({
        by: ['category'],
        where: { organizationId: orgId, category: { not: null } },
        _count: { _all: true },
      }),
      prisma.productCategory.findMany({ where: { organizationId: orgId } }),
    ]);

    const images = new Map(saved.map((c) => [c.name.toLowerCase(), c.image]));
    const counts = new Map<string, number>();
    grouped.forEach((g) => {
      if (g.category) counts.set(g.category, g._count._all);
    });
    // Les catégories avec photo mais sans produit restent visibles
    saved.forEach((c) => { if (!counts.has(c.name)) counts.set(c.name, 0); });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, image: images.get(name.toLowerCase()) || null }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /** Enregistre (ou remplace) la photo de représentation d'un groupe de produits. */
  async setCategoryImage(orgId: string, body: unknown) {
    const data = z.object({
      name: z.string().min(1).max(80),
      image: z.string().max(500_000).nullable(), // data URL (photo compressée côté client)
    }).parse(body);

    return prisma.productCategory.upsert({
      where: { organizationId_name: { organizationId: orgId, name: data.name } },
      update: { image: data.image },
      create: { organizationId: orgId, name: data.name, image: data.image },
    });
  }

  async getProduct(orgId: string, id: string) {
    const p = await prisma.product.findFirst({
      where: { id, organizationId: orgId },
      include: { stockLevels: { include: { warehouse: true } }, stockMovements: { orderBy: { date: 'desc' }, take: 20 } },
    });
    if (!p) throw new AppError('Produit introuvable', 404);
    return p;
  }

  async updateProduct(orgId: string, id: string, body: unknown) {
    await this.getProduct(orgId, id);
    const data = productSchema.partial().parse(body);
    return prisma.product.update({ where: { id }, data });
  }

  async listWarehouses(orgId: string) {
    return prisma.warehouse.findMany({ where: { organizationId: orgId } });
  }

  async createWarehouse(orgId: string, body: unknown) {
    const data = z.object({
      name: z.string().min(1),
      address: z.string().optional(),
    }).parse(clean(body));
    return prisma.warehouse.create({ data: { ...data, organizationId: orgId } });
  }

  async stockLevels(orgId: string) {
    return prisma.stockLevel.findMany({
      where: { product: { organizationId: orgId } },
      include: { product: true, warehouse: true },
    });
  }

  async lowStock(orgId: string) {
    const products = await prisma.product.findMany({
      where: { organizationId: orgId, reorderLevel: { not: null } },
      include: { stockLevels: true },
    });
    return products.filter((p) => {
      const total = p.stockLevels.reduce((s, l) => s + Number(l.quantity), 0);
      return total <= Number(p.reorderLevel);
    });
  }

  async listMovements(orgId: string) {
    return prisma.stockMovement.findMany({
      where: { product: { organizationId: orgId } },
      include: { product: true, warehouse: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  async createMovement(orgId: string, body: unknown) {
    const data = movementSchema.parse(body);
    await this.getProduct(orgId, data.productId);

    const movement = await prisma.stockMovement.create({ data });

    const delta = ['SALE', 'TRANSFER'].includes(data.type) ? -Math.abs(data.quantity) : Math.abs(data.quantity);

    await prisma.stockLevel.upsert({
      where: { productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId } },
      update: { quantity: { increment: delta } },
      create: { productId: data.productId, warehouseId: data.warehouseId, quantity: delta },
    });

    return movement;
  }

  async listPOs(orgId: string) {
    return prisma.purchaseOrder.findMany({
      where: { organizationId: orgId },
      include: { supplier: true, lines: { include: { product: true } } },
      orderBy: { orderDate: 'desc' },
    });
  }

  async createPO(orgId: string, body: unknown) {
    const data = z.object({
      supplierId: z.string(),
      orderDate: z.string().transform((v) => new Date(v)),
      expectedDate: z.string().transform((v) => new Date(v)).optional(),
      notes: z.string().optional(),
      lines: z.array(z.object({ productId: z.string(), quantity: z.number().positive(), unitCost: z.number().min(0) })).min(1),
    }).parse(body);

    const lines = data.lines.map((l) => ({ ...l, total: l.quantity * l.unitCost }));
    const total = lines.reduce((s, l) => s + l.total, 0);
    const count = await prisma.purchaseOrder.count({ where: { organizationId: orgId } });
    const number = `BC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return prisma.purchaseOrder.create({
      data: { organizationId: orgId, supplierId: data.supplierId, number, orderDate: data.orderDate, expectedDate: data.expectedDate, total, notes: data.notes, lines: { create: lines } },
      include: { supplier: true, lines: { include: { product: true } } },
    });
  }

  async confirmPO(orgId: string, id: string) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id, organizationId: orgId } });
    if (!po) throw new AppError('Bon de commande introuvable', 404);
    if (po.status !== 'DRAFT') throw new AppError('Seul un brouillon peut etre confirme', 400);
    return prisma.purchaseOrder.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  async cancelPO(orgId: string, id: string) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id, organizationId: orgId } });
    if (!po) throw new AppError('Bon de commande introuvable', 404);
    if (po.status === 'RECEIVED') throw new AppError('Un bon de commande recu ne peut pas etre annule', 400);
    return prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async receivePO(orgId: string, id: string) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId: orgId },
      include: { lines: true },
    });
    if (!po) throw new AppError('Bon de commande introuvable', 404);
    if (po.status !== 'CONFIRMED') throw new AppError('Le bon de commande doit etre confirme avant reception', 400);

    const warehouse = await prisma.warehouse.findFirst({ where: { organizationId: orgId } });
    if (!warehouse) throw new AppError('Aucun entrepot configure', 400);

    for (const line of po.lines) {
      await this.createMovement(orgId, {
        productId: line.productId, warehouseId: warehouse.id,
        type: 'PURCHASE', quantity: Number(line.quantity), unitCost: Number(line.unitCost), reference: po.number,
      });
    }

    return prisma.purchaseOrder.update({ where: { id }, data: { status: 'RECEIVED' } });
  }
}
