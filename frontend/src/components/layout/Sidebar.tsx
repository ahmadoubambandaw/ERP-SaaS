import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users, Briefcase, BarChart2,
  FolderKanban, Settings, ChevronLeft, ChevronRight, Building2, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { clsx } from 'clsx';

const navItems = [
  { label: 'Tableau de bord', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Comptabilite', icon: BarChart2, to: '/accounting' },
  {
    label: 'Facturation', icon: FileText, to: '/invoicing',
    children: [
      { label: 'Factures & Devis', to: '/invoicing' },
      { label: 'Clients', to: '/invoicing/customers' },
    ],
  },
  {
    label: 'Stocks', icon: Package, to: '/inventory',
    children: [
      { label: 'Produits', to: '/inventory' },
      { label: 'Mouvements', to: '/inventory/movements' },
      { label: 'Entrepôts', to: '/inventory/warehouses' },
    ],
  },
  {
    label: 'RH & Paie', icon: Users, to: '/hr',
    children: [
      { label: 'Employés', to: '/hr' },
      { label: 'Bulletins de paie', to: '/hr/payroll' },
      { label: 'Congés', to: '/hr/leaves' },
    ],
  },
  {
    label: 'CRM', icon: TrendingUp, to: '/crm',
    children: [
      { label: 'Prospects', to: '/crm' },
      { label: 'Opportunites', to: '/crm/opportunities' },
    ],
  },
  { label: 'Projets', icon: FolderKanban, to: '/projects' },
  { label: 'Parametres', icon: Settings, to: '/settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const location = useLocation();
  const { organization } = useAuthStore();

  return (
    <aside
      className={clsx(
        'bg-gray-900 text-white flex flex-col transition-all duration-300 min-h-screen',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{organization?.name || 'ERP SaaS'}</p>
              <p className="text-xs text-gray-400">{organization?.currency}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-700 text-gray-400"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded === item.to;

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
          <p className="text-xs text-gray-500 text-center">ERP SaaS v1.0</p>
        )}
      </div>
    </aside>
  );
}
