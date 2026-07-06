-- Multi-entreprises : rattache une société à son groupe (société mère).
-- Appliqué automatiquement au démarrage du backend (utils/ensureSchema.ts),
-- ce fichier sert de trace / d'exécution manuelle dans Supabase si besoin.

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "parentOrganizationId" TEXT;

CREATE INDEX IF NOT EXISTS "Organization_parentOrganizationId_idx"
  ON "Organization" ("parentOrganizationId");
