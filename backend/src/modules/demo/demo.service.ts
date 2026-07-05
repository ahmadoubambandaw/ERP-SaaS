import { prisma } from '../../utils/prisma';

// Marqueur écrit sur chaque enregistrement de démonstration pour pouvoir tout retrouver/supprimer.
const MARK = 'DÉMO-NAATAL';

const CUSTOMERS = [
  { name: 'Boutique Awa Cosmétiques', city: 'Dakar', type: 'COMPANY' },
  { name: 'Serigne Fall Distribution', city: 'Pikine', type: 'COMPANY' },
  { name: 'Mame Diarra Tissus', city: 'Touba', type: 'COMPANY' },
  { name: 'Pape & Frères Électronique', city: 'Dakar', type: 'COMPANY' },
  { name: 'Kine Beauté Dakar', city: 'Guédiawaye', type: 'COMPANY' },
  { name: 'Ndeye Couture', city: 'Rufisque', type: 'INDIVIDUAL' },
  { name: 'Alassane Diallo', city: 'Thiès', type: 'INDIVIDUAL' },
  { name: 'Supérette Teranga', city: 'Dakar', type: 'COMPANY' },
  { name: 'Fatou Sow', city: 'Mbour', type: 'INDIVIDUAL' },
  { name: 'Ets Cheikh Ndiaye', city: 'Kaolack', type: 'COMPANY' },
  { name: 'Ousmane Ba', city: 'Saint-Louis', type: 'INDIVIDUAL' },
  { name: 'Aïssatou Barry', city: 'Ziguinchor', type: 'INDIVIDUAL' },
];

const PRODUCTS = [
  { code: 'RIZ-25', name: 'Riz parfumé 25 kg', category: 'Alimentation', cost: 12500, sale: 14500, unit: 'sac', stock: 86, reorder: 20 },
  { code: 'HUI-05', name: 'Huile végétale 5 L', category: 'Alimentation', cost: 4800, sale: 5900, unit: 'bidon', stock: 142, reorder: 30 },
  { code: 'SUC-01', name: 'Sucre en poudre 1 kg', category: 'Alimentation', cost: 650, sale: 800, unit: 'kg', stock: 540, reorder: 100 },
  { code: 'LAI-400', name: 'Lait en poudre 400 g', category: 'Alimentation', cost: 1500, sale: 2000, unit: 'boîte', stock: 12, reorder: 40 },
  { code: 'MECHE-X', name: 'Mèches brésiliennes Grade A', category: 'Cosmétiques', cost: 8500, sale: 15000, unit: 'paquet', stock: 9, reorder: 15 },
  { code: 'SAV-KAR', name: 'Savon karité artisanal', category: 'Cosmétiques', cost: 600, sale: 1200, unit: 'pcs', stock: 320, reorder: 50 },
  { code: 'PAR-OUD', name: 'Parfum oud de luxe', category: 'Cosmétiques', cost: 3500, sale: 7500, unit: 'pcs', stock: 45, reorder: 10 },
  { code: 'CREME-EC', name: 'Crème éclaircissante', category: 'Cosmétiques', cost: 2200, sale: 4000, unit: 'pcs', stock: 60, reorder: 20 },
  { code: 'TIS-WAX', name: 'Tissu wax 6 yards', category: 'Textile', cost: 6500, sale: 9500, unit: 'coupon', stock: 64, reorder: 25 },
  { code: 'TIS-BAZ', name: 'Bazin riche brodé', category: 'Textile', cost: 18000, sale: 27000, unit: 'coupon', stock: 22, reorder: 10 },
  { code: 'VOILE-01', name: 'Voile de soie', category: 'Textile', cost: 3000, sale: 5000, unit: 'mètre', stock: 130, reorder: 30 },
  { code: 'TEL-A15', name: 'Smartphone A15 128 Go', category: 'Électronique', cost: 78000, sale: 95000, unit: 'pcs', stock: 3, reorder: 5 },
  { code: 'ECOUT-BT', name: 'Écouteurs Bluetooth', category: 'Électronique', cost: 4500, sale: 8000, unit: 'pcs', stock: 55, reorder: 15 },
  { code: 'CHARG-FR', name: 'Chargeur rapide USB-C', category: 'Électronique', cost: 2500, sale: 5000, unit: 'pcs', stock: 78, reorder: 20 },
];

const EMPLOYEES = [
  { firstName: 'Moussa', lastName: 'Sarr', position: 'Vendeur', department: 'Ventes', salary: 150000, gender: 'MALE' },
  { firstName: 'Fatou', lastName: 'Sow', position: 'Caissière', department: 'Caisse', salary: 130000, gender: 'FEMALE' },
  { firstName: 'Ibrahima', lastName: 'Gueye', position: 'Magasinier', department: 'Stock', salary: 140000, gender: 'MALE' },
  { firstName: 'Awa', lastName: 'Ndiaye', position: 'Responsable boutique', department: 'Direction', salary: 250000, gender: 'FEMALE' },
  { firstName: 'Cheikh', lastName: 'Diop', position: 'Livreur', department: 'Logistique', salary: 120000, gender: 'MALE' },
];

const LEADS = [
  { firstName: 'Modou', lastName: 'Faye', company: 'Alimentation Bou Bess', status: 'NEW', value: 300000 },
  { firstName: 'Rama', lastName: 'Kane', company: 'Cosmétiques HLM', status: 'CONTACTED', value: 250000 },
  { firstName: 'Babacar', lastName: 'Sy', company: 'Pièces Auto Pikine', status: 'QUALIFIED', value: 500000 },
  { firstName: 'Sokhna', lastName: 'Mbaye', company: 'Boutique en ligne IG', status: 'NEW', value: 180000 },
  { firstName: 'Lamine', lastName: 'Cissé', company: 'Quincaillerie Rufisque', status: 'CONTACTED', value: 420000 },
  { firstName: 'Adama', lastName: 'Thiam', company: 'Supérette Keur Massar', status: 'QUALIFIED', value: 350000 },
  { firstName: 'Bineta', lastName: 'Diouf', company: 'Salon de coiffure Aïda', status: 'NEW', value: 150000 },
  { firstName: 'Malick', lastName: 'Seck', company: 'Grossiste Castors', status: 'CONTACTED', value: 800000 },
  { firstName: 'Coumba', lastName: 'Fall', company: 'Prêt-à-porter Sandaga', status: 'NEW', value: 220000 },
  { firstName: ' Smael', lastName: 'Wade', company: 'Électronique Petersen', status: 'QUALIFIED', value: 600000 },
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const PAY_METHODS = ['CASH', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY'];

export class DemoService {
  async status(orgId: string) {
    const count = await prisma.invoice.count({ where: { organizationId: orgId, notes: MARK } });
    return { loaded: count > 0, invoices: count };
  }

  /** Crée un jeu de données réaliste (clients, produits, factures, employés, prospects). */
  async seed(orgId: string, userId: string) {
    // Entrepôt : réutilise l'existant sinon en crée un
    let warehouse = await prisma.warehouse.findFirst({ where: { organizationId: orgId } });
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: { organizationId: orgId, name: 'Boutique principale', address: 'Dakar' },
      });
    }

    // Clients
    const customers = [];
    for (const c of CUSTOMERS) {
      customers.push(await prisma.customer.create({
        data: {
          organizationId: orgId, name: c.name, type: c.type as 'COMPANY' | 'INDIVIDUAL',
          city: c.city, country: 'Sénégal', phone: `7${rand(0, 8)} ${rand(100, 999)} ${rand(10, 99)} ${rand(10, 99)}`,
          notes: MARK,
        },
      }));
    }

    // Produits + stock
    for (const p of PRODUCTS) {
      const product = await prisma.product.create({
        data: {
          organizationId: orgId, code: p.code, name: p.name, category: p.category,
          unitOfMeasure: p.unit, costPrice: p.cost, salePrice: p.sale, taxRate: 18,
          reorderLevel: p.reorder, description: MARK,
        },
      });
      await prisma.stockLevel.create({
        data: { productId: product.id, warehouseId: warehouse.id, quantity: p.stock },
      });
    }

    // Factures réparties sur 8 mois avec statuts variés
    const now = new Date();
    let seq = await prisma.invoice.count({ where: { organizationId: orgId } });
    const statuses: Array<'PAID' | 'PARTIAL' | 'SENT' | 'OVERDUE' | 'DRAFT'> =
      ['PAID', 'PAID', 'PAID', 'SENT', 'PARTIAL', 'OVERDUE', 'PAID', 'SENT'];

    for (let m = 7; m >= 0; m--) {
      const invoicesThisMonth = rand(2, 4);
      for (let k = 0; k < invoicesThisMonth; k++) {
        seq++;
        const issueDate = new Date(now.getFullYear(), now.getMonth() - m, rand(1, 27));
        const dueDate = new Date(issueDate); dueDate.setDate(dueDate.getDate() + 30);
        const customer = pick(customers);
        const lineCount = rand(1, 3);
        const lines = [];
        let subtotal = 0, taxAmount = 0;
        for (let l = 0; l < lineCount; l++) {
          const p = pick(PRODUCTS);
          const qty = rand(1, 12);
          const lineTotal = qty * p.sale;
          const tax = lineTotal * 0.18;
          subtotal += lineTotal; taxAmount += tax;
          lines.push({ description: p.name, quantity: qty, unitPrice: p.sale, taxRate: 18, total: lineTotal, sortOrder: l });
        }
        const total = subtotal + taxAmount;
        // Le mois en cours reste "récent" (pas en retard)
        let status = m === 0 ? pick(['PAID', 'SENT', 'PAID'] as const) : pick(statuses);
        let paidAmount = 0;
        if (status === 'PAID') paidAmount = total;
        else if (status === 'PARTIAL') paidAmount = Math.round(total * 0.5);

        const invoice = await prisma.invoice.create({
          data: {
            organizationId: orgId, customerId: customer.id, createdById: userId,
            number: `FAC-D${String(seq).padStart(4, '0')}`, type: 'INVOICE', status,
            issueDate, dueDate, currency: 'XOF',
            subtotal, taxAmount, total, paidAmount, notes: MARK,
            lines: { create: lines },
          },
        });
        if (paidAmount > 0) {
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id, amount: paidAmount,
              date: new Date(issueDate.getTime() + rand(1, 10) * 86400000),
              method: pick(PAY_METHODS) as 'CASH' | 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY', notes: MARK,
            },
          });
        }
      }
    }

    // Employés
    let empSeq = await prisma.employee.count({ where: { organizationId: orgId } });
    for (const e of EMPLOYEES) {
      empSeq++;
      await prisma.employee.create({
        data: {
          organizationId: orgId, employeeNumber: `EMP-D${String(empSeq).padStart(4, '0')}`,
          firstName: e.firstName, lastName: e.lastName, position: e.position, department: e.department,
          baseSalary: e.salary, gender: e.gender as 'MALE' | 'FEMALE', employmentType: 'FULL_TIME',
          startDate: new Date(now.getFullYear() - 1, rand(0, 11), rand(1, 27)),
          phone: `7${rand(0, 8)} ${rand(100, 999)} ${rand(10, 99)} ${rand(10, 99)}`,
          bankAccount: MARK,
        },
      });
    }

    // Prospects CRM
    for (const l of LEADS) {
      await prisma.lead.create({
        data: {
          organizationId: orgId, firstName: l.firstName.trim(), lastName: l.lastName,
          company: l.company, status: l.status as 'NEW' | 'CONTACTED' | 'QUALIFIED',
          source: 'COLD_CALL', estimatedValue: l.value,
          phone: `7${rand(0, 8)} ${rand(100, 999)} ${rand(10, 99)} ${rand(10, 99)}`, notes: MARK,
        },
      });
    }

    return this.status(orgId);
  }

  /** Supprime tout ce qui a été créé par la démo (dans l'ordre des dépendances). */
  async clear(orgId: string) {
    await prisma.payment.deleteMany({ where: { invoice: { organizationId: orgId, notes: MARK } } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { organizationId: orgId, notes: MARK } } });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId, notes: MARK } });
    await prisma.stockLevel.deleteMany({ where: { product: { organizationId: orgId, description: MARK } } });
    await prisma.stockMovement.deleteMany({ where: { product: { organizationId: orgId, description: MARK } } });
    await prisma.product.deleteMany({ where: { organizationId: orgId, description: MARK } });
    await prisma.lead.deleteMany({ where: { organizationId: orgId, notes: MARK } });
    await prisma.employee.deleteMany({ where: { organizationId: orgId, bankAccount: MARK } });
    await prisma.customer.deleteMany({ where: { organizationId: orgId, notes: MARK } });
    return { loaded: false, invoices: 0 };
  }
}
