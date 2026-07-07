import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Infinity as InfinityIcon, X, TrendingUp, Wallet, Users,
  Clock, BadgeCheck, Ban, CreditCard, CalendarPlus, Search, Download, Send, Percent,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subscriptionService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { PLAN_LABELS, formatDateFr, formatXof } from '../../utils/subscription';
import { useAuthStore } from '../../store/auth.store';
import OrgDetailModal from './OrgDetailModal';

interface PlatformOrg {
  id: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  plan: string;
  planExpiresAt: string | null;
  createdAt: string;
  _count: { users: number };
}

interface PlatformStats {
  totalClients: number;
  activeClients: number;
  expiredClients: number;
  payingClients: number;
  trialClients: number;
  newThisMonth: number;
  revenueTotal: number;
  revenueThisMonth: number;
  mrr: number;
  paymentsCount: number;
  referralsRewarded: number;
  conversionRate: number;
  everPaidClients: number;
  planDistribution: Record<string, number>;
  revenueByMonth: { month: string; revenue: number }[];
  recentPayments: {
    id: string; org: string; amount: number; currency: string;
    plan: string; months: number; paidAt: string | null;
  }[];
}

type StatusFilter = 'all' | 'active' | 'expired' | 'unlimited';

function statusOf(org: PlatformOrg): { label: string; cls: string } {
  if (!org.planExpiresAt) return { label: 'Illimité', cls: 'badge-blue' };
  const days = Math.ceil((new Date(org.planExpiresAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Expiré', cls: 'badge-red' };
  if (days <= 7) return { label: `${days} j restants`, cls: 'badge-yellow' };
  return { label: `${days} j restants`, cls: 'badge-green' };
}

function StatCard({ icon, label, value, hint, accent }: {
  icon: React.ReactNode; label: string; value: string; hint?: string; accent?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-2">
        <span className={accent || 'text-primary-600'}>{icon}</span>
        {label}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function orgMatchesStatus(org: PlatformOrg, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unlimited') return org.planExpiresAt === null;
  if (org.planExpiresAt === null) return filter === 'active'; // illimité compte comme actif
  const active = new Date(org.planExpiresAt).getTime() >= Date.now();
  return filter === 'active' ? active : !active;
}

export default function PlatformAdminPage() {
  const { user } = useAuthStore();
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailOrgId, setDetailOrgId] = useState<string | null>(null);
  const qc = useQueryClient();

  const isOwner = user?.role === 'SUPER_ADMIN';

  const { data: statsData } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => subscriptionService.platformStats(),
    enabled: isOwner,
  });
  const stats: PlatformStats | undefined = statsData?.data?.data;

  const { data, isLoading } = useQuery({
    queryKey: ['platform-orgs'],
    queryFn: () => subscriptionService.organizations(),
    enabled: isOwner,
  });
  const orgs: PlatformOrg[] = data?.data?.data || [];

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgs.filter((o) =>
      orgMatchesStatus(o, statusFilter) &&
      (!q || o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q) || o.country.toLowerCase().includes(q)),
    );
  }, [orgs, search, statusFilter]);

  const exportCsv = () => {
    const header = ['Organisation', 'Slug', 'Pays', 'Formule', 'Statut', 'Expire le', 'Utilisateurs', 'Inscrit le'];
    const rows = filteredOrgs.map((o) => {
      const st = statusOf(o);
      return [
        o.name, o.slug, o.country, PLAN_LABELS[o.plan] || o.plan, st.label,
        o.planExpiresAt ? formatDateFr(o.planExpiresAt) : 'Illimité',
        o._count.users, formatDateFr(o.createdAt),
      ];
    });
    const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(escape).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naatal-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredOrgs.length} client(s) exporté(s)`);
  };

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
      subscriptionService.updateOrganization(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-orgs'] });
      qc.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('Abonnement mis à jour');
    },
    onError: (err: unknown) => setActionError(getApiError(err)),
  });

  const remindersMutation = useMutation({
    mutationFn: () => subscriptionService.runReminders(),
    onSuccess: (res) => {
      const r = res?.data?.data as { configured: boolean; sent: number } | undefined;
      if (r && !r.configured) {
        toast('Email non configuré (BREVO_API_KEY manquant). Les relances partiront une fois l\'email activé.', { icon: '✉️', duration: 6000 });
      } else if (r && r.sent > 0) {
        toast.success(`${r.sent} relance(s) envoyée(s) aux clients qui expirent bientôt`);
      } else {
        toast('Aucun client n\'expire dans les 3 prochains jours. Rien à envoyer.', { icon: '👍' });
      }
    },
    onError: (err: unknown) => setActionError(getApiError(err)),
  });

  if (!isOwner) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        Accès réservé au propriétaire de la plateforme
      </div>
    );
  }

  const dist = stats?.planDistribution || {};
  const distTotal = Math.max(1, (dist.CAISSE || 0) + (dist.STARTER || 0) + (dist.PROFESSIONAL || 0) + (dist.ENTERPRISE || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" /> Tableau de bord fondateur
          </h1>
          <p className="text-gray-500 text-sm">Vos revenus, vos clients et le contrôle de toute la plateforme Naatal</p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Envoyer un email de relance à tous les clients dont l\'abonnement expire dans 3 jours ou moins ?')) {
              remindersMutation.mutate();
            }
          }}
          disabled={remindersMutation.isPending}
          className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
          title="Relancer les clients qui expirent bientôt"
        >
          <Send className={`w-4 h-4 ${remindersMutation.isPending ? 'animate-pulse' : ''}`} />
          Envoyer les relances
        </button>
      </div>

      {/* ===== Indicateurs clés ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="MRR (revenu récurrent)"
          value={formatXof(stats?.mrr ?? 0)}
          hint="par mois estimé"
        />
        <StatCard
          icon={<Wallet className="w-4 h-4" />}
          label="Revenu ce mois"
          value={formatXof(stats?.revenueThisMonth ?? 0)}
          accent="text-green-600"
        />
        <StatCard
          icon={<Wallet className="w-4 h-4" />}
          label="Revenu total"
          value={formatXof(stats?.revenueTotal ?? 0)}
          hint={`${stats?.paymentsCount ?? 0} paiement(s)`}
          accent="text-green-600"
        />
        <StatCard
          icon={<BadgeCheck className="w-4 h-4" />}
          label="Clients payants"
          value={String(stats?.payingClients ?? 0)}
          accent="text-primary-600"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="En essai gratuit"
          value={String(stats?.trialClients ?? 0)}
          accent="text-amber-500"
        />
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Nouveaux ce mois"
          value={`+${stats?.newThisMonth ?? 0}`}
          hint={`${stats?.totalClients ?? 0} clients au total`}
        />
      </div>

      {/* ===== Évolution des revenus ===== */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Évolution des revenus (6 mois)</h2>
        </div>
        <div className="p-4 sm:p-6">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.revenueByMonth || []}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} width={38} />
              <Tooltip formatter={(v: number) => [formatXof(v), 'Revenu']} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revGradient)" name="Revenu" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== Répartition + Paiements récents ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Répartition par formule */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary-600" /> Répartition par formule
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full" title="Clients ayant déjà payé / total des clients">
              <Percent className="w-3 h-3" /> {stats?.conversionRate ?? 0}% convertis
            </span>
          </div>
          <div className="space-y-3">
            {(['CAISSE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const).map((p) => {
              const count = dist[p] || 0;
              const pct = Math.round((count / distTotal) * 100);
              return (
                <div key={p}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{PLAN_LABELS[p]}</span>
                    <span className="text-gray-400">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Comptes expirés</span>
            <span className="font-semibold text-red-500">{stats?.expiredClients ?? 0}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">Parrainages récompensés</span>
            <span className="font-semibold text-primary-600">{stats?.referralsRewarded ?? 0}</span>
          </div>
        </div>

        {/* Paiements récents */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600" /> Derniers paiements
          </h2>
          {stats?.recentPayments?.length ? (
            <ul className="divide-y divide-gray-50">
              {stats.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.org}</p>
                    <p className="text-xs text-gray-400">
                      {PLAN_LABELS[p.plan] || p.plan} · {p.months} mois
                      {p.paidAt && <> · {formatDateFr(p.paidAt)}</>}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 whitespace-nowrap ml-3">
                    +{formatXof(p.amount, p.currency || 'F CFA')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">
              Aucun paiement en ligne pour l'instant.<br />
              Ils apparaîtront ici dès qu'un client paie via PayDunya.
            </p>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ===== Gestion des clients ===== */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Gestion des clients</h2>
              <p className="text-xs text-gray-400 mt-0.5">Changez de formule, prolongez, passez en illimité ou suspendez un compte.</p>
            </div>
            <button
              onClick={exportCsv}
              disabled={!filteredOrgs.length}
              className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un client…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              />
            </div>
            <div className="flex gap-1">
              {([
                ['all', 'Tous'],
                ['active', 'Actifs'],
                ['expired', 'Expirés'],
                ['unlimited', 'Illimités'],
              ] as [StatusFilter, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    statusFilter === v
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Organisation</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Formule</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Expire le</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Users</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
              ) : !filteredOrgs.length ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Aucun client ne correspond à votre recherche.</td></tr>
              ) : filteredOrgs.map((o) => {
                const st = statusOf(o);
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDetailOrgId(o.id)}
                        className="text-left group"
                        title="Voir la fiche client"
                      >
                        <p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{o.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{o.slug} • {o.country} • depuis {formatDateFr(o.createdAt)}</p>
                      </button>
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
                            className="px-2 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors flex items-center gap-1"
                            title={`Prolonger de ${m} mois`}
                          >
                            <CalendarPlus className="w-3 h-3" />{m}m
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
                        <button
                          onClick={() => {
                            if (window.confirm(`Suspendre l'accès de « ${o.name} » ? Le compte sera bloqué immédiatement.`)) {
                              mutation.mutate({ id: o.id, payload: { suspend: true } });
                            }
                          }}
                          disabled={mutation.isPending}
                          className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                          title="Suspendre le compte"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        💡 Quand un client vous paie par Wave/Orange Money, prolongez son abonnement d'un clic — son accès est
        rétabli immédiatement. Les paiements PayDunya s'appliquent automatiquement. Cliquez sur le nom d'un client
        pour voir sa fiche détaillée.
      </p>

      {detailOrgId && <OrgDetailModal orgId={detailOrgId} onClose={() => setDetailOrgId(null)} />}
    </div>
  );
}
