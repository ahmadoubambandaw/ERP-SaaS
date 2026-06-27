import 'dotenv/config';
import { prisma } from './utils/prisma';
import { hashPassword } from './utils/password';

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await hashPassword('Admin123!');

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-pme' },
    update: {},
    create: {
      name: 'Demo PME Africaine',
      slug: 'demo-pme',
      country: 'SN',
      currency: 'XOF',
      language: 'fr',
      plan: 'PROFESSIONAL',
      email: 'contact@demo-pme.sn',
      phone: '+221 77 000 00 00',
      taxId: 'SN-NINEA-123456',
      address: 'Rue 10, Plateau, Dakar',
    },
  });

  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      organizationId: org.id,
      firstName: 'Admin',
      lastName: 'Demo',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const syscohadaAccounts = [
    { code: '101', name: 'Capital social', type: 'EQUITY' },
    { code: '111', name: 'Reserves legales', type: 'EQUITY' },
    { code: '120', name: 'Resultat de l\'exercice', type: 'EQUITY' },
    { code: '161', name: 'Emprunts aupres des etablissements de credit', type: 'LIABILITY' },
    { code: '401', name: 'Fournisseurs', type: 'LIABILITY' },
    { code: '408', name: 'Fournisseurs, factures non parvenues', type: 'LIABILITY' },
    { code: '421', name: 'Personnel, avances et acomptes', type: 'LIABILITY' },
    { code: '422', name: 'Personnel, remunerations dues', type: 'LIABILITY' },
    { code: '431', name: 'Securite sociale', type: 'LIABILITY' },
    { code: '441', name: 'Etat, impots et taxes', type: 'LIABILITY' },
    { code: '444', name: 'Etat, impots sur les benefices', type: 'LIABILITY' },
    { code: '471', name: 'Debiteurs divers', type: 'ASSET' },
    { code: '481', name: 'Crediteurs divers', type: 'LIABILITY' },
    { code: '411', name: 'Clients', type: 'ASSET' },
    { code: '412', name: 'Clients, effets a recevoir', type: 'ASSET' },
    { code: '418', name: 'Clients, produits non encore factures', type: 'ASSET' },
    { code: '211', name: 'Terrains', type: 'ASSET' },
    { code: '221', name: 'Batiments', type: 'ASSET' },
    { code: '231', name: 'Materiel de transport', type: 'ASSET' },
    { code: '241', name: 'Materiel et mobilier de bureau', type: 'ASSET' },
    { code: '244', name: 'Materiel informatique', type: 'ASSET' },
    { code: '281', name: 'Amort. des batiments', type: 'ASSET' },
    { code: '310', name: 'Marchandises', type: 'ASSET' },
    { code: '321', name: 'Matieres premieres', type: 'ASSET' },
    { code: '391', name: 'Depreciation des stocks de marchandises', type: 'ASSET' },
    { code: '521', name: 'Banques locales', type: 'ASSET' },
    { code: '522', name: 'Banques, credits de decaissement', type: 'ASSET' },
    { code: '571', name: 'Caisse siege social', type: 'ASSET' },
    { code: '572', name: 'Caisse agences', type: 'ASSET' },
    { code: '601', name: 'Achats de marchandises', type: 'EXPENSE' },
    { code: '602', name: 'Achats de matieres premieres', type: 'EXPENSE' },
    { code: '604', name: 'Achats de fournitures de bureau', type: 'EXPENSE' },
    { code: '606', name: 'Achats de combustibles et lubrifiants', type: 'EXPENSE' },
    { code: '611', name: 'Transport sur achats', type: 'EXPENSE' },
    { code: '621', name: 'Sous-traitance generale', type: 'EXPENSE' },
    { code: '622', name: 'Locations et charges locatives', type: 'EXPENSE' },
    { code: '625', name: 'Primes d\'assurance', type: 'EXPENSE' },
    { code: '631', name: 'Frais bancaires', type: 'EXPENSE' },
    { code: '641', name: 'Impots et taxes directs', type: 'EXPENSE' },
    { code: '661', name: 'Remunerations directes versees au personnel', type: 'EXPENSE' },
    { code: '664', name: 'Charges sociales', type: 'EXPENSE' },
    { code: '681', name: 'Dotations aux amortissements', type: 'EXPENSE' },
    { code: '691', name: 'Impots sur le benefice', type: 'EXPENSE' },
    { code: '701', name: 'Ventes de marchandises', type: 'REVENUE' },
    { code: '702', name: 'Ventes de produits finis', type: 'REVENUE' },
    { code: '706', name: 'Services vendus', type: 'REVENUE' },
    { code: '707', name: 'Produits accessoires', type: 'REVENUE' },
    { code: '751', name: 'Revenus des immeubles', type: 'REVENUE' },
    { code: '771', name: 'Gains de change', type: 'REVENUE' },
    { code: '781', name: 'Reprises d\'amortissements', type: 'REVENUE' },
  ];

  for (const acc of syscohadaAccounts) {
    await prisma.account.upsert({
      where: { organizationId_code: { organizationId: org.id, code: acc.code } },
      update: {},
      create: { organizationId: org.id, ...acc, type: acc.type as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' },
    });
  }

  const journals = [
    { code: 'VTE', name: 'Journal des Ventes', type: 'SALES' },
    { code: 'ACH', name: 'Journal des Achats', type: 'PURCHASES' },
    { code: 'BNQ', name: 'Journal de Banque', type: 'BANK' },
    { code: 'CAI', name: 'Journal de Caisse', type: 'CASH' },
    { code: 'OD', name: 'Operations Diverses', type: 'GENERAL' },
    { code: 'PAI', name: 'Journal de Paie', type: 'PAYROLL' },
  ];

  for (const j of journals) {
    await prisma.journal.upsert({
      where: { organizationId_code: { organizationId: org.id, code: j.code } },
      update: {},
      create: { organizationId: org.id, ...j, type: j.type as 'SALES' | 'PURCHASES' | 'BANK' | 'CASH' | 'GENERAL' | 'PAYROLL' },
    });
  }

  const warehouse = await prisma.warehouse.upsert({
    where: { id: 'warehouse-main' },
    update: {},
    create: { id: 'warehouse-main', organizationId: org.id, name: 'Entrepôt Principal', address: 'Dakar' },
  });

  console.log('Seed termine!');
  console.log('Organisation:', org.name, '| Slug:', org.slug);
  console.log('Admin:', 'admin@demo.com', '| Password: Admin123!');
  console.log('Entrepot:', warehouse.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
