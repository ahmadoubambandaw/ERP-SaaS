import { useQuery } from '@tanstack/react-query';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { inventoryService } from '../../services/api';
import { formatDate, formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

const typeLabels: Record<string, { label: string; icon: typeof ArrowUp; color: string }> = {
  PURCHASE: { label: 'Achat', icon: ArrowDown, color: 'text-green-600' },
  SALE: { label: 'Vente', icon: ArrowUp, color: 'text-red-500' },
  RETURN: { label: 'Retour', icon: ArrowDown, color: 'text-blue-500' },
  ADJUSTMENT: { label: 'Ajustement', icon: ArrowDown, color: 'text-yellow-500' },
  TRANSFER: { label: 'Transfert', icon: ArrowUp, color: 'text-purple-500' },
};

export default function StockMovementsPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const { data, isLoading } = useQuery({ queryKey: ['movements'], queryFn: () => inventoryService.movements() });
  const movements = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mouvements de stock</h1>
      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Produit</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Entrepot</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Quantite</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Cout</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Reference</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
              : movements.map((m: Record<string, unknown>) => {
                const typeInfo = typeLabels[m.type as string] || { label: m.type, icon: ArrowDown, color: 'text-gray-500' };
                const Icon = typeInfo.icon;
                return (
                  <tr key={m.id as string} className="table-row">
                    <td className="px-6 py-4 text-gray-500">{formatDate(m.date as string)}</td>
                    <td className="px-6 py-4 font-medium">{(m.product as Record<string, unknown>)?.name as string}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 font-medium ${typeInfo.color}`}>
                        <Icon className="w-3.5 h-3.5" /> {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{(m.warehouse as Record<string, unknown>)?.name as string}</td>
                    <td className="px-6 py-4 text-right font-medium">{Number(m.quantity)} {(m.product as Record<string, unknown>)?.unitOfMeasure as string}</td>
                    <td className="px-6 py-4 text-right">{m.unitCost ? formatCurrency(m.unitCost as number, currency) : '-'}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{m.reference as string || '-'}</td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
