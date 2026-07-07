import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { clearSubscriptionCache } from '../../middleware/subscription.middleware';
import { clearPlanCache } from '../../middleware/plan.middleware';
import { PLAN_MODULES, PLAN_PRICE_XOF, planUserLimit } from '../../config/plans';
import { sendEmail, naatalEmailShell, isEmailConfigured } from '../../utils/email';
import { z } from 'zod';

// Emails de relance envoyés à ces seuils de jours restants avant expiration
const REMINDER_DAYS = [3, 1];

const REFERRAL_REWARD_MONTHS = 1;

export class SubscriptionService {
  // Génère et enregistre un code de parrainage si l'organisation n'en a pas encore
  private async ensureReferralCode(orgId: string, current: string | null): Promise<string> {
    if (current) return current;
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 8; i++) {
      const code = 'NA-' + Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const clash = await prisma.organization.findUnique({ where: { referralCode: code } });
      if (!clash) {
        await prisma.organization.update({ where: { id: orgId }, data: { referralCode: code } });
        return code;
      }
    }
    const fallback = 'NA-' + Date.now().toString(36).toUpperCase();
    await prisma.organization.update({ where: { id: orgId }, data: { referralCode: fallback } });
    return fallback;
  }

  async getMine(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, planExpiresAt: true, createdAt: true, referralCode: true },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);

    const now = Date.now();
    const expiresAt = org.planExpiresAt;
    const daysLeft = expiresAt
      ? Math.ceil((expiresAt.getTime() - now) / (24 * 60 * 60 * 1000))
      : null;

    const referralCode = await this.ensureReferralCode(orgId, org.referralCode);
    const [referralsTotal, referralsRewarded] = await Promise.all([
      prisma.organization.count({ where: { referredById: orgId } }),
      prisma.organization.count({ where: { referredById: orgId, referralRewarded: true } }),
    ]);

    return {
      plan: org.plan,
      planExpiresAt: expiresAt,
      unlimited: expiresAt === null,
      active: expiresAt === null || expiresAt.getTime() >= now,
      daysLeft,
      modules: PLAN_MODULES[org.plan] || PLAN_MODULES.STARTER,
      userLimit: planUserLimit(org.plan),
      referralCode,
      referralsTotal,
      monthsEarned: referralsRewarded * REFERRAL_REWARD_MONTHS,
      rewardMonths: REFERRAL_REWARD_MONTHS,
    };
  }

  // ===== Plateforme (SUPER_ADMIN) =====

  async listOrganizations() {
    return prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        currency: true,
        plan: true,
        planExpiresAt: true,
        createdAt: true,
        referredById: true,
        referralRewarded: true,
        // Confidentialité : jamais le nombre de factures/ventes du client
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Tableau de bord du fondateur : revenus, MRR, croissance, activité
  async platformStats() {
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [orgs, completedPayments, recentPayments, referralsTotal] = await Promise.all([
      prisma.organization.findMany({
        select: { id: true, plan: true, planExpiresAt: true, createdAt: true },
      }),
      prisma.subscriptionPayment.findMany({
        where: { status: 'COMPLETED' },
        select: { organizationId: true, amount: true, paidAt: true },
      }),
      prisma.subscriptionPayment.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { paidAt: 'desc' },
        take: 8,
        select: {
          id: true, amount: true, currency: true, plan: true, months: true, paidAt: true,
          organization: { select: { name: true } },
        },
      }),
      prisma.organization.count({ where: { referralRewarded: true } }),
    ]);

    const num = (v: unknown) => Number(v ?? 0);

    // Comptes clients (on exclut les organisations en accès illimité = comptes internes)
    const clientOrgs = orgs.filter((o) => o.planExpiresAt !== null);
    const activeOrgs = clientOrgs.filter((o) => o.planExpiresAt!.getTime() >= now);
    const expiredOrgs = clientOrgs.filter((o) => o.planExpiresAt!.getTime() < now);

    // Organisations ayant au moins un paiement réel = clients payants
    const payingIds = new Set(completedPayments.map((p) => p.organizationId));
    const payingActive = activeOrgs.filter((o) => payingIds.has(o.id));
    const trialsActive = activeOrgs.filter((o) => !payingIds.has(o.id));

    // Taux de conversion : clients ayant déjà payé / total des clients
    const everPaidClients = clientOrgs.filter((o) => payingIds.has(o.id)).length;
    const conversionRate = clientOrgs.length
      ? Math.round((everPaidClients / clientOrgs.length) * 100)
      : 0;

    // Revenus
    const revenueTotal = completedPayments.reduce((s, p) => s + num(p.amount), 0);
    const revenueThisMonth = completedPayments
      .filter((p) => p.paidAt && p.paidAt >= startOfMonth)
      .reduce((s, p) => s + num(p.amount), 0);

    // MRR estimé : somme du prix mensuel des clients payants actuellement actifs
    const mrr = payingActive.reduce((s, o) => s + (PLAN_PRICE_XOF[o.plan] || 0), 0);

    // Répartition par formule (clients uniquement)
    const planDistribution: Record<string, number> = { CAISSE: 0, STARTER: 0, PROFESSIONAL: 0, ENTERPRISE: 0 };
    clientOrgs.forEach((o) => { planDistribution[o.plan] = (planDistribution[o.plan] || 0) + 1; });

    // Nouveaux comptes ce mois-ci
    const newThisMonth = orgs.filter((o) => o.createdAt >= startOfMonth).length;

    // Évolution du revenu sur les 6 derniers mois (buckets YYYY-MM)
    const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const revenueByMonth: { month: string; revenue: number }[] = [];
    const buckets = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, 0);
      revenueByMonth.push({ month: MONTHS_FR[d.getMonth()], revenue: 0 });
    }
    completedPayments.forEach((p) => {
      if (!p.paidAt) return;
      const key = `${p.paidAt.getFullYear()}-${p.paidAt.getMonth()}`;
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + num(p.amount));
    });
    let bi = 0;
    for (const value of buckets.values()) {
      revenueByMonth[bi].revenue = value;
      bi++;
    }

    return {
      totalClients: clientOrgs.length,
      activeClients: activeOrgs.length,
      expiredClients: expiredOrgs.length,
      payingClients: payingActive.length,
      trialClients: trialsActive.length,
      everPaidClients,
      conversionRate,
      newThisMonth,
      revenueTotal,
      revenueThisMonth,
      mrr,
      paymentsCount: completedPayments.length,
      referralsRewarded: referralsTotal,
      planDistribution,
      revenueByMonth,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        org: p.organization?.name || '—',
        amount: num(p.amount),
        currency: p.currency,
        plan: p.plan,
        months: p.months,
        paidAt: p.paidAt,
      })),
    };
  }

  // Fiche client détaillée (SUPER_ADMIN) : abonnement, paiements, factures, équipe
  async getOrganizationDetails(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true, name: true, slug: true, country: true, currency: true,
        plan: true, planExpiresAt: true, createdAt: true, email: true, phone: true,
        referralCode: true, referredById: true,
      },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);

    // Confidentialité : on ne remonte JAMAIS l'activité commerciale du client
    // (ventes, factures, chiffre d'affaires). Seul son abonnement Naatal nous concerne.
    const [payments, users, referredBy] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where: { organizationId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, plan: true, months: true, amount: true, currency: true, status: true, createdAt: true, paidAt: true },
      }),
      prisma.user.findMany({
        where: { organizationId: id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      }),
      org.referredById
        ? prisma.organization.findUnique({ where: { id: org.referredById }, select: { name: true } })
        : Promise.resolve(null),
    ]);

    const num = (v: unknown) => Number(v ?? 0);
    const totalPaid = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((s, p) => s + num(p.amount), 0);

    return {
      ...org,
      referredByName: referredBy?.name || null,
      totalPaid,
      users,
      payments: payments.map((p) => ({ ...p, amount: num(p.amount) })),
    };
  }

  // Relances par email des abonnements qui expirent bientôt (J-3, J-1)
  async runExpiryReminders() {
    if (!isEmailConfigured()) {
      return { configured: false, sent: 0, details: [] as { org: string; to: string; daysLeft: number }[] };
    }

    const now = Date.now();
    const maxDays = Math.max(...REMINDER_DAYS);
    const horizon = new Date(now + (maxDays + 1) * 24 * 60 * 60 * 1000);

    const orgs = await prisma.organization.findMany({
      where: { planExpiresAt: { not: null, gt: new Date(now), lte: horizon } },
      select: {
        id: true, name: true, plan: true, planExpiresAt: true,
        users: {
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { email: true, firstName: true },
        },
      },
    });

    const details: { org: string; to: string; daysLeft: number }[] = [];
    for (const org of orgs) {
      const daysLeft = Math.ceil((org.planExpiresAt!.getTime() - now) / (24 * 60 * 60 * 1000));
      if (!REMINDER_DAYS.includes(daysLeft)) continue;
      const recipient = org.users[0];
      if (!recipient?.email) continue;

      const price = PLAN_PRICE_XOF[org.plan];
      const priceLine = price ? `${price.toLocaleString('fr-FR')} F CFA / mois` : '';
      const html = naatalEmailShell(
        `<p>Bonjour ${recipient.firstName || ''},</p>
         <p>L'abonnement <strong>${org.plan}</strong> de <strong>${org.name}</strong> expire dans
         <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.</p>
         <p>Pour continuer à utiliser Naatal sans interruption, renouvelez dès maintenant${priceLine ? ` (${priceLine})` : ''} :</p>
         <p style="text-align:center;margin:24px 0">
           <a href="${process.env.FRONTEND_URL || 'https://erp-saa-s.vercel.app'}/settings"
              style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">
             Renouveler mon abonnement
           </a>
         </p>
         <p style="color:#6b7280;font-size:13px">Vos données restent en sécurité — vous reprendrez exactement où vous en étiez.</p>`,
        'Naatal · Ndaw-Tech',
      );

      const ok = await sendEmail({
        to: recipient.email,
        subject: `⏰ Votre abonnement Naatal expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
        html,
      });
      if (ok) details.push({ org: org.name, to: recipient.email, daysLeft });
    }

    return { configured: true, sent: details.length, details };
  }

  // Crédite le parrain d'un mois offert lors de la 1re prolongation payante du filleul
  private async rewardReferrer(referredOrgId: string): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id: referredOrgId },
      select: { referredById: true, referralRewarded: true },
    });
    if (!org || !org.referredById || org.referralRewarded) return;

    const referrer = await prisma.organization.findUnique({
      where: { id: org.referredById },
      select: { id: true, planExpiresAt: true },
    });
    if (!referrer) return;

    // +1 mois, à partir de l'expiration en cours si encore active, sinon d'aujourd'hui
    const base = referrer.planExpiresAt && referrer.planExpiresAt.getTime() > Date.now()
      ? referrer.planExpiresAt
      : new Date();
    const extended = new Date(base.getTime());
    extended.setMonth(extended.getMonth() + REFERRAL_REWARD_MONTHS);

    await prisma.organization.update({ where: { id: referrer.id }, data: { planExpiresAt: extended } });
    await prisma.organization.update({ where: { id: referredOrgId }, data: { referralRewarded: true } });
    clearSubscriptionCache(referrer.id);
  }

  async updateOrganization(id: string, body: unknown) {
    const data = z.object({
      plan: z.enum(['CAISSE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
      months: z.number().int().min(1).max(36).optional(),
      unlimited: z.boolean().optional(),
      suspend: z.boolean().optional(),
    }).parse(body);

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { planExpiresAt: true },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);

    let planExpiresAt: Date | null | undefined;
    if (data.suspend) {
      // Suspend immediately: set expiry to yesterday
      planExpiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (data.unlimited) {
      planExpiresAt = null;
    } else if (data.months) {
      const base = org.planExpiresAt && org.planExpiresAt.getTime() > Date.now()
        ? org.planExpiresAt
        : new Date();
      planExpiresAt = new Date(base.getTime());
      planExpiresAt.setMonth(planExpiresAt.getMonth() + data.months);
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(data.plan ? { plan: data.plan } : {}),
        ...(planExpiresAt !== undefined ? { planExpiresAt } : {}),
      },
      select: { id: true, name: true, plan: true, planExpiresAt: true },
    });

    // Une prolongation payante déclenche la récompense du parrain (une seule fois)
    if (data.months || data.unlimited) {
      await this.rewardReferrer(id);
    }

    clearSubscriptionCache(id);
    clearPlanCache(id);
    return updated;
  }
}
