import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Infinity as InfinityIcon, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { subscriptionService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { PLAN_LABELS, formatDateFr } from '../../utils/subscription';
import { useAuthStore } from '../../store/auth.store';

interface PlatformOrg {
  id: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  plan: string;
  planExpiresAt: string | null;
  createdAt: string;
  _count: { users: number; invoices: number };
}

function statusOf(org: PlatformOrg): { label: string; cls: string } {
  if (!org.planExpiresAt) return { label: 'Illimité', cls: 'badge-blue' };
  const days = Math.ceil((new Date(org.planExpiresAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Expiré', cls: 'badge-red' };
  if (days <= 7) return { label: `${days} j restants`, cls: 'badge-yellow' };
  return { label: `${days} j restants`, cls: 'badge-green' };
}

export default function PlatformAdminPage() {
  const { user } = useAuthStore();
  const [actionError, setActionError] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-orgs'],
    queryFn: () => subscriptionService.organizations(),
    enabled: user?.role === 'SUPER_ADMIN',
  });
  const orgs: PlatformOrg[] = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
      subscriptionService.updateOrganization(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-orgs'] });
      toast.success('Abonnement mis à jour');
    },
    onError: (err: unknown) => setActionError(getApiError(err)),
  });

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="text-center py-20 text-gray-400">
        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        Accès réservé au propriétaire de la plateforme
      </div>
    );
  }

  const expired = orgs.filter((o) => o.planExpiresAt && new Date(o.planExpiresAt) < new Date()).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-600" /> Console plateforme
        </h1>
        <p className="text-gray-500 text-sm">Gestion des abonnements de tous vos clients</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500">Organisations</p>
          <p className="text-2xl font-bold">{orgs.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500">Actives</p>
          <p className="text-2xl font-bold text-green-600">{orgs.length - expired}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500">Expirées</p>
          <p className="text-2xl font-bold text-red-500">{expired}</p>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Organisation</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Formule</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Expire le</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Utilisateurs</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Prolonger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : orgs.map((o) => {
              const st = statusOf(o);
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{o.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{o.slug} • {o.country} • depuis {formatDateFr(o.createdAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={o.plan}
                      onChange={(e) => mutation.mutate({ id: o.id, payload: { plan: e.target.value } })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                    >
                      {Object.entries(PLAN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  <td className="px-6 py-4 text-gray-500">
                    {o.planExpiresAt ? formatDateFr(o.planExpiresAt) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">{o._count.users}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      {[1, 3, 12].map((m) => (
                        <button
                          key={m}
                          onClick={() => mutation.mutate({ id: o.id, payload: { months: m } })}
                          disabled={mutation.isPending}
                          className="px-2 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
                          title={`Prolonger de ${m} mois`}
                        >
                          +{m}m
                        </button>
                      ))}
                      <button
                        onClick={() => mutation.mutate({ id: o.id, payload: { unlimited: true } })}
                        disabled={mutation.isPending}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                        title="Accès illimité"
                      >
                        <InfinityIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        💡 Quand un client vous envoie son paiement Wave/Orange Money, prolongez son abonnement ici
        d'un clic. Son accès est rétabli immédiatement.
      </p>
    </div>
  );
}
