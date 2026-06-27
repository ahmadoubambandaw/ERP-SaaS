import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { hrService } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

export default function EmployeesPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({ queryKey: ['employees'], queryFn: () => hrService.employees() });
  const employees = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (d: unknown) => hrService.createEmployee(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setShowForm(false); reset(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ressources Humaines</h1>
          <p className="text-gray-500 text-sm">{employees.length} employe(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel employe
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Nouvel employe</h3>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-3 gap-4">
            <div><label className="label">Prenom *</label><input {...register('firstName', { required: true })} className="input" /></div>
            <div><label className="label">Nom *</label><input {...register('lastName', { required: true })} className="input" /></div>
            <div><label className="label">Email</label><input {...register('email')} type="email" className="input" /></div>
            <div><label className="label">Telephone</label><input {...register('phone')} className="input" /></div>
            <div><label className="label">Poste *</label><input {...register('position', { required: true })} className="input" /></div>
            <div><label className="label">Departement</label><input {...register('department')} className="input" /></div>
            <div><label className="label">Date d'embauche *</label><input {...register('startDate', { required: true })} type="date" className="input" /></div>
            <div><label className="label">Salaire de base *</label><input {...register('baseSalary', { required: true, valueAsNumber: true })} type="number" className="input" /></div>
            <div><label className="label">Type contrat</label>
              <select {...register('employmentType')} className="input">
                <option value="FULL_TIME">CDI</option>
                <option value="CONTRACT">CDD</option>
                <option value="PART_TIME">Temps partiel</option>
                <option value="INTERN">Stagiaire</option>
                <option value="CONSULTANT">Consultant</option>
              </select>
            </div>
            <div><label className="label">N Mobile Money</label><input {...register('mobileMoneyNumber')} className="input" placeholder="+221 77..." /></div>
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
            <th className="text-left px-6 py-3 font-medium text-gray-500">Employe</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Poste</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Departement</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Salaire</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Contact</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
              : employees.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400">Aucun employe enregistre</p>
              </td></tr>
              : employees.map((e: Record<string, unknown>) => (
                <tr key={e.id as string} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {(e.firstName as string)[0]}{(e.lastName as string)[0]}
                      </div>
                      <div>
                        <p className="font-medium">{e.firstName as string} {e.lastName as string}</p>
                        <p className="text-xs text-gray-400">{e.employeeNumber as string}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{e.position as string}</td>
                  <td className="px-6 py-4 text-gray-500">{e.department as string || '-'}</td>
                  <td className="px-6 py-4"><span className="badge badge-blue">{e.employmentType as string}</span></td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(e.baseSalary as number, currency)}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{e.phone as string || e.email as string || '-'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
