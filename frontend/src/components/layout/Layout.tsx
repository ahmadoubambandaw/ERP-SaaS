import { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { subscriptionService } from '../../services/api';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useUiStore, applyDarkClass } from '../../store/ui.store';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const dark = useUiStore((s) => s.dark);

  // Mode sombre : appliqué au <html> tant qu'on est dans l'app, retiré en sortant
  useEffect(() => {
    applyDarkClass(dark);
    return () => applyDarkClass(false);
  }, [dark]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionService.me(),
    refetchInterval: 1000 * 60 * 10,
  });
  const sub = subData?.data?.data;
  const showExpiryWarning = sub && !sub.unlimited && sub.active && (sub.daysLeft ?? 99) <= 7;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} />
        {showExpiryWarning && (
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-b border-orange-200 text-sm text-orange-700 hover:bg-orange-100"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Votre abonnement expire dans {sub.daysLeft} jour{sub.daysLeft > 1 ? 's' : ''} — cliquez ici pour renouveler
          </Link>
        )}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
