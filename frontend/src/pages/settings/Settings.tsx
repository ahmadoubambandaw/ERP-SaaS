import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, User, Users, Plus, Loader2, UserX, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usersService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { useAuthStore } from '../../store/auth.store';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  ACCOUNTANT: 'Comptable',
  SALES: 'Commercial',
  INVENTORY_MANAGER: 'Gestionnaire de stock',
  HR_MANAGER: 'Responsable RH',
  PROJECT_MANAGER: 'Chef de projet',
  EMPLOYEE: 'Employé',
};

const ASSIGNABLE_ROLES = ['ADMIN', 'ACCOUNTANT', 'SALES', 'INVENTORY_MANAGER', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'];

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user, organization } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    defaultValues: { role: 'EMPLOYEE' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.list(),
    enabled: isAdmin,
  });
  const users: OrgUser[] = data?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: UserFormData) => usersService.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setErrorMsg('');
      reset();
    },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de la création de l\'utilisateur')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => usersService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: unknown) => setErrorMsg(getApiError(err)),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Organisation</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Nom</p><p className="font-medium mt-1">{organization?.name}</p></div>
          <div><p className="text-gray-500">Identifiant</p><p className="font-mono font-medium mt-1">{organization?.slug}</p></div>
          <div><p className="text-gray-500">Pays</p><p className="font-medium mt-1">{organization?.country}</p></div>
          <div><p className="text-gray-500">Devise</p><p className="font-medium mt-1">{organization?.currency}</p></div>
          <div><p className="text-gray-500">Langue</p><p className="font-medium mt-1">{organization?.language === 'fr' ? 'Français' : 'English'}</p></div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Mon profil</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Prénom</p><p className="font-medium mt-1">{user?.firstName}</p></div>
          <div><p className="text-gray-500">Nom</p><p className="font-medium mt-1">{user?.lastName}</p></div>
          <div><p className="text-gray-500">Email</p><p className="font-medium mt-1">{user?.email}</p></div>
          <div><p className="text-gray-500">Rôle</p>
            <span className="badge badge-blue mt-1">{ROLE_LABELS[user?.role || ''] || user?.role}</span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold text-gray-900">Équipe ({users.length})</h2>
            </div>
            <button onClick={() => { setShowForm(!showForm); setErrorMsg(''); }} className="btn-secondary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Inviter un utilisateur
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {showForm && (
            <form
              onSubmit={handleSubmit((d) => createMutation.mutate(d))}
              className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl"
            >
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
              <div>
                <label className="label">Email *</label>
                <input {...register('email', { required: 'Requis' })} type="email" className="input" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Mot de passe * (min. 8 caractères)</label>
                <input
                  {...register('password', { required: 'Requis', minLength: { value: 8, message: 'Minimum 8 caractères' } })}
                  type="password" className="input"
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="label">Rôle</label>
                <select {...register('role')} className="input">
                  {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex items-end justify-end gap-3">
                <button type="button" onClick={() => { setShowForm(false); reset(); setErrorMsg(''); }} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex items-center gap-2">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-gray-50">
            {isLoading ? (
              <p className="text-gray-400 text-sm py-4 text-center">Chargement...</p>
            ) : users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {u.firstName[0]}{u.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${!u.isActive ? 'text-gray-400 line-through' : ''}`}>
                    {u.firstName} {u.lastName}
                    {u.id === user?.id && <span className="text-xs text-gray-400 ml-2">(vous)</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                {u.id !== user?.id ? (
                  <>
                    <select
                      value={u.role}
                      onChange={(e) => updateMutation.mutate({ id: u.id, data: { role: e.target.value } })}
                      disabled={u.role === 'SUPER_ADMIN'}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                    >
                      {u.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                      {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    <button
                      onClick={() => updateMutation.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                      title={u.isActive ? 'Désactiver' : 'Réactiver'}
                      className={`p-1.5 rounded transition-colors ${u.isActive ? 'text-red-400 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                    >
                      {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </>
                ) : (
                  <span className="badge badge-blue">{ROLE_LABELS[u.role] || u.role}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Informations système</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Version</span><span>1.0.0</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Comptabilité</span><span>SYSCOHADA</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Mobile Money</span><span>Orange, Wave, MTN, Free, Moov</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Devises</span><span>XOF, XAF, GNF, MAD, NGN, KES</span></div>
        </div>
      </div>
    </div>
  );
}
