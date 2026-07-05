import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Wallet, FileText, Users, Gift, CreditCard } from 'lucide-react';
import { subscriptionService } from '../../services/api';
import { PLAN_LABELS, formatDateFr, formatXof } from '../../utils/subscription';

interface OrgDetail {
  id: string; name: string; slug: string; country: string; currency: string;
  plan: string; planExpiresAt: string | null; createdAt: string;
  email: string | null; phone: string | null;
  referralCode: string | null; referredByName: string | null;
  totalPaid: number; invoiceCount: number; invoiceTotal: number;
  users: { id: string; firstName: string; lastName: string; email: string; role: string }[];
  payments: {
    id: string; plan: string; months: number; amount: number; currency: string;
    status: string; createdAt: string; paidAt: string | null;
  }[];
}

const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Payé', cls: 'badge-green' },
  PENDING: { label: 'En attente', cls: 'badge-yellow' },
  FAILED: { label: 'Échoué', cls: 'badge-red' },
};

export default function OrgDetailModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['org-detail', orgId],
    queryFn: () => subscriptionService.organizationDetails(orgId),
  });
  const org: OrgDetail | undefined = data?.data?.data;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 truncate">{org?.name || 'Chargement…'}</h2>
            {org && (
              <p className="text-xs text-gray-400 font-mono truncate">
                {org.slug} • {org.country} • depuis {formatDateFr(org.createdAt)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading || !org ? (
          <div className="py-20 text-center text-gray-400">
            <Loader2 className="w-6 h-6 mx-auto animate-spin" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Abonnement + contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Formule</p>
                <p className="font-semibold text-gray-900">{PLAN_LABELS[org.plan] || org.plan}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {org.planExpiresAt ? `Expire le ${formatDateFr(org.planExpiresAt)}` : 'Accès illimité'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Contact</p>
                <p className="text-sm text-gray-900 truncate">{org.email || '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{org.phone || 'Pas de téléphone'}</p>
              </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-gray-100 text-center">
                <Wallet className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="font-bold text-gray-900 text-sm">{formatXof(org.totalPaid)}</p>
                <p className="text-[11px] text-gray-400">Total payé</p>
              </div>
              <div className="p-3 rounded-xl border border-gray-100 text-center">
                <FileText className="w-4 h-4 text-primary-600 mx-auto mb-1" />
                <p className="font-bold text-gray-900 text-sm">{org.invoiceCount}</p>
                <p className="text-[11px] text-gray-400">Factures</p>
              </div>
              <div className="p-3 rounded-xl border border-gray-100 text-center">
                <FileText className="w-4 h-4 text-primary-600 mx-auto mb-1" />
                <p className="font-bold text-gray-900 text-sm">{formatXof(org.invoiceTotal)}</p>
                <p className="text-[11px] text-gray-400">CA facturé</p>
              </div>
            </div>

            {/* Parrainage */}
            {(org.referralCode || org.referredByName) && (
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {org.referralCode && (
                  <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5 text-primary-600" /> Code : <span className="font-mono font-medium text-gray-700">{org.referralCode}</span></span>
                )}
                {org.referredByName && (
                  <span>Parrainé par <strong className="text-gray-700">{org.referredByName}</strong></span>
                )}
              </div>
            )}

            {/* Historique des paiements */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gray-400" /> Historique des paiements
              </h3>
              {org.payments.length ? (
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {org.payments.map((p) => {
                    const st = PAY_STATUS[p.status] || { label: p.status, cls: 'badge-gray' };
                    return (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900">
                            {PLAN_LABELS[p.plan] || p.plan} · {p.months} mois
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDateFr(p.paidAt || p.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`badge ${st.cls} text-[11px]`}>{st.label}</span>
                          <span className="text-sm font-semibold text-gray-900">{formatXof(p.amount, p.currency || 'F CFA')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-3">Aucun paiement en ligne enregistré.</p>
              )}
            </div>

            {/* Équipe */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Équipe ({org.users.length})
              </h3>
              <div className="space-y-1.5">
                {org.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 truncate">{u.firstName} {u.lastName} <span className="text-gray-400">· {u.email}</span></span>
                    <span className="badge badge-gray text-[11px] shrink-0 ml-2">{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
