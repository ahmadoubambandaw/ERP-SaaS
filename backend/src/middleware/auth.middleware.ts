import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './error.middleware';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Token d\'authentification manquant', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, organizationId: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Utilisateur introuvable ou inactif', 401, 'UNAUTHORIZED');
    }

    req.user = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Non authentifié', 401));
      return;
    }
    if (roles.length && !roles.includes(req.user.role)) {
      next(new AppError('Accès non autorisé', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
