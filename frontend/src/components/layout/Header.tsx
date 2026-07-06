import {
  Bell, Search, LogOut, User, ChevronDown, Menu, FileText, Users as UsersIcon,
  Package, Truck, AlertTriangle, Calendar, Loader2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { authService, dashboardService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/format';

interface SearchResults {
  customers: Array<{ id: string; name: string; email?: string }>;
  invoices: Array<{ id: string; number: string; total: number; status: string; customer?: { name: string } }>;
  products: Array<{ id: string; name: string; code: string }>;
  employees: Array<{ id: string; firstName: string; lastName: string; position?: string }>;
  suppliers: Array<{ id: string; name: string }>;
}

interface Alerts {
  overdueInvoices: Array<{ id: string; number: string; total: number; paidAmount: number; dueDate: string; customer?: { name: string } }>;
  pendingLeaves: Array<{ id: string; type: string; startDate: string; employee?: { firstName: string; lastName: string } }>;
  lowStock: Array<{ id: string; name: string; code: string; stock: number; reorderLevel: number }>;
  draftPOs: number;
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, organization, refreshToken, logout } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showUser, setShowUser] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => dashboardService.search(debounced),
    enabled: debounced.trim().length >= 2,
    staleTime: 1000 * 30,
  });
  const results: SearchResults | undefined = searchData?.data?.data;
  const hasResults = results && (
    results.customers.length + results.invoices.length + results.products.length
    + results.employees.length + results.suppliers.length > 0
  );

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => dashboardService.alerts(),
    refetchInterval: 1000 * 60 * 2,
  });
  const alerts: Alerts | undefined = alertsData?.data?.data;
  const alertCount = alerts
    ? alerts.overdueInvoices.length + alerts.pendingLeaves.length + alerts.lowStock.length
    : 0;

  const go = (path: string) => {
    setSearchOpen(false);
    setShowNotif(false);
    setQuery('');
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const section = (label: string) => (
    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
  );

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between gap-3">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Global search */}
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 animate-spin" />}
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Rechercher clients, factures, produits..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />

        {searchOpen && debounced.trim().length >= 2 && (
          <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 max-h-96 overflow-y-auto">
            {!hasResults && !searching && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucun résultat pour « {debounced} »</p>
            )}
            {results && results.customers.length > 0 && (
              <>
                {section('Clients')}
                {results.customers.map((c) => (
                  <button key={c.id} onClick={() => go('/invoicing/customers')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                    <UsersIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                    </div>
                  </button>
                ))}
              </>
            )}
            {results && results.invoices.length > 0 && (
              <>
                {section('Factures')}
                {results.invoices.map((i) => (
                  <button key={i.id} onClick={() => go(`/invoicing/${i.id}`)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{i.number}</p>
                      <p className="text-xs text-gray-400 truncate">{i.customer?.name}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-500">{formatCurrency(Number(i.total), currency)}</span>
                  </button>
                ))}
              </>
            )}
            {results && results.products.length > 0 && (
              <>
                {section('Produits')}
                {results.products.map((p) => (
                  <button key={p.id} onClick={() => go('/inventory')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{p.name} <span className="text-xs text-gray-400">({p.code})</span></p>
                  </button>
                ))}
              </>
            )}
            {results && results.employees.length > 0 && (
              <>
                {section('Employés')}
                {results.employees.map((e) => (
                  <button key={e.id} onClick={() => go('/hr')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                    <UsersIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.firstName} {e.lastName}</p>
                      {e.position && <p className="text-xs text-gray-400 truncate">{e.position}</p>}
                    </div>
                  </button>
                ))}
              </>
            )}
            {results && results.suppliers.length > 0 && (
              <>
                {section('Fournisseurs')}
                {results.suppliers.map((s) => (
                  <button key={s.id} onClick={() => go('/purchasing/suppliers')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                    <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{s.name}</p>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-1 w-80 max-w-[90vw] bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 max-h-96 overflow-y-auto">
              <p className="px-4 py-2.5 font-semibold text-sm text-gray-900 border-b border-gray-100">
                Notifications {alertCount > 0 && <span className="text-gray-400 font-normal">({alertCount})</span>}
              </p>
              {alertCount === 0 && (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">Aucune alerte — tout est en ordre ✓</p>
              )}
              {alerts?.overdueInvoices.map((i) => (
                <button key={i.id} onClick={() => go(`/invoicing/${i.id}`)} className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Facture {i.number} en retard</p>
                    <p className="text-xs text-gray-400">
                      {i.customer?.name} • {formatCurrency(Number(i.total) - Number(i.paidAmount), currency)} • échue le {formatDate(i.dueDate)}
                    </p>
                  </div>
                </button>
              ))}
              {alerts?.pendingLeaves.map((l) => (
                <button key={l.id} onClick={() => go('/hr/leaves')} className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                  <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Congé à approuver</p>
                    <p className="text-xs text-gray-400">
                      {l.employee?.firstName} {l.employee?.lastName} • à partir du {formatDate(l.startDate)}
                    </p>
                  </div>
                </button>
              ))}
              {alerts?.lowStock.map((p) => (
                <button key={p.id} onClick={() => go('/inventory')} className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                  <Package className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Stock bas : {p.name}</p>
                    <p className="text-xs text-gray-400">{p.stock} restant(s) — seuil : {p.reorderLevel}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUser(!showUser)}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">{organization?.name}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showUser && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={() => { navigate('/settings'); setShowUser(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="w-4 h-4" /> Mon profil
              </button>
              <hr className="my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" /> Se deconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
