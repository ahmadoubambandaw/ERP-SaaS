import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: { value: number; label: string };
}

const colors = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export default function KpiCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }: KpiCardProps) {
  // Les montants formatés utilisent des espaces insécables (U+202F / U+00A0) qui
  // empêchent le retour à la ligne : on les rend sécables pour que la valeur reste
  // toujours dans la carte au lieu de déborder.
  const display = typeof value === 'string' ? value.replace(/[\u202F\u00A0\u2009\u2007]/g, ' ') : value;
  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 leading-tight break-words [overflow-wrap:anywhere]">
            {display}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={clsx('text-xs mt-2 font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={clsx('w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
