import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from './error.middleware';
import { AuthRequest } from './auth.middleware';
import { PlanModule, planHasModule } from '../config/plans';

// Cache plan par organisation (évite une requête DB par appel)
const planCache = new Map<string, { plan: string; at: number }>();
const TTL_MS = 60_000;

export function clearPlanCache(orgId: string): void {
  planCache.delete(orgId);
}

async function getPlan(orgId: string): Promise<string> {
  const cached = planCache.get(orgId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.plan;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });
  const plan = org?.plan || 'STARTER';
  planCache.set(orgId, { plan, at: Date.now() });
  return plan;
}

const MODULE_LABELS: Record<PlanModule, string> = {
  dashboard: 'Tableau de bord',
  pos: 'Caisse (POS)',
  accounting: 'Comptabilité',
  invoicing: 'Facturation',
  inventory: 'Stocks',
  purchasing: 'Achats',
  hr: 'RH & Paie',
  crm: 'CRM',
  projects: 'Projets',
};

/**
 * Bloque l'accès à un module non inclus dans la formule de l'organisation.
 * SUPER_ADMIN passe toujours.
 */
export function requireModule(module: PlanModule) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Non authentifié', 401));
        return;
      }
      if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
      }
      const plan = await getPlan(req.user.organizationId);
      if (!planHasModule(plan, module)) {
        next(new AppError(
          `Le module « ${MODULE_LABELS[module]} » nécessite le plan Professional. Passez à un plan supérieur pour l'activer.`,
          403,
          'PLAN_UPGRADE_REQUIRED',
        ));
        return;
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}
