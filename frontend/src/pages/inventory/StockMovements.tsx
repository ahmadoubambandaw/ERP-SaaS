import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { inventoryService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatDate, formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

const MOVEMENT_TYPES = [
  { value: 'PURCHASE', label: 'Achat', icon: ArrowDown, color: 'text-green-600' },
  { value: 'SALE', label: 'Vente', icon: ArrowUp, color: 'text-red-500' },
  { value: 'RETURN', label: 'Retour', icon: ArrowDown, color: 'text-blue-500' },
  { value: 'ADJUSTMENT', label: 'Ajustement', icon: ArrowDown, color: 'text-yellow-500' },
  { value: 'TRANSFER', label: 'Transfert', icon: ArrowUp, color: 'text-purple-500' },
];

interface MovementFormData {
  productId: string;
  warehouseId: string;
  type: string;
  quantity: number;
  unitCost: number;
  date: string;
  reference: string;
  notes: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  unitOfMeasure: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Movement {
  id: string;
  date: string;
  type: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  product: Product;
  warehouse: Warehouse;
}

export default function StockMovementsPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const qc = useQueryClient();

  const { register, handleSubmit, reset } = useForm<MovementFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'PURCHASE',
      quantity: 1,
    },
  });

  const { data, isLoading } = useQuery({ queryKey: ['movements'], queryFn: () => inventoryService.movements() });
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => inventoryService.products() });
  const { data: warehousesData } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryService.warehouses() });

  const movements: Movement[] = data?.data?.data || [];
  const products: Product[] = productsData?.data?.data || [];
  const warehouses: Warehouse[] = warehousesData?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (d: MovementFormData) => inventoryService.createMovement(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      setShowForm(false);
      setErrorMsg('');
      reset();
      toast.success('Mouvement enregistré');
    },
    onError: (err: unknown) => {
      setErrorMsg(getApiError(err, 'Erreur lors de l\'enregistrement du mouvement'));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mouvements de stock</h1>
          <p className="text-gray-500 text-sm">{movements.length} mouvement(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau mouvement
        </button>
      </div>

      {showForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Enregistrer un mouvement</h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Produit *</label>
              <select {...register('productId', { required: true })} className="input">
                <option value="">-- Choisir --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Entrepôt *</label>
              <select {...register('warehouseId', { required: true })} className="input">
                <option value="">-- Choisir --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type *</label>
              <select {...register('type', { required: true })} className="input">
                {MOVEMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Quantité *</label>
              <input
                {...register('quantity', { required: true, valueAsNumber: true, min: 0.001 })}
                type="number" step="1" min="0" className="input"
              />
            </div>
            <div>
              <label className="label">Coût unitaire</label>
              <input
                {...register('unitCost', { valueAsNumber: true })}
                type="number" step="1" min="0" className="input" placeholder="0"
              />
            </div>
            <div>
              <label className="label">Date *</label>
              <input {...register('date', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Référence</label>
              <input {...register('reference')} className="input" placeholder="Bon de commande, facture..." />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <input {...register('notes')} className="input" placeholder="Notes optionnelles" />
            </div>
            <div className="col-span-full flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); setErrorMsg(''); }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Produit</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Entrepôt</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Quantité</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Coût unit.</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Référence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  Aucun mouvement enregistré
                </td>
              </tr>
            ) : movements.map((m) => {
              const typeInfo = MOVEMENT_TYPES.find((t) => t.value === m.type) || {
                label: m.type, icon: ArrowDown, color: 'text-gray-500',
              };
              const Icon = typeInfo.icon;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">{formatDate(m.date)}</td>
                  <td className="px-6 py-4 font-medium">{m.product?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 font-medium ${typeInfo.color}`}>
                      <Icon className="w-3.5 h-3.5" /> {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{m.warehouse?.name}</td>
                  <td className="px-6 py-4 text-right font-medium">
                    {Number(m.quantity)} {m.product?.unitOfMeasure}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {m.unitCost ? formatCurrency(m.unitCost, currency) : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{m.reference || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
