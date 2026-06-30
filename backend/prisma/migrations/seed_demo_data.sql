-- ============================================================
-- Données de seed — Demo PME Africaine
-- Coller dans Supabase SQL Editor APRÈS la migration initiale
-- ============================================================

-- 1. Organisation
INSERT INTO "Organization" ("id", "name", "slug", "plan", "country", "currency", "email")
VALUES (
  'org-demo-001',
  'Demo PME Africaine',
  'demo-pme',
  'PROFESSIONAL',
  'SN',
  'XOF',
  'contact@demo-pme.sn'
);

-- 2. Admin user (password: Admin123!  — bcrypt hash)
INSERT INTO "User" ("id", "organizationId", "email", "passwordHash", "firstName", "lastName", "role")
VALUES (
  'user-admin-001',
  'org-demo-001',
  'admin@demo.com',
  '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0/NA2CYMXLK',
  'Admin',
  'Demo',
  'ADMIN'
);

-- 3. Entrepôt principal
INSERT INTO "Warehouse" ("id", "organizationId", "name", "isDefault")
VALUES ('warehouse-main', 'org-demo-001', 'Entrepôt Principal', TRUE);

-- 4. Journaux comptables
INSERT INTO "Journal" ("id", "organizationId", "code", "name", "type") VALUES
  ('journal-vte', 'org-demo-001', 'VTE', 'Journal des Ventes', 'SALES'),
  ('journal-ach', 'org-demo-001', 'ACH', 'Journal des Achats', 'PURCHASES'),
  ('journal-bnq', 'org-demo-001', 'BNQ', 'Journal de Banque', 'BANK'),
  ('journal-cai', 'org-demo-001', 'CAI', 'Journal de Caisse', 'CASH'),
  ('journal-od',  'org-demo-001', 'OD',  'Operations Diverses', 'GENERAL'),
  ('journal-pai', 'org-demo-001', 'PAI', 'Journal de Paie', 'PAYROLL');

-- 5. Plan comptable SYSCOHADA (51 comptes)
INSERT INTO "Account" ("id", "organizationId", "code", "name", "type") VALUES
  -- Classe 1 : Comptes de ressources durables
  (gen_random_uuid()::TEXT, 'org-demo-001', '101', 'Capital social', 'EQUITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '111', 'Réserve légale', 'EQUITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '118', 'Autres réserves', 'EQUITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '129', 'Résultat net de l''exercice', 'EQUITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '161', 'Emprunts auprès des établissements de crédit', 'LIABILITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '181', 'Dettes de location-acquisition', 'LIABILITY'),
  -- Classe 2 : Comptes d''actif immobilisé
  (gen_random_uuid()::TEXT, 'org-demo-001', '211', 'Terrains', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '221', 'Bâtiments', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '231', 'Matériel et outillage', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '241', 'Matériel de transport', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '244', 'Matériel informatique', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '281', 'Amort. Bâtiments', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '284', 'Amort. Matériel informatique', 'ASSET'),
  -- Classe 3 : Comptes de stocks
  (gen_random_uuid()::TEXT, 'org-demo-001', '31', 'Marchandises', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '32', 'Matières premières', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '35', 'Produits finis', 'ASSET'),
  -- Classe 4 : Comptes de tiers
  (gen_random_uuid()::TEXT, 'org-demo-001', '401', 'Fournisseurs', 'LIABILITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '408', 'Fournisseurs — Factures non parvenues', 'LIABILITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '411', 'Clients', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '416', 'Clients douteux', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '421', 'Personnel — Rémunérations dues', 'LIABILITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '431', 'Sécurité sociale', 'LIABILITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '441', 'État — Impôts et taxes', 'LIABILITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '443', 'État — TVA facturée', 'LIABILITY'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '445', 'État — TVA récupérable', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '471', 'Débiteurs divers', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '481', 'Créditeurs divers', 'LIABILITY'),
  -- Classe 5 : Comptes de trésorerie
  (gen_random_uuid()::TEXT, 'org-demo-001', '521', 'Banque locale', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '522', 'Banque étrangère', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '531', 'Mobile Money — Orange Money', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '532', 'Mobile Money — Wave', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '571', 'Caisse principale', 'ASSET'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '572', 'Caisse secondaire', 'ASSET'),
  -- Classe 6 : Comptes de charges
  (gen_random_uuid()::TEXT, 'org-demo-001', '601', 'Achats de marchandises', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '602', 'Achats de matières premières', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '604', 'Achats stockés — Autres', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '611', 'Transports sur achats', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '621', 'Personnel extérieur', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '622', 'Rémunérations du personnel', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '631', 'Charges sociales patronales', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '641', 'Impôts et taxes', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '651', 'Pertes sur créances clients', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '661', 'Charges d''intérêts', 'EXPENSE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '681', 'Dotations aux amortissements', 'EXPENSE'),
  -- Classe 7 : Comptes de produits
  (gen_random_uuid()::TEXT, 'org-demo-001', '701', 'Ventes de marchandises', 'REVENUE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '702', 'Ventes de produits finis', 'REVENUE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '706', 'Prestations de services', 'REVENUE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '707', 'Produits des activités annexes', 'REVENUE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '741', 'Subventions d''exploitation', 'REVENUE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '771', 'Gains de change', 'REVENUE'),
  (gen_random_uuid()::TEXT, 'org-demo-001', '781', 'Reprises d''amortissements', 'REVENUE');
