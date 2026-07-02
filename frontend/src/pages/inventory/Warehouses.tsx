import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Warehouse, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { inventoryService } from '../../services/api';

interface WarehouseFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
}

interface StockLevel {
  quantity: number;
}

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  isActive?: boolean;
  stockLevels?: StockLevel[];
}

export default function WarehousesPage() {
  const [showForm, setShowForm] = useState(false);
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
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      setShowForm(false);
      reset();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entrepôts</h1>
          <p className="text-gray-500 text-sm">{warehouses.length} entrepôt(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel entrepôt
        </button>
      </div>

      {showForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Nouvel entrepôt</h3>
          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="label">Code *</label>
              <input
                {...register('code', { required: true })}
                className="input"
                placeholder="DEPOT-A"
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Nom *</label>
              <input
                {...register('name', { required: true })}
                className="input"
                placeholder="Dépôt principal"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Adresse</label>
              <input {...register('address')} className="input" placeholder="Adresse complète" />
            </div>
            <div>
              <label className="label">Ville</label>
              <input {...register('city')} className="input" placeholder="Dakar" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input {...register('phone')} className="input" placeholder="+221 77..." />
            </div>
            <div className="col-span-full flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                Enregistrer
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
                  <div>
                    <h3 className="font-semibold text-gray-900">{w.name}</h3>
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {w.code}
                    </span>
                  </div>
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Warehouse className="w-5 h-5 text-primary-500" />
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {(w.address || w.city) && (
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {[w.address, w.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {w.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {w.phone}
                    </p>
                  )}
                </div>

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
