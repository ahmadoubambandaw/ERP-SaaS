import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

const accountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentCode: z.string().optional(),
});

const journalSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['SALES', 'PURCHASES', 'BANK', 'CASH', 'GENERAL', 'PAYROLL']),
});

const entryLineSchema = z.object({
  debitAccountId: z.string().optional(),
  creditAccountId: z.string().optional(),
  description: z.string().optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
});

const entrySchema = z.object({
  journalId: z.string(),
  reference: z.string().min(1),
  date: z.string().transform((v) => new Date(v)),
  description: z.string().min(1),
  lines: z.array(entryLineSchema).min(2),
});

export class AccountingService {
  async listAccounts(organizationId: string) {
    return prisma.account.findMany({
      where: { organizationId },
      orderBy: { code: 'asc' },
    });
  }

  async createAccount(organizationId: string, body: unknown) {
    const data = accountSchema.parse(body);
    const existing = await prisma.account.findUnique({
      where: { organizationId_code: { organizationId, code: data.code } },
    });
    if (existing) throw new AppError('Ce code de compte existe deja', 409);
    return prisma.account.create({ data: { ...data, organizationId } });
  }

  async getAccount(organizationId: string, id: string) {
    const acc = await prisma.account.findFirst({ where: { id, organizationId } });
    if (!acc) throw new AppError('Compte introuvable', 404);
    return acc;
  }

  async updateAccount(organizationId: string, id: string, body: unknown) {
    await this.getAccount(organizationId, id);
    const data = accountSchema.partial().parse(body);
    return prisma.account.update({ where: { id }, data });
  }

  async listJournals(organizationId: string) {
    return prisma.journal.findMany({
      where: { organizationId },
      orderBy: { code: 'asc' },
    });
  }

  async createJournal(organizationId: string, body: unknown) {
    const data = journalSchema.parse(body);
    return prisma.journal.create({ data: { ...data, organizationId } });
  }

  async listEntries(organizationId: string, params: { page?: string; limit?: string; journalId?: string; status?: string }) {
    const page = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '20', 10);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { organizationId };
    if (params.journalId) where.journalId = params.journalId;
    if (params.status) where.status = params.status;

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: { journal: true, lines: { include: { debitAccount: true, creditAccount: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);
    return { entries, total, page, limit };
  }

  async createEntry(organizationId: string, body: unknown) {
    const data = entrySchema.parse(body);
    const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new AppError('L\'ecriture n\'est pas equilibree (debit != credit)', 400);
    }

    return prisma.journalEntry.create({
      data: {
        organizationId,
        journalId: data.journalId,
        reference: data.reference,
        date: data.date,
        description: data.description,
        totalDebit,
        totalCredit,
        lines: { create: data.lines },
      },
      include: { lines: true },
    });
  }

  async getEntry(organizationId: string, id: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, organizationId },
      include: { journal: true, lines: { include: { debitAccount: true, creditAccount: true } } },
    });
    if (!entry) throw new AppError('Ecriture introuvable', 404);
    return entry;
  }

  async postEntry(organizationId: string, id: string) {
    const entry = await this.getEntry(organizationId, id);
    if (entry.status !== 'DRAFT') throw new AppError('Seules les ecritures brouillon peuvent etre validees', 400);
    return prisma.journalEntry.update({ where: { id }, data: { status: 'POSTED' } });
  }

  async deleteEntry(organizationId: string, id: string) {
    const entry = await this.getEntry(organizationId, id);
    if (entry.status === 'POSTED') throw new AppError('Impossible de supprimer une ecriture comptabilisee', 400);
    await prisma.journalEntry.delete({ where: { id } });
  }

  async trialBalance(organizationId: string) {
    const accounts = await prisma.account.findMany({
      where: { organizationId },
      include: {
        debitLines: { include: { entry: { select: { status: true } } } },
        creditLines: { include: { entry: { select: { status: true } } } },
      },
    });

    return accounts.map((acc) => {
      const totalDebit = acc.debitLines
        .filter((l) => l.entry.status === 'POSTED')
        .reduce((s, l) => s + Number(l.debit), 0);
      const totalCredit = acc.creditLines
        .filter((l) => l.entry.status === 'POSTED')
        .reduce((s, l) => s + Number(l.credit), 0);
      return { code: acc.code, name: acc.name, type: acc.type, debit: totalDebit, credit: totalCredit, balance: totalDebit - totalCredit };
    }).filter((a) => a.debit !== 0 || a.credit !== 0);
  }

  async ledger(organizationId: string, accountCode: string) {
    const account = await prisma.account.findUnique({
      where: { organizationId_code: { organizationId, code: accountCode } },
    });
    if (!account) throw new AppError('Compte introuvable', 404);

    const debitLines = await prisma.journalLine.findMany({
      where: { debitAccountId: account.id, entry: { status: 'POSTED' } },
      include: { entry: { select: { date: true, reference: true, description: true } } },
      orderBy: { entry: { date: 'asc' } },
    });

    const creditLines = await prisma.journalLine.findMany({
      where: { creditAccountId: account.id, entry: { status: 'POSTED' } },
      include: { entry: { select: { date: true, reference: true, description: true } } },
      orderBy: { entry: { date: 'asc' } },
    });

    const lines = [
      ...debitLines.map((l) => ({ date: l.entry.date, reference: l.entry.reference, description: l.description || l.entry.description, debit: Number(l.debit), credit: 0 })),
      ...creditLines.map((l) => ({ date: l.entry.date, reference: l.entry.reference, description: l.description || l.entry.description, debit: 0, credit: Number(l.credit) })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = 0;
    const ledgerLines = lines.map((l) => {
      balance += l.debit - l.credit;
      return { ...l, balance };
    });

    return { account, lines: ledgerLines };
  }
}
