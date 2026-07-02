import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Calendar, Clock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { hrService } from '../../services/api';
import { formatDate } from '../../utils/format';
import StatusBadge from '../../components/ui/StatusBadge';

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Congé annuel' },
  { value: 'SICK', label: 'Congé maladie' },
  { value: 'MATERNITY', label: 'Congé maternité' },
  { value: 'PATERNITY', label: 'Congé paternité' },
  { value: 'UNPAID', label: 'Sans solde' },
  { value: 'OTHER', label: 'Autre' },
];

interface LeaveFormData {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
}

interface Leave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  daysCount?: number;
  reason?: string;
  status: string;
  employee: Employee;
}

export default function LeavesPage() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeaveFormData>({
    defaultValues: { type: 'ANNUAL' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => hrService.leaves(),
  });
  const { data: empData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrService.employees(),
  });

  const leaves: Leave[] = data?.data?.data || [];
  const employees: Employee[] = empData?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (d: LeaveFormData) => hrService.createLeave(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      setShowForm(false);
      reset();
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrService.approveLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const pending = leaves.filter((l) => l.status === 'PENDING');
  const approved = leaves.filter((l) => l.status === 'APPROVED');
  const rejected = leaves.filter((l) => l.status === 'REJECTED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des congés</h1>
          <p className="text-gray-500 text-sm">{leaves.length} demande(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            <p className="text-sm text-gray-500">En attente</p>
          </div>
          <p className="text-2xl font-bold text-orange-500">{pending.length}</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Check className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-500">Approuvés</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{approved.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Refusés</p>
          <p className="text-2xl font-bold text-red-500">{rejected.length}</p>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            Nouvelle demande de congé
          </h3>
          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="label">Employé *</label>
              <select {...register('employeeId', { required: true })} className="input">
                <option value="">-- Choisir un employé --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
              {errors.employeeId && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div>
              <label className="label">Type de congé *</label>
              <select {...register('type', { required: true })} className="input">
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date de début *</label>
              <input
                {...register('startDate', { required: true })}
                type="date"
                className="input"
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div>
              <label className="label">Date de fin *</label>
              <input
                {...register('endDate', { required: true })}
                type="date"
                className="input"
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">Requis</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Motif</label>
              <input
                {...register('reason')}
                className="input"
                placeholder="Motif de la demande (optionnel)..."
              />
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
                {mutation.isPending ? 'Soumission...' : 'Soumettre la demande'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Employé</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Période</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Jours</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
              <th className="px-6 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 mb-4">Aucune demande de congé</p>
                  <button onClick={() => setShowForm(true)} className="btn-secondary text-sm">
                    Soumettre une demande
                  </button>
                </td>
              </tr>
            ) : leaves.map((l) => {
              const typeLabel = LEAVE_TYPES.find((t) => t.value === l.type)?.label || l.type;
              return (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">
                      {l.employee?.firstName} {l.employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{l.employee?.position}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{typeLabel}</td>
                  <td className="px-6 py-4 text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(l.startDate)} → {formatDate(l.endDate)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {l.daysCount ?? '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-6 py-4">
                    {l.status === 'PENDING' && (
                      <button
                        onClick={() => approveMutation.mutate(l.id)}
                        title="Approuver"
                        className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
