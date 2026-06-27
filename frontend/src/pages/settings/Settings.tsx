import { useAuthStore } from '../../store/auth.store';
import { Building2, User } from 'lucide-react';

export default function SettingsPage() {
  const { user, organization } = useAuthStore();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>

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
          <div><p className="text-gray-500">Langue</p><p className="font-medium mt-1">{organization?.language === 'fr' ? 'Francais' : 'English'}</p></div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Mon profil</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Prenom</p><p className="font-medium mt-1">{user?.firstName}</p></div>
          <div><p className="text-gray-500">Nom</p><p className="font-medium mt-1">{user?.lastName}</p></div>
          <div><p className="text-gray-500">Email</p><p className="font-medium mt-1">{user?.email}</p></div>
          <div><p className="text-gray-500">Role</p>
            <span className="badge badge-blue mt-1">{user?.role}</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Informations systeme</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Version</span><span>1.0.0</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Comptabilite</span><span>SYSCOHADA</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Mobile Money</span><span>Orange, Wave, MTN, Free, Moov</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Devises</span><span>XOF, XAF, GNF, MAD, NGN, KES</span></div>
        </div>
      </div>
    </div>
  );
}
