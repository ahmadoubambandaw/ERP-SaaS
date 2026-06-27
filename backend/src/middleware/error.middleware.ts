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

export function errorMiddleware(
  err: Error,
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

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Token invalide',
    });
    return;
  }

  console.error('Internal error:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
  });
}
