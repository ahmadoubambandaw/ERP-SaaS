import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ShoppingCart, Check, PackageCheck, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { inventoryService, invoicingService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';

interface POLine {
  productId: string;
  quantity: number;
  unitCost: number;
}

interface POFormData {
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  lines: POLine[];
}

interface Product {
  id: string;
  name: string;
  code: string;
  costPrice?: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  number: string;
  status: string;
  orderDate: string;
  expectedDate?: string;
  total: number;
  supplier: Supplier;
  lines: Array<{ id: string; quantity: number; unitCost: number; total: number; product: Product }>;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  CONFIRMED: 'Confirmé',
  RECEIVED: 'Reçu',
  CANCELLED: 'Annulé',
};

export default function PurchaseOrdersPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const qc = useQueryClient();

  const { register, handleSubmit, reset, control, watch } = useForm<POFormData>({
    defaultValues: {
      orderDate: new Date().toISOString().split('T')[0],
      lines: [{ productId: '', quantity: 1, unitCost: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => inventoryService.purchaseOrders(),
  });
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => invoicingService.suppliers(),
  });
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => inventoryService.products(),
  });

  const orders: PurchaseOrder[] = data?.data?.data || [];
  const suppliers: Supplier[] = suppliersData?.data?.data || [];
  const products: Product[] = productsData?.data?.data || [];

  const watchedLines = watch('lines');
  const formTotal = (watchedLines || []).reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0,
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['movements'] });
    qc.invalidateQueries({ queryKey: ['low-stock'] });
  };

  const createMutation = useMutation({
    mutationFn: (d: POFormData) => inventoryService.createPurchaseOrder(d),
    onSuccess: () => {
      invalidateAll();
      setShowForm(false);
      setErrorMsg('');
      reset();
    },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de la création du bon de commande')),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => inventoryService.confirmPurchaseOrder(id),
    onSuccess: invalidateAll,
    onError: (err: unknown) => setActionError(getApiError(err)),
  });
  const receiveMutation = useMutation({
    mutationFn: (id: string) => inventoryService.receivePurchaseOrder(id),
    onSuccess: invalidateAll,
    onError: (err: unknown) => setActionError(getApiError(err)),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => inventoryService.cancelPurchaseOrder(id),
    onSuccess: invalidateAll,
    onError: (err: unknown) => setActionError(getApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de commande</h1>
          <p className="text-gray-500 text-sm">{orders.length} commande(s) fournisseur</p>
        </div>
        <button onClick={() => { setShowForm(true); setErrorMsg(''); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau bon de commande
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {showForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-500" /> Nouveau bon de commande
          </h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          {suppliers.length === 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              Aucun fournisseur enregistré. Créez d'abord un fournisseur dans la page Fournisseurs.
            </div>
          )}
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Fournisseur *</label>
                <select {...register('supplierId', { required: true })} className="input">
                  <option value="">-- Choisir --</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date de commande *</label>
                <input {...register('orderDate', { required: true })} type="date" className="input" />
              </div>
              <div>
                <label className="label">Date de livraison prévue</label>
                <input {...register('expectedDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input {...register('notes')} className="input" placeholder="Optionnel" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Lignes de commande *</label>
                <button
                  type="button"
                  onClick={() => append({ productId: '', quantity: 1, unitCost: 0 })}
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <select {...register(`lines.${i}.productId`, { required: true })} className="input flex-1">
                      <option value="">-- Produit --</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                    <input
                      {...register(`lines.${i}.quantity`, { required: true, valueAsNumber: true, min: 0.001 })}
                      type="number" step="1" min="0" placeholder="Qté" className="input w-24"
                    />
                    <input
                      {...register(`lines.${i}.unitCost`, { required: true, valueAsNumber: true, min: 0 })}
                      type="number" step="1" min="0" placeholder="Coût unit." className="input w-32"
                    />
                    <button
                      type="button"
                      onClick={() => fields.length > 1 && remove(i)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <p className="font-semibold">
                Total : <span className="text-primary-600">{formatCurrency(formTotal, currency)}</span>
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowForm(false); reset(); setErrorMsg(''); }} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex items-center gap-2">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Créer le bon de commande
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">N°</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Fournisseur</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Articles</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Total</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400">Aucun bon de commande</p>
                </td>
              </tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs">{o.number}</td>
                <td className="px-6 py-4 font-medium">{o.supplier?.name}</td>
                <td className="px-6 py-4 text-gray-500">{formatDate(o.orderDate)}</td>
                <td className="px-6 py-4 text-gray-500">
                  {o.lines.length} article(s)
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">
                    {o.lines.map((l) => l.product?.name).join(', ')}
                  </p>
                </td>
                <td className="px-6 py-4 text-right font-medium">{formatCurrency(Number(o.total), currency)}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={o.status} label={STATUS_LABELS[o.status]} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1">
                    {o.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => confirmMutation.mutate(o.id)}
                          title="Confirmer"
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => cancelMutation.mutate(o.id)}
                          title="Annuler"
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {o.status === 'CONFIRMED' && (
                      <button
                        onClick={() => receiveMutation.mutate(o.id)}
                        title="Réceptionner (met à jour le stock)"
                        className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors flex items-center gap-1 text-xs font-medium"
                      >
                        <PackageCheck className="w-4 h-4" /> Réceptionner
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
