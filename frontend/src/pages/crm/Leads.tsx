import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserPlus, Loader2, X, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { crmService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

const LEAD_STATUSES = [
  { value: 'NEW', label: 'Nouveau' },
  { value: 'CONTACTED', label: 'Contacté' },
  { value: 'QUALIFIED', label: 'Qualifié' },
  { value: 'UNQUALIFIED', label: 'Non qualifié' },
];

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Site web', REFERRAL: 'Recommandation', SOCIAL_MEDIA: 'Réseaux sociaux',
  COLD_CALL: 'Prospection tél.', EMAIL: 'Email', EVENT: 'Événement', OTHER: 'Autre',
};

interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  estimatedValue: number;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status: string;
  estimatedValue?: number;
}

export default function LeadsPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeadFormData>();

  const { data, isLoading } = useQuery({ queryKey: ['leads'], queryFn: () => crmService.leads() });
  const leads: Lead[] = data?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: LeadFormData) => crmService.createLead(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      setShowForm(false);
      setErrorMsg('');
      reset();
    },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de l\'enregistrement du prospect')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => crmService.updateLead(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
    onError: (err: unknown) => setActionError(getApiError(err)),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => crmService.convertLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: unknown) => setActionError(getApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM - Prospects</h1>
          <p className="text-gray-500 text-sm">{leads.length} prospect(s)</p>
        </div>
        <button onClick={() => { setShowForm(true); setErrorMsg(''); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau prospect
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
          <h3 className="font-semibold mb-4">Nouveau prospect</h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Prénom *</label>
              <input {...register('firstName', { required: 'Requis' })} className="input" />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Nom *</label>
              <input {...register('lastName', { required: 'Requis' })} className="input" />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
            </div>
            <div><label className="label">Email</label><input {...register('email')} type="email" className="input" /></div>
            <div><label className="label">Téléphone</label><input {...register('phone')} className="input" /></div>
            <div><label className="label">Entreprise</label><input {...register('company')} className="input" /></div>
            <div>
              <label className="label">Source</label>
              <select {...register('source')} className="input">
                <option value="">-</option>
                {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Valeur estimée</label>
              <input {...register('estimatedValue', { valueAsNumber: true, min: 0 })} type="number" min="0" className="input" />
            </div>
            <div className="col-span-full flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); reset(); setErrorMsg(''); }} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary flex items-center gap-2">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Enregistrer
              </button>
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
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 mb-4">Aucun prospect</p>
                  <button onClick={() => setShowForm(true)} className="btn-secondary text-sm">
                    Ajouter le premier prospect
                  </button>
                </td>
              </tr>
            ) : leads.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium">{l.firstName} {l.lastName}</p>
                  <p className="text-xs text-gray-400">{l.email || l.phone}</p>
                </td>
                <td className="px-6 py-4 text-gray-500">{l.company || '-'}</td>
                <td className="px-6 py-4 text-gray-500 text-xs">{l.source ? SOURCE_LABELS[l.source] || l.source : '-'}</td>
                <td className="px-6 py-4 text-right">
                  {l.estimatedValue ? formatCurrency(Number(l.estimatedValue), currency) : '-'}
                </td>
                <td className="px-6 py-4">
                  {l.status === 'CONVERTED' ? (
                    <span className="badge badge-green">Converti</span>
                  ) : (
                    <select
                      value={l.status}
                      onChange={(e) => statusMutation.mutate({ id: l.id, status: e.target.value })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                    >
                      {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-6 py-4">
                  {l.status !== 'CONVERTED' && (
                    <button
                      onClick={() => convertMutation.mutate(l.id)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Convertir en client
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
