import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Warehouse, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { inventoryService } from '../../services/api';
import { getApiError } from '../../utils/apiError';

interface WarehouseFormData {
  name: string;
  address: string;
}

interface StockLevel {
  quantity: number;
}

interface WarehouseItem {
  id: string;
  name: string;
  address?: string;
  isActive?: boolean;
  stockLevels?: StockLevel[];
}

export default function WarehousesPage() {
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WarehouseFormData>();

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryService.warehouses(),
  });
  const warehouses: WarehouseItem[] = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (d: WarehouseFormData) => inventoryService.createWarehouse(d),
    onSuccess: () => {
      toast.success('Entrepôt créé');
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      setShowForm(false);
      setErrorMsg('');
      reset();
    },
    onError: (err: unknown) => {
      setErrorMsg(getApiError(err, 'Erreur lors de la création de l\'entrepôt'));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entrepôts</h1>
          <p className="text-gray-500 text-sm">{warehouses.length} entrepôt(s)</p>
        </div>
        <button onClick={() => { setShowForm(true); setErrorMsg(''); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel entrepôt
        </button>
      </div>

      {showForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Nouvel entrepôt</h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="label">Nom *</label>
              <input
                {...register('name', { required: 'Le nom est requis' })}
                className="input"
                placeholder="Dépôt principal"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Adresse</label>
              <input {...register('address')} className="input" placeholder="Adresse complète" />
            </div>
            <div className="col-span-full flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); setErrorMsg(''); }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : warehouses.length === 0 ? (
        <div className="card p-12 text-center">
          <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 mb-4">Aucun entrepôt configuré</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Créer le premier entrepôt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => {
            const totalRefs = w.stockLevels?.length ?? 0;
            const totalUnits = w.stockLevels?.reduce((s, l) => s + Number(l.quantity), 0) ?? 0;
            return (
              <div key={w.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{w.name}</h3>
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Warehouse className="w-5 h-5 text-primary-500" />
                  </div>
                </div>

                {w.address && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-3">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {w.address}
                  </p>
                )}

                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-400">Références</p>
                    <p className="text-xl font-bold text-gray-900">{totalRefs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Unités total</p>
                    <p className="text-xl font-bold text-primary-600">{totalUnits.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
