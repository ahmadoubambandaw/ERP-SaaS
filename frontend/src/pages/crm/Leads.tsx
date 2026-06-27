import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { crmService } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';

export default function LeadsPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({ queryKey: ['leads'], queryFn: () => crmService.leads() });
  const leads = data?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: unknown) => crmService.createLead(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setShowForm(false); reset(); },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => crmService.convertLead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM - Prospects</h1>
          <p className="text-gray-500 text-sm">{leads.length} prospect(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau prospect
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Nouveau prospect</h3>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="grid grid-cols-3 gap-4">
            <div><label className="label">Prenom *</label><input {...register('firstName', { required: true })} className="input" /></div>
            <div><label className="label">Nom *</label><input {...register('lastName', { required: true })} className="input" /></div>
            <div><label className="label">Email</label><input {...register('email')} type="email" className="input" /></div>
            <div><label className="label">Telephone</label><input {...register('phone')} className="input" /></div>
            <div><label className="label">Entreprise</label><input {...register('company')} className="input" /></div>
            <div><label className="label">Source</label>
              <select {...register('source')} className="input">
                <option value="">-</option>
                <option value="WEBSITE">Site web</option>
                <option value="REFERRAL">Recommandation</option>
                <option value="SOCIAL_MEDIA">Reseaux sociaux</option>
                <option value="COLD_CALL">Prospection telephonique</option>
                <option value="EVENT">Evenement</option>
              </select>
            </div>
            <div><label className="label">Valeur estimee</label><input {...register('estimatedValue', { valueAsNumber: true })} type="number" className="input" /></div>
            <div className="col-span-3 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
              <button type="submit" className="btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left px-6 py-3 font-medium text-gray-500">Prospect</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Entreprise</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Source</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Valeur</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
            <th className="px-6 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
              : leads.map((l: Record<string, unknown>) => (
                <tr key={l.id as string} className="table-row">
                  <td className="px-6 py-4">
                    <p className="font-medium">{l.firstName as string} {l.lastName as string}</p>
                    <p className="text-xs text-gray-400">{l.email as string || l.phone as string}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{l.company as string || '-'}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{l.source as string || '-'}</td>
                  <td className="px-6 py-4 text-right">{l.estimatedValue ? formatCurrency(l.estimatedValue as number, currency) : '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.status as string} /></td>
                  <td className="px-6 py-4">
                    {l.status !== 'CONVERTED' && (
                      <button onClick={() => convertMutation.mutate(l.id as string)} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                        <UserPlus className="w-3.5 h-3.5" /> Convertir
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
