import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2002: 'Cette valeur existe déjà (contrainte unique)',
  P2003: 'Référence invalide (contrainte de clé étrangère)',
  P2025: 'Enregistrement introuvable',
  P2000: 'Valeur trop longue pour ce champ',
  P2011: 'Champ obligatoire manquant',
  P2012: 'Champ obligatoire manquant',
};

export function errorMiddleware(
  err: Error & { code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Données invalides',
      details: err.message,
    });
    return;
  }

  // TokenExpiredError/NotBeforeError are JWT errors with their own names;
  // they MUST return 401 so the frontend interceptor refreshes the session
  if (
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError' ||
    err.name === 'NotBeforeError'
  ) {
    res.status(401).json({
      success: false,
      error: 'Session expirée, reconnexion en cours...',
    });
    return;
  }

  if (
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    err.name === 'PrismaClientValidationError' ||
    err.name === 'PrismaClientInitializationError'
  ) {
    const errorCode = err.code || '';
    const detail = (err.message || '').replace(/\n+/g, ' ').trim().slice(-400);
    const message = PRISMA_ERROR_MESSAGES[errorCode]
      ? `${PRISMA_ERROR_MESSAGES[errorCode]} — ${detail}`
      : `Erreur de base de données : ${detail}`;
    console.error('Prisma error:', err);
    res.status(400).json({
      success: false,
      error: message,
      code: errorCode,
    });
    return;
  }

  console.error('Internal error:', err);
  const detail = (err.message || '').replace(/\n+/g, ' ').trim().slice(-400);
  res.status(500).json({
    success: false,
    error: detail ? `Erreur serveur : ${detail}` : 'Erreur interne du serveur',
  });
}
