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
    if (!['DRAFT'].includes(inv.status)) throw new AppError('Seules les factures brouillon peuvent etre modifiees', 400);
    const data = invoiceSchema.partial().omit({ lines: true }).parse(body);
    return prisma.invoice.update({ where: { id }, data });
  }

  async sendInvoice(orgId: string, id: string) {
    const inv = await this.getInvoice(orgId, id);
    if (inv.status !== 'DRAFT') throw new AppError('Seules les factures brouillon peuvent etre envoyees', 400);
    return prisma.invoice.update({ where: { id }, data: { status: 'SENT' } });
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
