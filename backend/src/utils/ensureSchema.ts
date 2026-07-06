import { prisma } from './prisma';

/**
 * Migrations légères et idempotentes appliquées au démarrage.
 * Évite les problèmes d'ordre de déploiement quand une colonne ajoutée au
 * schéma Prisma n'existe pas encore dans la base de production.
 * Chaque instruction est un no-op si le changement est déjà en place.
 */
export async function ensureSchema(): Promise<void> {
  const statements = [
    // Multi-entreprises : rattachement d'une société à son groupe
    'ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "parentOrganizationId" TEXT',
    'CREATE INDEX IF NOT EXISTS "Organization_parentOrganizationId_idx" ON "Organization" ("parentOrganizationId")',
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.error('[ensureSchema] échec pour:', sql, e);
    }
  }
}
