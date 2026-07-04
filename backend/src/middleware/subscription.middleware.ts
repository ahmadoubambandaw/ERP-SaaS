import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from './error.middleware';
import { AuthRequest } from './auth.middleware';

// Small in-memory cache to avoid one extra DB query per request
const cache = new Map<string, { expiresAt: Date | null; at: number }>();
const TTL_MS = 60_000;

export function clearSubscriptionCache(orgId: string): void {
  cache.delete(orgId);
}

/**
 * Blocks business routes when the organization's subscription has expired.
 * planExpiresAt = NULL means unlimited (platform owner). SUPER_ADMIN bypasses.
 */
export async function subscriptionGuard(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Non authentifié', 401));
      return;
    }
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const orgId = req.user.organizationId;
    let entry = cache.get(orgId);
    if (!entry || Date.now() - entry.at > TTL_MS) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { planExpiresAt: true },
      });
      entry = { expiresAt: org?.planExpiresAt ?? null, at: Date.now() };
      cache.set(orgId, entry);
    }

    if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) {
      next(new AppError(
        'Abonnement expiré. Renouvelez votre abonnement pour continuer à utiliser l\'application.',
        402,
        'SUBSCRIPTION_EXPIRED',
      ));
      return;
    }

    next();
  } catch (e) {
    next(e);
  }
}
