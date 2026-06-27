export function formatCurrency(amount: number, currency = 'XOF'): string {
  const locales: Record<string, string> = {
    XOF: 'fr-SN', XAF: 'fr-CM', GNF: 'fr-GN', MAD: 'fr-MA',
    NGN: 'en-NG', KES: 'en-KE', USD: 'en-US', EUR: 'fr-FR',
  };
  return new Intl.NumberFormat(locales[currency] || 'fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'XOF' || currency === 'XAF' || currency === 'GNF' ? 0 : 2,
  }).format(amount);
}

export function formatDate(date: string | Date, locale = 'fr-FR'): string {
  return new Date(date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}
