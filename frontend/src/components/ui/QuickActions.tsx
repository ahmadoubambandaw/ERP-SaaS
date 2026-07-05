import { Link } from 'react-router-dom';
import { Receipt, Package, Users, Wallet } from 'lucide-react';

/**
 * Accès rapide en gros boutons visuels (icône + couleur + 1 mot).
 * Pensé pour les commerçants qui lisent peu : cible tactile large,
 * couleur mémorisable, texte minimal.
 */
const ACTIONS = [
  { to: '/invoicing/new', label: 'Vendre', hint: 'Nouvelle facture', icon: Receipt, from: 'from-emerald-500', to2: 'to-emerald-600' },
  { to: '/invoicing', label: 'Factures', hint: 'Qui doit payer', icon: Wallet, from: 'from-blue-500', to2: 'to-blue-600' },
  { to: '/inventory', label: 'Produits', hint: 'Mon stock', icon: Package, from: 'from-violet-500', to2: 'to-violet-600' },
  { to: '/invoicing/customers', label: 'Clients', hint: 'Mes clients', icon: Users, from: 'from-amber-500', to2: 'to-amber-600' },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {ACTIONS.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className={`bg-gradient-to-br ${a.from} ${a.to2} rounded-2xl p-4 sm:p-5 text-white shadow-md active:scale-[0.97] transition-transform flex flex-col items-center justify-center text-center gap-2 min-h-[112px]`}
        >
          <a.icon className="w-9 h-9 sm:w-10 sm:h-10" strokeWidth={2.2} />
          <span className="text-lg font-bold leading-none">{a.label}</span>
          <span className="text-[11px] text-white/80 leading-none">{a.hint}</span>
        </Link>
      ))}
    </div>
  );
}
