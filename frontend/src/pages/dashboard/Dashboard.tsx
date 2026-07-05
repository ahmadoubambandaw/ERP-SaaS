import { useQuery } from '@tanstack/react-query';
import { BarChart2, FileText, Package, Users, TrendingUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../../services/api';
import KpiCard from '../../components/ui/KpiCard';
import QuickActions from '../../components/ui/QuickActions';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';

export default function DashboardPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';

  const { data: kpisData } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: () => dashboardService.kpis() });
  const { data: chartData } = useQuery({ queryKey: ['dashboard-chart'], queryFn: () => dashboardService.revenueChart() });
  const { data: invoicesData } = useQuery({ queryKey: ['dashboard-invoices'], queryFn: () => dashboardService.recentInvoices() });

  const kpis = kpisData?.data?.data;
  const chart = chartData?.data?.data || [];
  const recentInvoices = invoicesData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre activite</p>
      </div>

      {/* Accès rapide en gros boutons (pensé pour une prise en main facile) */}
      <QuickActions />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Chiffre d'affaires"
          value={formatCurrency(kpis?.invoices?.monthRevenue || 0, currency)}
          subtitle="Ce mois"
          icon={BarChart2}
          color="blue"
        />
        <KpiCard
          title="Clients"
          value={kpis?.customers || 0}
          icon={Users}
          color="green"
        />
        <KpiCard
          title="Factures impayees"
          value={formatCurrency((kpis?.invoices?.unpaidAmount || 0), currency)}
          subtitle={`${kpis?.invoices?.overdue || 0} en retard`}
          icon={FileText}
          color="yellow"
        />
        <KpiCard
          title="Employes"
          value={kpis?.employees || 0}
          icon={Users}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Produits" value={kpis?.products || 0} icon={Package} color="blue" />
        <KpiCard title="Prospects CRM" value={kpis?.leads || 0} icon={TrendingUp} color="green" />
        <KpiCard title="Projets" value={kpis?.projects || 0} icon={CheckCircle} color="purple" />
      </div>

      {(kpis?.alerts?.overdueInvoices > 0 || kpis?.alerts?.pendingLeaves > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {kpis?.alerts?.overdueInvoices > 0 && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">
                <strong>{kpis.alerts.overdueInvoices}</strong> facture(s) en retard de paiement
              </p>
            </div>
          )}
          {kpis?.alerts?.pendingLeaves > 0 && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                <strong>{kpis.alerts.pendingLeaves}</strong> demande(s) de conge en attente
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 card">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Evolution du chiffre d'affaires (12 mois)</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" name="CA" />
                <Area type="monotone" dataKey="collected" stroke="#22c55e" fill="#dcfce7" name="Encaisse" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Dernieres factures</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentInvoices.slice(0, 5).map((inv: Record<string, unknown>) => (
              <div key={inv.id as string} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{(inv.customer as Record<string, unknown>)?.name as string}</p>
                    <p className="text-xs text-gray-400">{inv.number as string}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(inv.total as number, currency)}</p>
                    <StatusBadge status={inv.status as string} />
                  </div>
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">Aucune facture</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
