import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

type AccType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

// Plan comptable SYSCOHADA révisé — comptes essentiels pour une PME.
const SYSCOHADA_ACCOUNTS: { code: string; name: string; type: AccType }[] = [
  // Classe 1 — Ressources durables (capitaux propres & dettes financières)
  { code: '101', name: 'Capital social', type: 'EQUITY' },
  { code: '106', name: 'Réserves', type: 'EQUITY' },
  { code: '110', name: 'Report à nouveau', type: 'EQUITY' },
  { code: '120', name: "Résultat de l'exercice (bénéfice)", type: 'EQUITY' },
  { code: '129', name: "Résultat de l'exercice (perte)", type: 'EQUITY' },
  { code: '162', name: 'Emprunts et dettes auprès des établissements de crédit', type: 'LIABILITY' },
  // Classe 2 — Actif immobilisé
  { code: '221', name: 'Terrains', type: 'ASSET' },
  { code: '231', name: 'Bâtiments', type: 'ASSET' },
  { code: '241', name: 'Matériel et outillage', type: 'ASSET' },
  { code: '244', name: 'Matériel et mobilier de bureau', type: 'ASSET' },
  { code: '245', name: 'Matériel de transport', type: 'ASSET' },
  { code: '2441', name: 'Matériel informatique', type: 'ASSET' },
  // Classe 3 — Stocks
  { code: '311', name: 'Marchandises', type: 'ASSET' },
  { code: '331', name: 'Matières premières', type: 'ASSET' },
  { code: '358', name: 'Produits finis', type: 'ASSET' },
  // Classe 4 — Tiers
  { code: '401', name: 'Fournisseurs', type: 'LIABILITY' },
  { code: '409', name: 'Fournisseurs débiteurs (avances)', type: 'ASSET' },
  { code: '411', name: 'Clients', type: 'ASSET' },
  { code: '419', name: 'Clients créditeurs (avances reçues)', type: 'LIABILITY' },
  { code: '421', name: 'Personnel, salaires dus', type: 'LIABILITY' },
  { code: '431', name: 'Sécurité sociale (IPRES, CSS)', type: 'LIABILITY' },
  { code: '441', name: "État, impôt sur les bénéfices", type: 'LIABILITY' },
  { code: '443', name: 'État, TVA facturée', type: 'LIABILITY' },
  { code: '445', name: 'État, TVA récupérable', type: 'ASSET' },
  { code: '447', name: 'État, autres impôts et taxes', type: 'LIABILITY' },
  // Classe 5 — Trésorerie
  { code: '521', name: 'Banques', type: 'ASSET' },
  { code: '531', name: 'Mobile Money (Wave, Orange Money)', type: 'ASSET' },
  { code: '571', name: 'Caisse', type: 'ASSET' },
  // Classe 6 — Charges
  { code: '601', name: 'Achats de marchandises', type: 'EXPENSE' },
  { code: '602', name: 'Achats de matières premières', type: 'EXPENSE' },
  { code: '605', name: "Autres achats (eau, électricité, fournitures)", type: 'EXPENSE' },
  { code: '611', name: 'Transports', type: 'EXPENSE' },
  { code: '622', name: 'Locations et charges locatives', type: 'EXPENSE' },
  { code: '627', name: 'Services bancaires', type: 'EXPENSE' },
  { code: '641', name: 'Impôts et taxes', type: 'EXPENSE' },
  { code: '661', name: 'Charges de personnel (salaires)', type: 'EXPENSE' },
  { code: '664', name: 'Charges sociales', type: 'EXPENSE' },
  { code: '681', name: "Dotations aux amortissements", type: 'EXPENSE' },
  // Classe 7 — Produits
  { code: '701', name: 'Ventes de marchandises', type: 'REVENUE' },
  { code: '706', name: 'Services vendus', type: 'REVENUE' },
  { code: '707', name: 'Produits accessoires', type: 'REVENUE' },
  { code: '771', name: 'Produits financiers', type: 'REVENUE' },
];

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

  /** Charge le plan comptable SYSCOHADA standard (ne recrée pas les comptes existants). */
  async seedSyscohadaChart(organizationId: string) {
    const res = await prisma.account.createMany({
      data: SYSCOHADA_ACCOUNTS.map((a) => ({ ...a, organizationId })),
      skipDuplicates: true,
    });
    const total = await prisma.account.count({ where: { organizationId } });
    return { created: res.count, total };
  }

  /** Bilan comptable : Actif / Passif classés selon les classes SYSCOHADA. */
  async balanceSheet(organizationId: string) {
    const accounts = await prisma.account.findMany({
      where: { organizationId },
      include: {
        debitLines: { include: { entry: { select: { status: true } } } },
        creditLines: { include: { entry: { select: { status: true } } } },
      },
      orderBy: { code: 'asc' },
    });

    const balances = accounts.map((acc) => {
      const debit = acc.debitLines.filter((l) => l.entry.status === 'POSTED').reduce((s, l) => s + Number(l.debit), 0);
      const credit = acc.creditLines.filter((l) => l.entry.status === 'POSTED').reduce((s, l) => s + Number(l.credit), 0);
      return { code: acc.code, name: acc.name, type: acc.type as AccType, bal: debit - credit };
    });

    // Résultat net = Produits (classe 7) - Charges (classe 6)
    const produits = balances.filter((b) => b.code.startsWith('7')).reduce((s, b) => s - b.bal, 0); // produits: solde créditeur
    const charges = balances.filter((b) => b.code.startsWith('6')).reduce((s, b) => s + b.bal, 0);   // charges: solde débiteur
    const resultatNet = produits - charges;

    const actif = { immobilise: [] as Line[], circulant: [] as Line[], tresorerie: [] as Line[] };
    const passif = { capitaux: [] as Line[], dettesFin: [] as Line[], circulant: [] as Line[], tresorerie: [] as Line[] };

    for (const b of balances) {
      if (Math.abs(b.bal) < 0.005) continue;
      const cls = b.code.charAt(0);
      const line = (amount: number): Line => ({ code: b.code, name: b.name, amount });

      if (cls === '2') actif.immobilise.push(line(b.bal));
      else if (cls === '3') actif.circulant.push(line(b.bal));
      else if (cls === '4') {
        if (b.bal >= 0) actif.circulant.push(line(b.bal));
        else passif.circulant.push(line(-b.bal));
      } else if (cls === '5') {
        if (b.bal >= 0) actif.tresorerie.push(line(b.bal));
        else passif.tresorerie.push(line(-b.bal));
      } else if (cls === '1') {
        if (b.code.startsWith('16')) passif.dettesFin.push(line(-b.bal));
        else passif.capitaux.push(line(-b.bal));
      }
    }

    // Le résultat net de l'exercice figure au passif (capitaux propres)
    if (Math.abs(resultatNet) >= 0.005) {
      passif.capitaux.push({ code: '13', name: "Résultat net de l'exercice", amount: resultatNet });
    }

    const sum = (arr: Line[]) => arr.reduce((s, l) => s + l.amount, 0);
    const totalActif = sum(actif.immobilise) + sum(actif.circulant) + sum(actif.tresorerie);
    const totalPassif = sum(passif.capitaux) + sum(passif.dettesFin) + sum(passif.circulant) + sum(passif.tresorerie);

    return {
      actif, passif, resultatNet,
      totalActif, totalPassif,
      equilibre: Math.abs(totalActif - totalPassif) < 0.5,
    };
  }
}

interface Line { code: string; name: string; amount: number; }
