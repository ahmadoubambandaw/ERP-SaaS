import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { clearSubscriptionCache } from '../../middleware/subscription.middleware';
import { clearPlanCache } from '../../middleware/plan.middleware';
import { PLAN_MODULES, planUserLimit } from '../../config/plans';
import { z } from 'zod';

export class SubscriptionService {
  async getMine(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, planExpiresAt: true, createdAt: true },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);

    const now = Date.now();
    const expiresAt = org.planExpiresAt;
    const daysLeft = expiresAt
      ? Math.ceil((expiresAt.getTime() - now) / (24 * 60 * 60 * 1000))
      : null;

    return {
      plan: org.plan,
      planExpiresAt: expiresAt,
      unlimited: expiresAt === null,
      active: expiresAt === null || expiresAt.getTime() >= now,
      daysLeft,
      modules: PLAN_MODULES[org.plan] || PLAN_MODULES.STARTER,
      userLimit: planUserLimit(org.plan),
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
        _count: { select: { users: true, invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
      // extend from current expiry if still active, otherwise from today
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

    clearSubscriptionCache(id);
    clearPlanCache(id);
    return updated;
  }
}
