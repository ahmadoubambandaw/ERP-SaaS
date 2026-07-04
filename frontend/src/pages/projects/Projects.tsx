import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { projectsService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ProjectsPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => projectsService.list() });
  const projects = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (d: unknown) => projectsService.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowForm(false); setErrorMsg(''); reset(); },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de la création du projet')),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
          <p className="text-gray-500 text-sm">{projects.length} projet(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau projet
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Nouveau projet</h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2"><label className="label">Nom *</label><input {...register('name', { required: true })} className="input" /></div>
            <div><label className="label">Statut</label>
              <select {...register('status')} className="input">
                <option value="PLANNING">Planification</option>
                <option value="IN_PROGRESS">En cours</option>
              </select>
            </div>
            <div><label className="label">Date debut</label><input {...register('startDate')} type="date" className="input" /></div>
            <div><label className="label">Date fin</label><input {...register('endDate')} type="date" className="input" /></div>
            <div><label className="label">Budget</label><input {...register('budget', { valueAsNumber: true })} type="number" className="input" /></div>
            <div className="col-span-full"><label className="label">Description</label><textarea {...register('description')} className="input h-20 resize-none" /></div>
            <div className="col-span-full flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setErrorMsg(''); reset(); }} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <p className="text-gray-400 col-span-3 text-center py-12">Chargement...</p>
          : projects.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Aucun projet</p>
            </div>
          ) : projects.map((p: Record<string, unknown>) => (
            <Link key={p.id as string} to={`/projects/${p.id}`} className="card p-6 hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{p.name as string}</h3>
                <StatusBadge status={p.status as string} />
              </div>
              {Boolean(p.description) && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description as string}</p>}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progression</span><span>{p.progress as number}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{(p._count as Record<string, number>)?.tasks || 0} taches</span>
                {Boolean(p.budget) && <span>{formatCurrency(p.budget as number, currency)}</span>}
                {Boolean(p.endDate) && <span>Fin: {formatDate(p.endDate as string)}</span>}
              </div>
            </Link>
          ))
        }
      </div>
    </div>
  );
}
