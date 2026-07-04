import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Package, Users, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

const tabs = [
  { label: 'Accueil', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Factures', icon: FileText, to: '/invoicing' },
  { label: 'Stocks', icon: Package, to: '/inventory' },
  { label: 'RH', icon: Users, to: '/hr' },
  { label: 'CRM', icon: TrendingUp, to: '/crm' },
];

export default function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/dashboard'}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600',
              )
            }
          >
            <Icon className="w-5 h-5" />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
