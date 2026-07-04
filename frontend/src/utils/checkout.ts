import toast from 'react-hot-toast';
import { billingService } from '../services/api';
import { getApiError } from './apiError';

/**
 * Lance le paiement en ligne PayDunya : crée la facture et redirige
 * vers la page de paiement. Si le paiement en ligne n'est pas encore
 * configuré, bascule proprement sur les instructions manuelles.
 * @returns true si une redirection a eu lieu.
 */
export async function startCheckout(): Promise<boolean> {
  const t = toast.loading('Préparation du paiement...');
  try {
    const res = await billingService.checkout();
    const url = res?.data?.data?.url as string | undefined;
    toast.dismiss(t);
    if (url) {
      window.location.href = url;
      return true;
    }
    toast.error('Lien de paiement indisponible, réessayez.');
    return false;
  } catch (err) {
    toast.dismiss(t);
    const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
    if (code === 'BILLING_NOT_CONFIGURED') {
      toast('Paiement en ligne bientôt disponible. Utilisez Wave / Orange Money en attendant.', { icon: '💳', duration: 5000 });
    } else {
      toast.error(getApiError(err, 'Impossible de lancer le paiement'));
    }
    return false;
  }
}
