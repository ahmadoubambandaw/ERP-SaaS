export const PLAN_LABELS: Record<string, string> = {
  CAISSE: 'Caisse',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

export const PLAN_PRICES: Record<string, string> = {
  CAISSE: '5 000 F CFA / mois',
  STARTER: '10 000 F CFA / mois',
  PROFESSIONAL: '20 000 F CFA / mois',
  ENTERPRISE: 'Sur devis',
};

// Numéro qui reçoit les paiements d'abonnement (Wave / Orange Money)
export const PAYMENT_NUMBER = '77 414 09 00';
export const PAYMENT_NAME = 'NdawTech';

export function formatDateFr(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Montant en francs CFA, ex. 15000 -> "15 000 F CFA"
export function formatXof(amount: number, currency = 'F CFA'): string {
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/ /g, ' ')} ${currency}`;
}
