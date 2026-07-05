import { prisma } from '../../utils/prisma';
import { hashPassword } from '../../utils/password';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';
import { planUserLimit } from '../../config/plans';

const ROLES = ['ADMIN', 'DIRECTOR', 'ACCOUNTANT', 'SALES', 'CASHIER', 'INVENTORY_MANAGER', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'] as const;

// Profils métiers (au-delà d'Admin/Employé) : réservés à la formule Enterprise
const ADVANCED_ROLES = ['DIRECTOR', 'ACCOUNTANT', 'SALES', 'CASHIER', 'INVENTORY_MANAGER', 'HR_MANAGER', 'PROJECT_MANAGER'];

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES).default('EMPLOYEE'),
});

async function assertRoleAllowed(organizationId: string, role: string | undefined, requesterRole?: string) {
  if (!role || !ADVANCED_ROLES.includes(role) || requesterRole === 'SUPER_ADMIN') return;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
  if (org?.plan !== 'ENTERPRISE') {
    throw new AppError(
      'La gestion des rôles avancée (profils Directeur, Comptable, Commercial, Caissier, Magasinier, RH, Chef de projet) est réservée à la formule Enterprise.',
      403,
      'PLAN_UPGRADE_REQUIRED',
    );
  }
}

export class UsersService {
  async list(organizationId: string) {
    return prisma.user.findMany({
      where: { organizationId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async create(organizationId: string, body: unknown, requesterRole?: string) {
    const data = createSchema.parse(body);
    await assertRoleAllowed(organizationId, data.role, requesterRole);
    const existing = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email: data.email } },
    });
    if (existing) throw new AppError('Cet email est deja utilise dans cette organisation', 409);

    // Limite d'utilisateurs selon la formule d'abonnement
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });
    const limit = planUserLimit(org?.plan || 'STARTER');
    if (limit > 0) {
      const count = await prisma.user.count({ where: { organizationId } });
      if (count >= limit) {
        throw new AppError(
          `Votre formule (${org?.plan || 'STARTER'}) est limitée à ${limit} utilisateurs. Passez à un plan supérieur pour en ajouter davantage.`,
          403,
          'PLAN_USER_LIMIT',
        );
      }
    }

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

  async update(organizationId: string, id: string, body: unknown, requesterRole?: string) {
    await this.getOne(organizationId, id);
    const data = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      role: z.enum(ROLES).optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional(),
    }).parse(body);
    await assertRoleAllowed(organizationId, data.role, requesterRole);

    const { password, ...rest } = data;
    return prisma.user.update({
      where: { id },
      data: { ...rest, ...(password ? { password: await hashPassword(password) } : {}) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.getOne(organizationId, id);
    await prisma.user.delete({ where: { id } });
  }
}
