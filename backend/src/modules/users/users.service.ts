import { prisma } from '../../utils/prisma';
import { hashPassword } from '../../utils/password';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'SALES', 'INVENTORY_MANAGER', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
});

export class UsersService {
  async list(organizationId: string) {
    return prisma.user.findMany({
      where: { organizationId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async create(organizationId: string, body: unknown) {
    const data = createSchema.parse(body);
    const existing = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email: data.email } },
    });
    if (existing) throw new AppError('Cet email est deja utilise dans cette organisation', 409);

    const hashed = await hashPassword(data.password);
    return prisma.user.create({
      data: { ...data, password: hashed, organizationId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, createdAt: true },
    });
  }

  async getOne(organizationId: string, id: string) {
    const user = await prisma.user.findFirst({
      where: { id, organizationId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new AppError('Utilisateur introuvable', 404);
    return user;
  }

  async update(organizationId: string, id: string, body: unknown) {
    await this.getOne(organizationId, id);
    const data = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      role: z.enum(['ADMIN', 'ACCOUNTANT', 'SALES', 'INVENTORY_MANAGER', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']).optional(),
      isActive: z.boolean().optional(),
    }).parse(body);

    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.getOne(organizationId, id);
    await prisma.user.delete({ where: { id } });
  }
}
