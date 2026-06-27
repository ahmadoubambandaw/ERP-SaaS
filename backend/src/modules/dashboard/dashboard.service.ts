import { prisma } from '../../utils/prisma';

export class DashboardService {
  async kpis(orgId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [invoiceStats, customerCount, employeeCount, productCount, leadCount, projectCount, lowStock, pendingLeaves] = await Promise.all([
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
          reorderLevel: { not: null },
          stockLevels: { some: { quantity: { lte: prisma.product.fields.reorderLevel } } },
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
        lowStock: 0,
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
}
