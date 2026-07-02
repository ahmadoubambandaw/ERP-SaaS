import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { hrService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  startDate: string;
  baseSalary: number;
  employmentType: string;
  mobileMoneyNumber: string;
}

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  employmentType: string;
  baseSalary: number;
  startDate: string;
}

const CONTRACT_LABELS: Record<string, string> = {
  FULL_TIME: 'CDI',
  CONTRACT: 'CDD',
  PART_TIME: 'Temps partiel',
  INTERN: 'Stagiaire',
  CONSULTANT: 'Consultant',
};

export default function EmployeesPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    defaultValues: { employmentType: 'FULL_TIME' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrService.employees(),
  });
  const employees: Employee[] = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (d: EmployeeFormData) => hrService.createEmployee(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setShowForm(false);
      setErrorMsg('');
      reset();
    },
    onError: (err: unknown) => {
      setErrorMsg(getApiError(err, 'Erreur lors de l\'enregistrement'));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ressources Humaines</h1>
          <p className="text-gray-500 text-sm">{employees.length} employé(s)</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setErrorMsg(''); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nouvel employé
        </button>
      </div>

      {showForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Nouvel employé</h3>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="label">Prénom *</label>
              <input
                {...register('firstName', { required: 'Requis' })}
                className="input"
                placeholder="Amadou"
              />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Nom *</label>
              <input
                {...register('lastName', { required: 'Requis' })}
                className="input"
                placeholder="Diallo"
              />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="email@entreprise.com"
              />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                {...register('phone')}
                className="input"
                placeholder="+221 77 000 00 00"
              />
            </div>
            <div>
              <label className="label">Poste *</label>
              <input
                {...register('position', { required: 'Requis' })}
                className="input"
                placeholder="Comptable, Vendeur..."
              />
              {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position.message}</p>}
            </div>
            <div>
              <label className="label">Département</label>
              <input
                {...register('department')}
                className="input"
                placeholder="Finance, Commercial..."
              />
            </div>
            <div>
              <label className="label">Date d'embauche *</label>
              <input
                {...register('startDate', { required: 'Requis' })}
                type="date"
                className="input"
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="label">Salaire de base *</label>
              <input
                {...register('baseSalary', {
                  required: 'Requis',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Doit être positif' },
                })}
                type="number"
                step="1000"
                min="0"
                className="input"
                placeholder="150000"
              />
              {errors.baseSalary && <p className="text-xs text-red-500 mt-1">{errors.baseSalary.message}</p>}
            </div>
            <div>
              <label className="label">Type de contrat</label>
              <select {...register('employmentType')} className="input">
                <option value="FULL_TIME">CDI</option>
                <option value="CONTRACT">CDD</option>
                <option value="PART_TIME">Temps partiel</option>
                <option value="INTERN">Stagiaire</option>
                <option value="CONSULTANT">Consultant</option>
              </select>
            </div>
            <div>
              <label className="label">N° Mobile Money</label>
              <input
                {...register('mobileMoneyNumber')}
                className="input"
                placeholder="+221 77..."
              />
            </div>
            <div className="col-span-full flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); setErrorMsg(''); }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
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
              <th className="text-left px-6 py-3 font-medium text-gray-500">Poste</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Département</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Contrat</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Salaire</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Depuis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 mb-4">Aucun employé enregistré</p>
                  <button onClick={() => setShowForm(true)} className="btn-secondary text-sm">
                    Ajouter le premier employé
                  </button>
                </td>
              </tr>
            ) : employees.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {e.firstName[0]}{e.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium">{e.firstName} {e.lastName}</p>
                      <p className="text-xs text-gray-400">{e.employeeNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{e.position}</td>
                <td className="px-6 py-4 text-gray-500">{e.department || '-'}</td>
                <td className="px-6 py-4">
                  <span className="badge badge-blue">
                    {CONTRACT_LABELS[e.employmentType] || e.employmentType}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {formatCurrency(e.baseSalary, currency)}
                </td>
                <td className="px-6 py-4 text-gray-500 text-xs">
                  {formatDate(e.startDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
