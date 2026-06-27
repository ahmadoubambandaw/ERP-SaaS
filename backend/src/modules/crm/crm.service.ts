import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'COLD_CALL', 'EMAIL', 'EVENT', 'OTHER']).optional(),
  estimatedValue: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const opportunitySchema = z.object({
  customerId: z.string(),
  name: z.string().min(1),
  stage: z.enum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).default('PROSPECTING'),
  probability: z.number().int().min(0).max(100).default(10),
  value: z.number().min(0).optional(),
  expectedCloseDate: z.string().transform((v) => new Date(v)).optional(),
  notes: z.string().optional(),
});

export class CrmService {
  async listLeads(orgId: string) {
    return prisma.lead.findMany({
      where: { organizationId: orgId },
      include: { activities: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLead(orgId: string, body: unknown) {
    const data = leadSchema.parse(body);
    return prisma.lead.create({ data: { ...data, organizationId: orgId } });
  }

  async getLead(orgId: string, id: string) {
    const l = await prisma.lead.findFirst({ where: { id, organizationId: orgId }, include: { activities: true } });
    if (!l) throw new AppError('Prospect introuvable', 404);
    return l;
  }

  async updateLead(orgId: string, id: string, body: unknown) {
    await this.getLead(orgId, id);
    const data = leadSchema.partial().merge(z.object({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']).optional() })).parse(body);
    return prisma.lead.update({ where: { id }, data });
  }

  async convertLead(orgId: string, id: string) {
    const lead = await this.getLead(orgId, id);
    const customer = await prisma.customer.create({
      data: {
        organizationId: orgId,
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        type: 'INDIVIDUAL',
      },
    });
    await prisma.lead.update({ where: { id }, data: { status: 'CONVERTED', customerId: customer.id } });
    return customer;
  }

  async listOpportunities(orgId: string) {
    return prisma.opportunity.findMany({
      where: { organizationId: orgId },
      include: { customer: { select: { id: true, name: true } }, activities: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOpportunity(orgId: string, body: unknown) {
    const data = opportunitySchema.parse(body);
    return prisma.opportunity.create({ data: { ...data, organizationId: orgId } });
  }

  async getOpportunity(orgId: string, id: string) {
    const o = await prisma.opportunity.findFirst({ where: { id, organizationId: orgId }, include: { customer: true, activities: true } });
    if (!o) throw new AppError('Opportunite introuvable', 404);
    return o;
  }

  async updateOpportunity(orgId: string, id: string, body: unknown) {
    await this.getOpportunity(orgId, id);
    const data = opportunitySchema.partial().parse(body);
    return prisma.opportunity.update({ where: { id }, data });
  }

  async createActivity(body: unknown) {
    const data = z.object({
      type: z.enum(['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE']),
      subject: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().transform((v) => new Date(v)).optional(),
      leadId: z.string().optional(),
      opportunityId: z.string().optional(),
    }).parse(body);
    return prisma.activity.create({ data });
  }
}
