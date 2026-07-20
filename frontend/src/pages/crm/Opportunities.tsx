import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { crmService, invoicingService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const stageLabels: Record<string, string> = {
  PROSPECTING: 'Prospection', QUALIFICATION: 'Qualification', PROPOSAL: 'Proposition',
  NEGOTIATION: 'Negociation', CLOSED_WON: 'Gagne', CLOSED_LOST: 'Perdu',
};
const stageColors: Record<string, string> = {
  PROSPECTING: 'bg-gray-50', QUALIFICATION: 'bg-blue-50', PROPOSAL: 'bg-yellow-50',
  NEGOTIATION: 'bg-orange-50', CLOSED_WON: 'bg-green-50', CLOSED_LOST: 'bg-red-50',
};

interface OpportunityFormData {
  customerId: string;
  name: string;
  stage: string;
  probability: number;
  value: number;
  expectedCloseDate: string;
  notes: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Opportunity {
  id: string;
  name: string;
  stage: string;
  probability: number;
  value?: number;
  customer?: Customer;
}

export default function OpportunitiesPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OpportunityFormData>({
    defaultValues: { stage: 'PROSPECTING', probability: 10 },
  });

  const { data } = useQuery({ queryKey: ['opportunities'], queryFn: () => crmService.opportunities() });
  const { data: customersData } = useQuery({ queryKey: ['customers'], queryFn: () => invoicingService.customers() });

  const opportunities: Opportunity[] = data?.data?.data || [];
  const customers: Customer[] = customersData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: OpportunityFormData) => crmService.createOpportunity(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      setShowForm(false);
      setErrorMsg('');
      reset();
      toast.success('Opportunité créée');
    },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de la création de l\'opportunité')),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => crmService.updateOpportunity(id, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
    onError: (err: unknown) => setActionError(getApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline commercial</h1>
          <p className="text-gray-500 text-sm">{opportunities.length} opportunité(s)</p>
        </div>
        <button onClick={() => { setShowForm(true); setErrorMsg(''); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle opportunité
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
          <h3 className="font-semibold mb-4">Nouvelle opportunité</h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          {customers.length === 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              Aucun client enregistré. Créez d'abord un client (ou convertissez un prospect).
            </div>
          )}
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nom de l'opportunité *</label>
              <input {...register('name', { required: 'Requis' })} className="input" placeholder="Vente équipement bureau..." />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Client *</label>
              <select {...register('customerId', { required: true })} className="input">
                <option value="">-- Choisir --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.customerId && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div>
              <label className="label">Étape</label>
              <select {...register('stage')} className="input">
                {stages.map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Probabilité (%)</label>
              <input
                {...register('probability', { valueAsNumber: true, min: 0, max: 100 })}
                type="number" min="0" max="100" className="input"
              />
            </div>
            <div>
              <label className="label">Valeur estimée</label>
              <input {...register('value', { valueAsNumber: true, min: 0 })} type="number" min="0" className="input" />
            </div>
            <div>
              <label className="label">Date de clôture prévue</label>
              <input {...register('expectedCloseDate')} type="date" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <input {...register('notes')} className="input" placeholder="Optionnel" />
            </div>
            <div className="col-span-full flex justify-end gap-3">
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

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
        {stages.map((stage) => {
          const stageOpps = opportunities.filter((o) => o.stage === stage);
          const value = stageOpps.reduce((s, o) => s + Number(o.value || 0), 0);
          return (
            <div key={stage} className="min-w-[180px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{stageLabels[stage]}</h3>
                <span className="badge badge-gray">{stageOpps.length}</span>
              </div>
              <div className={`rounded-xl p-2 min-h-[200px] space-y-2 ${stageColors[stage]}`}>
                {stageOpps.map((opp) => (
                  <div key={opp.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="font-medium text-sm text-gray-900">{opp.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opp.customer?.name || ''}</p>
                    {Boolean(opp.value) && (
                      <p className="text-xs font-medium text-primary-600 mt-1">
                        {formatCurrency(Number(opp.value), currency)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{opp.probability}% probabilité</p>
                    <select
                      value={opp.stage}
                      onChange={(e) => stageMutation.mutate({ id: opp.id, stage: e.target.value })}
                      className="mt-2 text-xs border border-gray-200 rounded px-1 py-0.5 w-full"
                    >
                      {stages.map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {value > 0 && <p className="text-xs text-gray-500 mt-1 text-right">{formatCurrency(value, currency)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
