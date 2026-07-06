import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2).max(80),
  currency: z.string().length(3).optional(),
  country: z.string().length(2).optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'entreprise';
}

export class CompaniesService {
  /** Racine du groupe : l'organisation mère, ou l'organisation elle-même. */
  private rootId(org: { id: string; parentOrganizationId: string | null }): string {
    return org.parentOrganizationId || org.id;
  }

  /** Liste des entreprises du groupe auxquelles l'utilisateur (par email) a accès. */
  async list(orgId: string, email: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, parentOrganizationId: true },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);
    const root = this.rootId(org);

    const members = await prisma.organization.findMany({
      where: { OR: [{ id: root }, { parentOrganizationId: root }] },
      select: {
        id: true, name: true, slug: true, currency: true, country: true,
        logo: true, plan: true, parentOrganizationId: true,
        users: { where: { email, isActive: true }, select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members
      .filter((m) => m.users.length > 0)
      .map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        currency: m.currency,
        country: m.country,
        logo: m.logo,
        plan: m.plan,
        isHeadquarters: !m.parentOrganizationId,
        current: m.id === orgId,
      }));
  }

  /** Crée une nouvelle entreprise dans le groupe et y recopie l'utilisateur courant. */
  async create(orgId: string, userId: string, role: string, body: unknown) {
    const data = createSchema.parse(body);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, parentOrganizationId: true, plan: true, planExpiresAt: true, country: true, currency: true },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);

    // Fonctionnalité réservée à la formule Entreprise (le fondateur passe outre).
    if (role !== 'SUPER_ADMIN' && org.plan !== 'ENTERPRISE') {
      throw new AppError(
        'La gestion multi-entreprises est réservée à la formule Entreprise.',
        403,
        'PLAN_UPGRADE_REQUIRED',
      );
    }

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, password: true },
    });
    if (!me) throw new AppError('Utilisateur introuvable', 404);

    const root = this.rootId(org);

    // Slug unique
    let base = slugify(data.name);
    let slug = base;
    for (let i = 2; await prisma.organization.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }

    const company = await prisma.organization.create({
      data: {
        name: data.name,
        slug,
        country: data.country || org.country,
        currency: data.currency || org.currency,
        plan: org.plan,
        planExpiresAt: org.planExpiresAt,
        parentOrganizationId: root,
        users: {
          create: {
            firstName: me.firstName,
            lastName: me.lastName,
            email: me.email,
            password: me.password,
            role: 'ADMIN',
          },
        },
      },
      select: { id: true, name: true, slug: true, currency: true, country: true, logo: true, plan: true },
    });

    return { ...company, isHeadquarters: false, current: false };
  }

  /** Bascule vers une autre entreprise du groupe : émet de nouveaux tokens. */
  async switchCompany(orgId: string, email: string, targetId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, parentOrganizationId: true },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);
    const root = this.rootId(org);

    const target = await prisma.organization.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, slug: true, currency: true, language: true, isActive: true, parentOrganizationId: true },
    });
    if (!target || !target.isActive) throw new AppError('Entreprise introuvable', 404);

    // Doit appartenir au même groupe
    const targetRoot = target.parentOrganizationId || target.id;
    if (targetRoot !== root) throw new AppError('Cette entreprise ne fait pas partie de votre groupe', 403);

    const user = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId: target.id, email } },
    });
    if (!user || !user.isActive) throw new AppError("Vous n'avez pas accès à cette entreprise", 403);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = generateAccessToken({ userId: user.id, organizationId: target.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, organizationId: target.id, role: user.role });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });

    const { password: _pw, ...safeUser } = user;
    return {
      user: safeUser,
      tokens: { accessToken, refreshToken },
      organization: { id: target.id, name: target.name, slug: target.slug, currency: target.currency, language: target.language },
    };
  }
}
