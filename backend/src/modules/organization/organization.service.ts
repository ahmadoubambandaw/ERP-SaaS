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

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  taxId: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
  country: z.string().length(2).optional(),
  // Encaissement caisse : lien marchand Wave + numéro Mobile Money
  wavePaymentLink: z.string().max(300).url('Lien Wave invalide').optional(),
  mobileMoneyNumber: z.string().max(30).optional(),
  // data URL, resized client-side; hard cap ~500KB
  logo: z.string().max(500_000).regex(/^data:image\/(png|jpe?g|webp);base64,/, 'Format de logo invalide').nullable().optional(),
});

export class OrganizationService {
  async get(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true, name: true, slug: true, country: true, currency: true,
        language: true, address: true, phone: true, email: true, taxId: true, logo: true,
        wavePaymentLink: true, mobileMoneyNumber: true,
      },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);
    return org;
  }

  async update(orgId: string, body: unknown) {
    // logo:null means "remove the logo" — keep it out of clean()
    const raw = body as Record<string, unknown> | null;
    const removeLogo = raw !== null && typeof raw === 'object' && raw.logo === null;
    const data = updateSchema.parse({ ...clean(body), ...(removeLogo ? { logo: null } : {}) });
    return prisma.organization.update({
      where: { id: orgId },
      data,
      select: {
        id: true, name: true, slug: true, country: true, currency: true,
        language: true, address: true, phone: true, email: true, taxId: true, logo: true,
        wavePaymentLink: true, mobileMoneyNumber: true,
      },
    });
  }
}
