import crypto from 'crypto';

// Secrets connus publiquement (valeurs de dev / placeholders du .env.example) :
// jamais acceptés en production.
const KNOWN_WEAK_SECRETS = new Set([
  'dev-access-secret',
  'dev-refresh-secret',
  'change-me-access-secret-at-least-256-bits',
  'change-me-refresh-secret-at-least-256-bits',
]);

function jwtSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET', devFallback: string): string {
  const value = process.env[name];
  const isProd = (process.env.NODE_ENV || 'development') === 'production';

  if (value && !KNOWN_WEAK_SECRETS.has(value)) {
    if (isProd && value.length < 32) {
      console.warn(`[SÉCURITÉ] ${name} fait moins de 32 caractères — utilisez une valeur plus longue.`);
    }
    return value;
  }
  if (!isProd) return devFallback;

  // Production sans secret configuré : on refuse le secret par défaut (forgeable).
  // Un secret aléatoire éphémère est généré pour garder l'API en ligne, mais les
  // sessions sauteront à chaque redémarrage tant que la variable n'est pas posée.
  console.error(
    `[SÉCURITÉ CRITIQUE] ${name} manquant ou valeur par défaut en production. ` +
    'Secret temporaire généré — configurez cette variable dans Railway immédiatement.',
  );
  return crypto.randomBytes(48).toString('hex');
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  db: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: jwtSecret('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: jwtSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
  },
};
