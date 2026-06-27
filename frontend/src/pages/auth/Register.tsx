import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

const CURRENCIES = [{ code: 'XOF', label: 'FCFA Ouest (XOF)' }, { code: 'XAF', label: 'FCFA Centre (XAF)' }, { code: 'GNF', label: 'Franc Guineen (GNF)' }, { code: 'MAD', label: 'Dirham (MAD)' }, { code: 'NGN', label: 'Naira (NGN)' }, { code: 'KES', label: 'Shilling Kenya (KES)' }];
const COUNTRIES = [{ code: 'SN', label: 'Senegal' }, { code: 'CI', label: "Cote d'Ivoire" }, { code: 'ML', label: 'Mali' }, { code: 'BF', label: 'Burkina Faso' }, { code: 'GN', label: 'Guinee' }, { code: 'TG', label: 'Togo' }, { code: 'BJ', label: 'Benin' }, { code: 'NG', label: 'Nigeria' }, { code: 'CM', label: 'Cameroun' }, { code: 'MA', label: 'Maroc' }, { code: 'DZ', label: 'Algerie' }, { code: 'TN', label: 'Tunisie' }];

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data: Record<string, string>) => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.register(data);
      const { user, tokens, organization } = res.data.data;
      setAuth(user, organization, tokens.accessToken, tokens.refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Erreur lors de la creation du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Creer votre espace</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Votre entreprise</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nom de l'entreprise</label>
                <input {...register('organizationName', { required: true })} className="input" placeholder="Ma PME" />
              </div>
              <div>
                <label className="label">Identifiant (slug)</label>
                <input {...register('organizationSlug', { required: true, pattern: /^[a-z0-9-]+$/ })} className="input" placeholder="ma-pme" />
                {errors.organizationSlug && <p className="text-xs text-red-500 mt-1">Minuscules, chiffres et tirets uniquement</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Pays</label>
                <select {...register('country')} className="input">
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Devise</label>
                <select {...register('currency')} className="input">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <hr className="my-4" />
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Votre compte administrateur</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prenom</label>
                <input {...register('firstName', { required: true })} className="input" />
              </div>
              <div>
                <label className="label">Nom</label>
                <input {...register('lastName', { required: true })} className="input" />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input {...register('email', { required: true })} type="email" className="input" />
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <input {...register('password', { required: true, minLength: 8 })} type="password" className="input" placeholder="8+ caracteres, maj, min, chiffre" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Creer mon espace ERP
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Deja un compte ? <Link to="/login" className="text-primary-600 hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
