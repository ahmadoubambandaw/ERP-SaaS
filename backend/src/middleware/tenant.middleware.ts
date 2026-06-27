import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from './error.middleware';
import { prisma } from '../utils/prisma';

export async function tenantMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.organizationId) {
      throw new AppError('Organisation non identifiée', 400);
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { id: true, isActive: true, plan: true },
    });

    if (!org || !org.isActive) {
      throw new AppError('Organisation inactive ou introuvable', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
}
