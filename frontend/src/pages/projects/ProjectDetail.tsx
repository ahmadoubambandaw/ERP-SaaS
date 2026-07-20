import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { projectsService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import StatusBadge from '../../components/ui/StatusBadge';

const taskStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const statusLabels: Record<string, string> = { TODO: 'A faire', IN_PROGRESS: 'En cours', IN_REVIEW: 'En revue', DONE: 'Termine' };
const priorityColors: Record<string, string> = { LOW: 'border-l-gray-300', MEDIUM: 'border-l-blue-400', HIGH: 'border-l-orange-400', URGENT: 'border-l-red-500' };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => projectsService.get(id!) });
  const project = data?.data?.data;

  const createTask = useMutation({
    mutationFn: (d: unknown) => projectsService.createTask(id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); setShowTaskForm(false); setErrorMsg(''); reset(); toast.success('Tâche ajoutée'); },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de la création de la tâche')),
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: unknown }) => projectsService.updateTask(id!, taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
    onError: (err: unknown) => setErrorMsg(getApiError(err)),
  });

  if (isLoading) return <div className="text-center py-12 text-gray-400">Chargement...</div>;
  if (!project) return null;

  const tasks = project.tasks || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600">{project.progress}%</p>
          <p className="text-xs text-gray-400">completion</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Tableau des taches</h2>
        <button onClick={() => setShowTaskForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle tache
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {showTaskForm && (
        <div className="card p-6">
          <form onSubmit={handleSubmit((d) => createTask.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2"><label className="label">Titre *</label><input {...register('title', { required: true })} className="input" /></div>
            <div><label className="label">Priorite</label>
              <select {...register('priority')} className="input">
                <option value="LOW">Faible</option>
                <option value="MEDIUM">Moyen</option>
                <option value="HIGH">Eleve</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div><label className="label">Echeance</label><input {...register('dueDate')} type="date" className="input" /></div>
            <div className="col-span-full flex gap-3 justify-end">
              <button type="button" onClick={() => setShowTaskForm(false)} className="btn-secondary">Annuler</button>
              <button type="submit" className="btn-primary">Ajouter</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {taskStatuses.map((status) => (
          <div key={status}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{statusLabels[status]}</h3>
              <span className="badge badge-gray">{tasks.filter((t: Record<string, unknown>) => t.status === status).length}</span>
            </div>
            <div className="space-y-2 min-h-[100px]">
              {tasks.filter((t: Record<string, unknown>) => t.status === status).map((task: Record<string, unknown>) => (
                <div key={task.id as string} className={`bg-white rounded-lg p-3 border-l-4 shadow-sm ${priorityColors[task.priority as string] || ''}`}>
                  <p className="text-sm font-medium text-gray-900">{task.title as string}</p>
                  {Boolean(task.dueDate) && <p className="text-xs text-gray-400 mt-1">Echeance: {new Date(task.dueDate as string).toLocaleDateString('fr-FR')}</p>}
                  {Boolean(task.assignee) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {String((task.assignee as Record<string, unknown>).firstName ?? '')} {String((task.assignee as Record<string, unknown>).lastName ?? '')}
                    </p>
                  )}
                  <select
                    value={task.status as string}
                    onChange={(e) => updateTask.mutate({ taskId: task.id as string, data: { status: e.target.value } })}
                    className="mt-2 text-xs border border-gray-200 rounded px-1 py-0.5 w-full"
                  >
                    {taskStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
