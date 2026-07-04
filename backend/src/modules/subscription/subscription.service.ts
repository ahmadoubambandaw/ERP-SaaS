import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { clearSubscriptionCache } from '../../middleware/subscription.middleware';
import { clearPlanCache } from '../../middleware/plan.middleware';
import { PLAN_MODULES, planUserLimit } from '../../config/plans';
import { z } from 'zod';

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
        _count: { select: { users: true, invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
      plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
      months: z.number().int().min(1).max(36).optional(),
      unlimited: z.boolean().optional(),
    }).parse(body);

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { planExpiresAt: true },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);

    let planExpiresAt: Date | null | undefined;
    if (data.unlimited) {
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
