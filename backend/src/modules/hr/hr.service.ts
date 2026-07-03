import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

function clean(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) return {};
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(
      ([, v]) => v !== '' && v !== null && !(typeof v === 'number' && Number.isNaN(v)),
    ),
  );
}

const employeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  nationalId: z.string().optional(),
  dateOfBirth: z.string().transform((v) => new Date(v)).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  department: z.string().optional(),
  position: z.string().min(1),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT']).default('FULL_TIME'),
  startDate: z.string().transform((v) => new Date(v)),
  baseSalary: z.number().min(0),
  currency: z.string().default('XOF'),
  bankAccount: z.string().optional(),
  mobileMoneyNumber: z.string().optional(),
});

export class HrService {
  async listEmployees(orgId: string) {
    return prisma.employee.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async createEmployee(orgId: string, body: unknown) {
    const data = employeeSchema.parse(clean(body));
    const count = await prisma.employee.count({ where: { organizationId: orgId } });
    let attempt = 0;
    while (attempt < 5) {
      const employeeNumber = `EMP-${String(count + 1 + attempt).padStart(4, '0')}`;
      try {
        return await prisma.employee.create({ data: { ...data, employeeNumber, organizationId: orgId } });
      } catch (e: unknown) {
        if ((e as { code?: string })?.code === 'P2002') { attempt++; continue; }
        throw e;
      }
    }
    throw new AppError('Impossible de générer un numéro d\'employé unique', 500);
  }

  async getEmployee(orgId: string, id: string) {
    const e = await prisma.employee.findFirst({ where: { id, organizationId: orgId } });
    if (!e) throw new AppError('Employe introuvable', 404);
    return e;
  }

  async updateEmployee(orgId: string, id: string, body: unknown) {
    await this.getEmployee(orgId, id);
    const data = employeeSchema.partial().parse(clean(body));
    return prisma.employee.update({ where: { id }, data });
  }

  async listPayslips(orgId: string, period?: string) {
    return prisma.payslip.findMany({
      where: { employee: { organizationId: orgId }, ...(period ? { period } : {}) },
      include: { employee: { select: { firstName: true, lastName: true, position: true, department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generatePayslips(orgId: string, period: string) {
    const employees = await prisma.employee.findMany({ where: { organizationId: orgId, isActive: true } });
    const existing = await prisma.payslip.findMany({ where: { employee: { organizationId: orgId }, period } });
    const existingIds = new Set(existing.map((p) => p.employeeId));

    const payslips = [];
    for (const emp of employees) {
      if (existingIds.has(emp.id)) continue;
      const base = Number(emp.baseSalary);
      const socialSecurity = base * 0.07;
      const taxableBase = base - socialSecurity;
      const incomeTax = taxableBase > 0 ? taxableBase * 0.15 : 0;
      const netSalary = base - socialSecurity - incomeTax;

      const p = await prisma.payslip.create({
        data: { employeeId: emp.id, period, baseSalary: base, socialSecurity, incomeTax, netSalary },
      });
      payslips.push(p);
    }
    return payslips;
  }

  async approvePayslip(orgId: string, id: string) {
    const payslip = await prisma.payslip.findFirst({
      where: { id, employee: { organizationId: orgId } },
    });
    if (!payslip) throw new AppError('Bulletin introuvable', 404);
    return prisma.payslip.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async listLeaves(orgId: string) {
    return prisma.leaveRequest.findMany({
      where: { employee: { organizationId: orgId } },
      include: { employee: { select: { firstName: true, lastName: true, department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLeave(orgId: string, body: unknown) {
    const data = z.object({
      employeeId: z.string(),
      type: z.enum(['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER']),
      startDate: z.string().transform((v) => new Date(v)),
      endDate: z.string().transform((v) => new Date(v)),
      reason: z.string().optional(),
    }).parse(clean(body));

    await this.getEmployee(orgId, data.employeeId);
    const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return prisma.leaveRequest.create({ data: { ...data, days } });
  }

  async approveLeave(orgId: string, id: string) {
    const leave = await prisma.leaveRequest.findFirst({ where: { id, employee: { organizationId: orgId } } });
    if (!leave) throw new AppError('Conge introuvable', 404);
    return prisma.leaveRequest.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async rejectLeave(orgId: string, id: string) {
    const leave = await prisma.leaveRequest.findFirst({ where: { id, employee: { organizationId: orgId } } });
    if (!leave) throw new AppError('Conge introuvable', 404);
    return prisma.leaveRequest.update({ where: { id }, data: { status: 'REJECTED' } });
  }
}
