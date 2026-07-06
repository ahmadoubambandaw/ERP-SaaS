import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users, BarChart2, ShoppingCart,
  FolderKanban, Settings, ChevronLeft, ChevronRight, Building2, TrendingUp, X, Shield, Lock, ScanLine,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { subscriptionService } from '../../services/api';
import { planHasModule, PlanModule } from '../../utils/plans';
import { roleHasModule } from '../../utils/roles';
import { clsx } from 'clsx';
import Logo from '../ui/Logo';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  module?: PlanModule;
  children?: { label: string; to: string }[];
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Caisse (POS)', icon: ScanLine, to: '/pos', module: 'pos' },
  { label: 'Comptabilite', icon: BarChart2, to: '/accounting', module: 'accounting' },
  {
    label: 'Facturation', icon: FileText, to: '/invoicing', module: 'invoicing',
    children: [
      { label: 'Factures & Devis', to: '/invoicing' },
      { label: 'Clients', to: '/invoicing/customers' },
    ],
  },
  {
    label: 'Stocks', icon: Package, to: '/inventory', module: 'inventory',
    children: [
      { label: 'Produits', to: '/inventory' },
      { label: 'Mouvements', to: '/inventory/movements' },
      { label: 'Entrepôts', to: '/inventory/warehouses' },
    ],
  },
  {
    label: 'Achats', icon: ShoppingCart, to: '/purchasing', module: 'purchasing',
    children: [
      { label: 'Bons de commande', to: '/purchasing' },
      { label: 'Fournisseurs', to: '/purchasing/suppliers' },
    ],
  },
  {
    label: 'RH & Paie', icon: Users, to: '/hr', module: 'hr',
    children: [
      { label: 'Employés', to: '/hr' },
      { label: 'Bulletins de paie', to: '/hr/payroll' },
      { label: 'Congés', to: '/hr/leaves' },
    ],
  },
  {
    label: 'CRM', icon: TrendingUp, to: '/crm', module: 'crm',
    children: [
      { label: 'Prospects', to: '/crm' },
      { label: 'Opportunites', to: '/crm/opportunities' },
    ],
  },
  { label: 'Projets', icon: FolderKanban, to: '/projects', module: 'projects' },
  { label: 'Parametres', icon: Settings, to: '/settings' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { organization, user } = useAuthStore();

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionService.me(),
  });
  const plan = subData?.data?.data?.plan as string | undefined;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Cloisonnement par profil métier : chaque rôle ne voit que ses modules
  const roleItems = navItems.filter((item) => roleHasModule(user?.role, item.module));

  const items: NavItem[] = isSuperAdmin
    ? [...roleItems, { label: 'Fondateur', icon: Shield, to: '/admin' }]
    : roleItems;

  // Un module est verrouillé s'il n'est pas inclus dans la formule (sauf super admin)
  const isLocked = (item: NavItem): boolean =>
    !isSuperAdmin && !!item.module && !planHasModule(plan, item.module);

  const handleLocked = (label: string) => {
    toast(`« ${label} » est disponible avec le plan Professional`, { icon: '🔒' });
    navigate('/settings');
    onClose?.();
  };

  const nav = (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {organization?.logo ? (
              <img src={organization.logo} alt="" className="w-8 h-8 rounded-lg object-contain bg-white" />
            ) : (
              <Logo className="w-8 h-8" />
            )}
            <div>
              <p className="text-sm font-bold leading-none">{organization?.name || 'Naatal'}</p>
              <p className="text-xs text-gray-400">{organization?.currency}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block p-1 rounded hover:bg-gray-700 text-gray-400"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded hover:bg-gray-700 text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded === item.to;
          const locked = isLocked(item);

          if (locked) {
            return (
              <button
                key={item.to}
                onClick={() => handleLocked(item.label)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-800 transition-colors"
                title="Réservé au plan Professional"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <Lock className="w-3.5 h-3.5 text-gray-500" />
                  </>
                )}
              </button>
            );
          }

          return (
            <div key={item.to}>
              {hasChildren ? (
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.to)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800',
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight className={clsx('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
                    </>
                  )}
                </button>
              ) : (
                <NavLink
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive: a }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      a ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800',
                    )
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )}

              {hasChildren && isExpanded && !collapsed && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children!.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end
                      className={({ isActive: a }) =>
                        clsx(
                          'block px-4 py-2 text-xs rounded-lg transition-colors',
                          a ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800',
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        {!collapsed && (
          <p className="text-xs text-gray-500 text-center">Naatal · by Ndaw-Tech</p>
        )}
      </div>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'bg-gray-900 text-white flex flex-col transition-all duration-300',
          'fixed inset-y-0 left-0 z-50 w-72 transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:translate-x-0 lg:min-h-screen',
          collapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
        {nav}
      </aside>
    </>
  );
}
