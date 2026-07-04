import { prisma } from '../../utils/prisma';
import { hashPassword, comparePassword, validatePasswordStrength } from '../../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

const registerSchema = z.object({
  organizationName: z.string().min(2),
  organizationSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  country: z.string().length(2).default('SN'),
  currency: z.string().length(3).default('XOF'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('STARTER'),
  referralCode: z.string().trim().min(3).max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationSlug: z.string().min(1),
});

export class AuthService {
  private async generateReferralCode(): Promise<string> {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 8; i++) {
      const code = 'NA-' + Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const clash = await prisma.organization.findUnique({ where: { referralCode: code } });
      if (!clash) return code;
    }
    return 'NA-' + Date.now().toString(36).toUpperCase();
  }

  async register(body: unknown) {
    const data = registerSchema.parse(body);

    if (!validatePasswordStrength(data.password)) {
      throw new AppError('Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre', 400);
    }

    const existing = await prisma.organization.findUnique({
      where: { slug: data.organizationSlug },
    });
    if (existing) {
      throw new AppError('Ce slug organisation est deja utilise', 409);
    }

    const hashedPassword = await hashPassword(data.password);

    // Parrainage : code du parrain -> +7 jours d'essai bonus pour le filleul
    let referredById: string | undefined;
    let trialDays = 14;
    if (data.referralCode) {
      const referrer = await prisma.organization.findUnique({
        where: { referralCode: data.referralCode.toUpperCase() },
        select: { id: true },
      });
      if (referrer) {
        referredById = referrer.id;
        trialDays = 21;
      }
    }

    const referralCode = await this.generateReferralCode();

    const org = await prisma.organization.create({
      data: {
        name: data.organizationName,
        slug: data.organizationSlug,
        country: data.country,
        currency: data.currency,
        plan: data.plan,
        referralCode,
        referredById,
        // Essai gratuit (14 jours, ou 21 avec un code de parrainage)
        planExpiresAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
        users: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: hashedPassword,
            role: 'ADMIN',
          },
        },
      },
      include: { users: true },
    });

    const user = org.users[0];
    const tokens = this.generateTokens(user.id, org.id, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens, organization: { id: org.id, name: org.name, slug: org.slug } };
  }

  async login(body: unknown) {
    const data = loginSchema.parse(body);

    const org = await prisma.organization.findUnique({
      where: { slug: data.organizationSlug },
    });
    if (!org || !org.isActive) {
      throw new AppError('Organisation introuvable ou inactive', 404);
    }

    const user = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId: org.id, email: data.email } },
    });
    if (!user || !user.isActive) {
      throw new AppError('Identifiants incorrects', 401);
    }

    const valid = await comparePassword(data.password, user.password);
    if (!valid) {
      throw new AppError('Identifiants incorrects', 401);
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = this.generateTokens(user.id, org.id, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens, organization: { id: org.id, name: org.name, slug: org.slug, currency: org.currency, language: org.language } };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new AppError('Refresh token manquant', 400);

    const payload = verifyRefreshToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, organizationId: true, role: true, isActive: true } } },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new AppError('Token invalide ou expire', 401);
    }

    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const tokens = this.generateTokens(payload.userId, payload.organizationId, stored.user.role);
    await this.saveRefreshToken(payload.userId, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    } else {
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true, name: true, slug: true, currency: true, language: true, country: true, logo: true } } },
    });
    if (!user) throw new AppError('Utilisateur introuvable', 404);
    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Utilisateur introuvable', 404);

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw new AppError('Mot de passe actuel incorrect', 400);

    if (!validatePasswordStrength(newPassword)) {
      throw new AppError('Le nouveau mot de passe ne respecte pas les criteres de securite', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(newPassword) },
    });
  }

  private generateTokens(userId: string, organizationId: string, role: string) {
    const accessToken = generateAccessToken({ userId, organizationId, role });
    const refreshToken = generateRefreshToken({ userId, organizationId, role });
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { password: _, ...safe } = user as { password: string } & Record<string, unknown>;
    return safe;
  }
}
