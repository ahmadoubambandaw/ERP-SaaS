import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/error.middleware';
import { PLAN_PRICE_XOF } from '../../config/plans';
import { SubscriptionService } from '../subscription/subscription.service';

const subscriptionService = new SubscriptionService();

function paydunyaBase(): string {
  const mode = (process.env.PAYDUNYA_MODE || 'test').toLowerCase();
  return mode === 'live'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1';
}

function paydunyaHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY || '',
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY || '',
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN || '',
  };
}

function isConfigured(): boolean {
  return Boolean(
    process.env.PAYDUNYA_MASTER_KEY &&
    process.env.PAYDUNYA_PRIVATE_KEY &&
    process.env.PAYDUNYA_TOKEN,
  );
}

const PLAN_LABELS: Record<string, string> = {
  CAISSE: 'Caisse',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

export class BillingService {
  /** Crée une facture PayDunya et renvoie l'URL de paiement. */
  async createCheckout(orgId: string, months = 1) {
    if (!isConfigured()) {
      throw new AppError(
        'Paiement en ligne non configuré. Ajoutez les clés PayDunya (PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN) sur le serveur.',
        503,
        'BILLING_NOT_CONFIGURED',
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, name: true, currency: true },
    });
    if (!org) throw new AppError('Organisation introuvable', 404);

    const amount = PLAN_PRICE_XOF[org.plan];
    if (!amount) {
      throw new AppError(
        'Cette formule ne peut pas être payée en ligne. Contactez-nous pour un devis.',
        400,
        'PLAN_NOT_PAYABLE',
      );
    }

    const total = amount * months;
    const frontend = process.env.FRONTEND_URL || 'https://erp-saa-s.vercel.app';
    const apiPublic = process.env.API_PUBLIC_URL || 'https://erp-saas-production-f0ab.up.railway.app';

    const res = await fetch(`${paydunyaBase()}/checkout-invoice/create`, {
      method: 'POST',
      headers: paydunyaHeaders(),
      body: JSON.stringify({
        invoice: {
          total_amount: total,
          description: `Abonnement Naatal ${PLAN_LABELS[org.plan] || org.plan} — ${months} mois`,
        },
        store: { name: 'Naatal', website_url: frontend },
        custom_data: { organizationId: orgId, plan: org.plan, months },
        actions: {
          cancel_url: `${frontend}/settings`,
          return_url: `${frontend}/billing/return`,
          callback_url: `${apiPublic}/api/v1/billing/callback`,
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      response_code?: string; response_text?: string; token?: string; description?: string;
    };

    if (data.response_code !== '00' || !data.token || !data.response_text) {
      console.error('PayDunya create error:', res.status, JSON.stringify(data));
      // On remonte la raison exacte donnée par PayDunya pour faciliter le diagnostic
      const reason = data.response_text || data.description || `HTTP ${res.status}`;
      throw new AppError(`PayDunya a refusé le paiement : ${reason}`, 502);
    }

    await prisma.subscriptionPayment.create({
      data: {
        organizationId: orgId,
        plan: org.plan,
        months,
        amount: total,
        currency: org.currency || 'XOF',
        token: data.token,
        status: 'PENDING',
      },
    });

    return { url: data.response_text };
  }

  /** Confirme un paiement via son token et applique l'abonnement (idempotent). */
  private async applyByToken(token: string): Promise<'completed' | 'pending' | 'unknown'> {
    const pay = await prisma.subscriptionPayment.findUnique({ where: { token } });
    if (!pay) return 'unknown';
    if (pay.status === 'COMPLETED') return 'completed';

    if (!isConfigured()) return 'pending';

    const res = await fetch(`${paydunyaBase()}/checkout-invoice/confirm/${token}`, {
      headers: paydunyaHeaders(),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string };

    if (data.status === 'completed') {
      await prisma.subscriptionPayment.update({
        where: { token },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });
      // Prolonge l'abonnement (+ récompense le parrain le cas échéant)
      await subscriptionService.updateOrganization(pay.organizationId, { months: pay.months });
      return 'completed';
    }
    return 'pending';
  }

  /** Vérifie le dernier paiement en attente de l'organisation (au retour PayDunya). */
  async verify(orgId: string) {
    const pending = await prisma.subscriptionPayment.findFirst({
      where: { organizationId: orgId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) {
      // Peut-être déjà confirmé
      const last = await prisma.subscriptionPayment.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      });
      return { status: last?.status === 'COMPLETED' ? 'completed' : 'none' };
    }
    const status = await this.applyByToken(pending.token);
    return { status };
  }

  /** Callback serveur PayDunya (IPN). Public, idempotent. */
  async handleCallback(body: unknown): Promise<void> {
    const b = body as { token?: string; data?: { invoice?: { token?: string } } };
    const token = b?.data?.invoice?.token || b?.token;
    if (token) {
      await this.applyByToken(token).catch((e) => console.error('Callback apply error:', e));
    }
  }
}
