import { prisma } from '../../utils/prisma';

export class DashboardService {
  async kpis(orgId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [invoiceStats, customerCount, employeeCount, productCount, leadCount, projectCount, lowStockCount, pendingLeaves] = await Promise.all([
      prisma.invoice.aggregate({
        where: { organizationId: orgId, type: 'INVOICE' },
        _sum: { total: true, paidAmount: true },
        _count: { id: true },
      }),
      prisma.customer.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.employee.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.product.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.lead.count({ where: { organizationId: orgId } }),
      prisma.project.count({ where: { organizationId: orgId } }),
      prisma.product.count({
        where: {
          organizationId: orgId,
          isActive: true,
          reorderLevel: { not: null },
          stockLevels: { some: { quantity: { lte: 0 } } },
        },
      }).catch(() => 0),
      prisma.leaveRequest.count({ where: { employee: { organizationId: orgId }, status: 'PENDING' } }),
    ]);

    const monthRevenue = await prisma.invoice.aggregate({
      where: { organizationId: orgId, type: 'INVOICE', issueDate: { gte: startOfMonth }, status: { in: ['PAID', 'PARTIAL', 'SENT'] } },
      _sum: { total: true },
    });

    const overdueInvoices = await prisma.invoice.count({
      where: { organizationId: orgId, type: 'INVOICE', dueDate: { lt: now }, status: { in: ['SENT', 'PARTIAL'] } },
    });

    return {
      invoices: {
        total: invoiceStats._count.id,
        totalAmount: Number(invoiceStats._sum.total || 0),
        paidAmount: Number(invoiceStats._sum.paidAmount || 0),
        unpaidAmount: Number(invoiceStats._sum.total || 0) - Number(invoiceStats._sum.paidAmount || 0),
        overdue: overdueInvoices,
        monthRevenue: Number(monthRevenue._sum.total || 0),
      },
      customers: customerCount,
      employees: employeeCount,
      products: productCount,
      leads: leadCount,
      projects: projectCount,
      alerts: {
        lowStock: lowStockCount,
        pendingLeaves,
        overdueInvoices,
      },
    };
  }

  async revenueChart(orgId: string) {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const result = await prisma.invoice.aggregate({
        where: { organizationId: orgId, type: 'INVOICE', issueDate: { gte: start, lte: end } },
        _sum: { total: true, paidAmount: true },
      });
      months.push({
        month: d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue: Number(result._sum.total || 0),
        collected: Number(result._sum.paidAmount || 0),
      });
    }
    return months;
  }

  async recentInvoices(orgId: string) {
    return prisma.invoice.findMany({
      where: { organizationId: orgId, type: 'INVOICE' },
      include: { customer: { select: { name: true } } },
      orderBy: { issueDate: 'desc' },
      take: 5,
    });
  }

  async recentActivities(orgId: string) {
    const [invoices, leads, projects] = await Promise.all([
      prisma.invoice.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 3, include: { customer: { select: { name: true } } } }),
      prisma.lead.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 3 }),
      prisma.project.findMany({ where: { organizationId: orgId }, orderBy: { updatedAt: 'desc' }, take: 3 }),
    ]);
    return { invoices, leads, projects };
  }

  async search(orgId: string, q: string) {
    if (!q || q.trim().length < 2) return { customers: [], invoices: [], products: [], employees: [], suppliers: [] };
    const query = q.trim();
    const contains = { contains: query, mode: 'insensitive' as const };

    const [customers, invoices, products, employees, suppliers] = await Promise.all([
      prisma.customer.findMany({
        where: { organizationId: orgId, name: contains },
        select: { id: true, name: true, email: true },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: { organizationId: orgId, OR: [{ number: contains }, { customer: { name: contains } }] },
        select: { id: true, number: true, total: true, status: true, customer: { select: { name: true } } },
        take: 5,
      }),
      prisma.product.findMany({
        where: { organizationId: orgId, OR: [{ name: contains }, { code: contains }] },
        select: { id: true, name: true, code: true },
        take: 5,
      }),
      prisma.employee.findMany({
        where: { organizationId: orgId, isActive: true, OR: [{ firstName: contains }, { lastName: contains }] },
        select: { id: true, firstName: true, lastName: true, position: true },
        take: 5,
      }),
      prisma.supplier.findMany({
        where: { organizationId: orgId, name: contains },
        select: { id: true, name: true },
        take: 5,
      }),
    ]);

    return { customers, invoices, products, employees, suppliers };
  }

  async alerts(orgId: string) {
    const now = new Date();

    const [overdueInvoices, pendingLeaves, lowStockProducts, draftPOs] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId: orgId, type: 'INVOICE', dueDate: { lt: now }, status: { in: ['SENT', 'PARTIAL'] } },
        select: { id: true, number: true, total: true, paidAmount: true, dueDate: true, customer: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.leaveRequest.findMany({
        where: { employee: { organizationId: orgId }, status: 'PENDING' },
        select: { id: true, type: true, startDate: true, employee: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.product.findMany({
        where: { organizationId: orgId, isActive: true, reorderLevel: { not: null } },
        include: { stockLevels: { select: { quantity: true } } },
      }),
      prisma.purchaseOrder.count({ where: { organizationId: orgId, status: 'DRAFT' } }),
    ]);

    const lowStock = lowStockProducts
      .filter((p) => {
        const total = p.stockLevels.reduce((sum, l) => sum + Number(l.quantity), 0);
        return total <= Number(p.reorderLevel);
      })
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        stock: p.stockLevels.reduce((sum, l) => sum + Number(l.quantity), 0),
        reorderLevel: Number(p.reorderLevel),
      }));

    return { overdueInvoices, pendingLeaves, lowStock, draftPOs };
  }
}
