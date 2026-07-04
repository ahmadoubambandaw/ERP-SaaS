import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Lock, Smartphone, RefreshCw, LogOut, MessageCircle } from 'lucide-react';
import { subscriptionService, authService } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { PLAN_LABELS, PLAN_PRICES, PAYMENT_NUMBER, PAYMENT_NAME, formatDateFr } from '../../utils/subscription';

export default function SubscriptionExpiredPage() {
  const navigate = useNavigate();
  const { organization, refreshToken, logout } = useAuthStore();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionService.me(),
  });
  const sub = data?.data?.data;

  const checkAgain = async () => {
    const res = await refetch();
    if (res.data?.data?.data?.active) {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center">Abonnement expiré</h1>
        <p className="text-sm text-gray-500 text-center mt-2">
          L'abonnement de <strong>{organization?.name}</strong>
          {sub?.planExpiresAt && <> a expiré le <strong>{formatDateFr(sub.planExpiresAt)}</strong></>}.
          Vos données sont conservées en sécurité — renouvelez pour reprendre là où vous vous êtes arrêté.
        </p>

        <div className="mt-6 p-4 bg-primary-50 border border-primary-100 rounded-xl">
          <p className="font-semibold text-sm text-gray-900 flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-primary-600" /> Comment renouveler
          </p>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>
              Envoyez le montant de votre formule
              {sub?.plan && PLAN_PRICES[sub.plan] && <> (<strong>{PLAN_PRICES[sub.plan]}</strong> — {PLAN_LABELS[sub.plan]})</>}
              {' '}par <strong>Wave</strong> ou <strong>Orange Money</strong> au :
              <span className="block font-bold text-lg text-gray-900 mt-1">{PAYMENT_NUMBER}</span>
              <span className="text-xs text-gray-400">({PAYMENT_NAME})</span>
            </li>
            <li>Envoyez la capture du paiement par WhatsApp au même numéro</li>
            <li>Votre compte est réactivé sous 24h (souvent en quelques minutes)</li>
          </ol>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={checkAgain}
            disabled={isFetching}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            J'ai payé — vérifier mon abonnement
          </button>
          <a
            href={`https://wa.me/221${PAYMENT_NUMBER.replace(/\s/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Contacter le support WhatsApp
          </a>
          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-2 py-2"
          >
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
