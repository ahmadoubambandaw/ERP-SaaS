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

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  startDate: z.string().transform((v) => new Date(v)).optional(),
  endDate: z.string().transform((v) => new Date(v)).optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().length(3).default('XOF'),
});

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().optional(),
  milestoneId: z.string().optional(),
  startDate: z.string().transform((v) => new Date(v)).optional(),
  dueDate: z.string().transform((v) => new Date(v)).optional(),
  estimatedHours: z.number().min(0).optional(),
});

export class ProjectsService {
  async listProjects(orgId: string) {
    return prisma.project.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { tasks: true, members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProject(orgId: string, body: unknown) {
    const data = projectSchema.parse(clean(body));
    return prisma.project.create({ data: { ...data, organizationId: orgId } });
  }

  async getProject(orgId: string, id: string) {
    const p = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      include: {
        tasks: { include: { assignee: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' } },
        milestones: { orderBy: { dueDate: 'asc' } },
        members: { include: { employee: { select: { id: true, firstName: true, lastName: true, position: true } } } },
      },
    });
    if (!p) throw new AppError('Projet introuvable', 404);
    return p;
  }

  async updateProject(orgId: string, id: string, body: unknown) {
    await this.getProject(orgId, id);
    const data = projectSchema.partial().merge(z.object({ progress: z.number().int().min(0).max(100).optional() })).parse(clean(body));
    return prisma.project.update({ where: { id }, data });
  }

  async listTasks(orgId: string, projectId: string) {
    await this.getProject(orgId, projectId);
    return prisma.task.findMany({
      where: { projectId },
      include: { assignee: { select: { id: true, firstName: true, lastName: true } }, milestone: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTask(orgId: string, projectId: string, body: unknown) {
    await this.getProject(orgId, projectId);
    const data = taskSchema.parse(clean(body));
    return prisma.task.create({ data: { ...data, projectId } });
  }

  async updateTask(orgId: string, projectId: string, id: string, body: unknown) {
    await this.getProject(orgId, projectId);
    const task = await prisma.task.findFirst({ where: { id, projectId } });
    if (!task) throw new AppError('Tache introuvable', 404);
    const data = taskSchema.partial().parse(clean(body));
    const updated = await prisma.task.update({ where: { id }, data: { ...data, ...(data.status === 'DONE' ? { completedAt: new Date() } : {}) } });

    const tasks = await prisma.task.findMany({ where: { projectId } });
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
    await prisma.project.update({ where: { id: projectId }, data: { progress } });

    return updated;
  }

  async listMilestones(orgId: string, projectId: string) {
    await this.getProject(orgId, projectId);
    return prisma.milestone.findMany({ where: { projectId }, include: { _count: { select: { tasks: true } } } });
  }

  async createMilestone(orgId: string, projectId: string, body: unknown) {
    await this.getProject(orgId, projectId);
    const data = z.object({
      name: z.string().min(1), description: z.string().optional(),
      dueDate: z.string().transform((v) => new Date(v)),
    }).parse(body);
    return prisma.milestone.create({ data: { ...data, projectId } });
  }
}
