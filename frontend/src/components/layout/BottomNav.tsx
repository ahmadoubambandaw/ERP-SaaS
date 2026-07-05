import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Package, Users, TrendingUp, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/auth.store';
import { roleHasModule } from '../../utils/roles';

const tabs = [
  { label: 'Accueil', icon: LayoutDashboard, to: '/dashboard', module: 'dashboard' },
  { label: 'Factures', icon: FileText, to: '/invoicing', module: 'invoicing' },
  { label: 'Stocks', icon: Package, to: '/inventory', module: 'inventory' },
  { label: 'RH', icon: Users, to: '/hr', module: 'hr' },
  { label: 'CRM', icon: TrendingUp, to: '/crm', module: 'crm' },
];

export default function BottomNav() {
  const { user } = useAuthStore();
  // Chaque profil ne voit que ses modules ; on complète avec Réglages si peu d'onglets
  const visible = tabs.filter((t) => roleHasModule(user?.role, t.module));
  const items = visible.length < 3
    ? [...visible, { label: 'Réglages', icon: Settings, to: '/settings', module: undefined as string | undefined }]
    : visible;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((tab) => {
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
