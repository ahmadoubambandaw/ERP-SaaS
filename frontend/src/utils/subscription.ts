export const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

export const PLAN_PRICES: Record<string, string> = {
  STARTER: '10 000 F CFA / mois',
  PROFESSIONAL: '25 000 F CFA / mois',
  ENTERPRISE: 'Sur devis',
};

// Numéro qui reçoit les paiements d'abonnement (Wave / Orange Money)
export const PAYMENT_NUMBER = '77 414 09 00';
export const PAYMENT_NAME = 'NdawTech';

export function formatDateFr(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
