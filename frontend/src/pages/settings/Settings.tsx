import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, User, Users, Plus, Loader2, UserX, UserCheck, Save, Upload, Trash2, KeyRound, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usersService, organizationService, authService } from '../../services/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
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

interface OrgFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
}

interface OrgDetails extends OrgFormData {
  id: string;
  slug: string;
  country: string;
  currency: string;
  language: string;
  logo?: string | null;
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
      toast.success('Utilisateur créé');
    },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de la création de l\'utilisateur')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => usersService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setToToggle(null); toast.success('Utilisateur mis à jour'); },
    onError: (err: unknown) => setErrorMsg(getApiError(err)),
  });

  // ===== Mot de passe (mon compte) =====
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwError, setPwError] = useState('');
  const {
    register: pwRegister,
    handleSubmit: pwHandleSubmit,
    reset: pwReset,
  } = useForm<{ currentPassword: string; newPassword: string }>();

  const pwMutation = useMutation({
    mutationFn: (d: { currentPassword: string; newPassword: string }) => authService.changePassword(d),
    onSuccess: () => {
      setShowPwForm(false);
      setPwError('');
      pwReset();
      toast.success('Mot de passe modifié');
    },
    onError: (err: unknown) => setPwError(getApiError(err)),
  });

  // ===== Réinitialisation mot de passe (admin) =====
  const [resetPwFor, setResetPwFor] = useState<OrgUser | null>(null);
  const [newPw, setNewPw] = useState('');
  const resetPwMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => usersService.update(id, { password }),
    onSuccess: () => {
      setResetPwFor(null);
      setNewPw('');
      toast.success('Mot de passe réinitialisé');
    },
    onError: (err: unknown) => setErrorMsg(getApiError(err)),
  });

  // ===== Désactivation (confirmation) =====
  const [toToggle, setToToggle] = useState<OrgUser | null>(null);

  // ===== Organisation =====
  const [orgError, setOrgError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register: orgRegister,
    handleSubmit: orgHandleSubmit,
    reset: orgReset,
  } = useForm<OrgFormData>();

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationService.get(),
  });
  const orgDetails: OrgDetails | undefined = orgData?.data?.data;

  useEffect(() => {
    if (orgDetails) {
      orgReset({
        name: orgDetails.name || '',
        address: orgDetails.address || '',
        phone: orgDetails.phone || '',
        email: orgDetails.email || '',
        taxId: orgDetails.taxId || '',
      });
    }
  }, [orgDetails, orgReset]);

  const orgMutation = useMutation({
    mutationFn: (d: Partial<OrgFormData> & { logo?: string | null }) => organizationService.update(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['organization'] });
      setOrgError('');
      toast.success('Informations de l\'entreprise enregistrées');
      const updated = res?.data?.data;
      const current = useAuthStore.getState().organization;
      if (updated && current) {
        useAuthStore.setState({ organization: { ...current, name: updated.name, logo: updated.logo || undefined } });
      }
    },
    onError: (err: unknown) => {
      const msg = getApiError(err);
      setOrgError(msg);
      toast.error(msg);
    },
  });

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setOrgError('Veuillez choisir une image (PNG, JPG...)');
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // resize to max 256px, keep ratio, export compact PNG
      const max = 256;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      orgMutation.mutate({ logo: canvas.toDataURL('image/png') });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setOrgError('Impossible de lire cette image');
    };
    img.src = url;
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Entreprise</h2>
          {!isAdmin && <span className="badge badge-gray">Lecture seule</span>}
        </div>

        {orgError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {orgError}
          </div>
        )}

        {/* Logo */}
        <div className="flex items-center gap-4 mb-6">
          {orgDetails?.logo ? (
            <img src={orgDetails.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-white" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-gray-300" />
            </div>
          )}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoFile(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={orgMutation.isPending}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                {orgMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {orgDetails?.logo ? 'Changer le logo' : 'Ajouter un logo'}
              </button>
              {orgDetails?.logo && (
                <button
                  type="button"
                  onClick={() => orgMutation.mutate({ logo: null })}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                  title="Supprimer le logo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={orgHandleSubmit((d) => orgMutation.mutate(d))}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="label">Nom de l'entreprise *</label>
            <input {...orgRegister('name', { required: true })} disabled={!isAdmin} className="input disabled:bg-gray-50" />
          </div>
          <div>
            <label className="label">NINEA / NIF</label>
            <input {...orgRegister('taxId')} disabled={!isAdmin} className="input disabled:bg-gray-50" placeholder="Numéro fiscal" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adresse</label>
            <input {...orgRegister('address')} disabled={!isAdmin} className="input disabled:bg-gray-50" placeholder="Rue, quartier, ville" />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input {...orgRegister('phone')} disabled={!isAdmin} className="input disabled:bg-gray-50" placeholder="+221 33 000 00 00" />
          </div>
          <div>
            <label className="label">Email</label>
            <input {...orgRegister('email')} type="email" disabled={!isAdmin} className="input disabled:bg-gray-50" placeholder="contact@entreprise.com" />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400">
              Devise : <strong>{orgDetails?.currency || organization?.currency}</strong> • Identifiant : <span className="font-mono">{organization?.slug}</span>
              <br />Ces informations apparaissent sur vos factures PDF.
            </p>
            {isAdmin && (
              <button type="submit" disabled={orgMutation.isPending} className="btn-primary flex items-center gap-2">
                {orgMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            )}
          </div>
        </form>
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

        <div className="mt-6 pt-4 border-t border-gray-100">
          {!showPwForm ? (
            <button onClick={() => { setShowPwForm(true); setPwError(''); }} className="btn-secondary text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" /> Changer mon mot de passe
            </button>
          ) : (
            <form onSubmit={pwHandleSubmit((d) => pwMutation.mutate(d))} className="space-y-3 max-w-sm">
              {pwError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{pwError}</div>
              )}
              <div>
                <label className="label">Mot de passe actuel *</label>
                <input {...pwRegister('currentPassword', { required: true })} type="password" className="input" />
              </div>
              <div>
                <label className="label">Nouveau mot de passe * (min. 8 caractères)</label>
                <input {...pwRegister('newPassword', { required: true, minLength: 8 })} type="password" className="input" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowPwForm(false); pwReset(); setPwError(''); }} className="btn-secondary text-sm">
                  Annuler
                </button>
                <button type="submit" disabled={pwMutation.isPending} className="btn-primary text-sm flex items-center gap-2">
                  {pwMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Modifier
                </button>
              </div>
            </form>
          )}
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
                      onClick={() => setResetPwFor(u)}
                      title="Réinitialiser le mot de passe"
                      className="p-1.5 rounded transition-colors text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => (u.isActive ? setToToggle(u) : updateMutation.mutate({ id: u.id, data: { isActive: true } }))}
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

      {/* Dialog: désactivation */}
      <ConfirmDialog
        open={!!toToggle}
        title="Désactiver ce compte ?"
        message={toToggle ? `${toToggle.firstName} ${toToggle.lastName} ne pourra plus se connecter. Vous pourrez le réactiver à tout moment.` : ''}
        confirmLabel="Désactiver"
        danger
        loading={updateMutation.isPending}
        onConfirm={() => toToggle && updateMutation.mutate({ id: toToggle.id, data: { isActive: false } })}
        onCancel={() => setToToggle(null)}
      />

      {/* Dialog: réinitialisation mot de passe */}
      {resetPwFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setResetPwFor(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Réinitialiser le mot de passe</h3>
                <p className="text-sm text-gray-500 mt-1">{resetPwFor.firstName} {resetPwFor.lastName}</p>
              </div>
            </div>
            <label className="label">Nouveau mot de passe (min. 8 caractères)</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="input"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setResetPwFor(null); setNewPw(''); }} className="btn-secondary">Annuler</button>
              <button
                onClick={() => resetPwMutation.mutate({ id: resetPwFor.id, password: newPw })}
                disabled={newPw.length < 8 || resetPwMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {resetPwMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Réinitialiser
              </button>
            </div>
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
