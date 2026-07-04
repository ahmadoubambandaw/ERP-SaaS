import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { billingService } from '../../services/api';
import Logo from '../../components/ui/Logo';

type State = 'checking' | 'completed' | 'pending';

export default function BillingReturnPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('checking');

  const check = async () => {
    setState('checking');
    try {
      const res = await billingService.verify();
      const status = res?.data?.data?.status;
      if (status === 'completed') {
        setState('completed');
        setTimeout(() => navigate('/dashboard'), 2200);
      } else {
        setState('pending');
      }
    } catch {
      setState('pending');
    }
  };

  useEffect(() => { check(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 text-center">
        <Logo className="w-14 h-14 mx-auto mb-5" />

        {state === 'checking' && (
          <>
            <Loader2 className="w-8 h-8 text-primary-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900">Vérification du paiement…</h1>
            <p className="text-sm text-gray-500 mt-2">Un instant, nous confirmons votre paiement.</p>
          </>
        )}

        {state === 'completed' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Paiement confirmé 🎉</h1>
            <p className="text-sm text-gray-500 mt-2">Votre abonnement Naatal est activé. Redirection…</p>
          </>
        )}

        {state === 'pending' && (
          <>
            <Clock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Paiement en cours de traitement</h1>
            <p className="text-sm text-gray-500 mt-2">
              Si vous venez de payer, cela peut prendre quelques instants. Cliquez pour revérifier.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={check} className="btn-primary flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Revérifier
              </button>
              <button onClick={() => navigate('/settings')} className="text-sm text-gray-400 hover:text-gray-600">
                Retour aux paramètres
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
