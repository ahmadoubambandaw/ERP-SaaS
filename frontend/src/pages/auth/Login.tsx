import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

interface LoginForm {
  organizationSlug: string;
  email: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.login(data.email, data.password, data.organizationSlug);
      const { user, tokens, organization } = res.data.data;
      setAuth(user, organization, tokens.accessToken, tokens.refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Naatal</h1>
          <p className="text-gray-300 mt-2 font-medium">Naatal sa liggéey</p>
          <p className="text-gray-400 text-sm">Faites prospérer votre activité</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Connexion</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Identifiant organisation</label>
              <input
                {...register('organizationSlug', { required: 'Champ requis' })}
                className="input"
                placeholder="mon-entreprise"
              />
              {errors.organizationSlug && <p className="text-xs text-red-500 mt-1">{errors.organizationSlug.message}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                {...register('email', { required: 'Champ requis' })}
                type="email"
                className="input"
                placeholder="vous@exemple.com"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <input
                {...register('password', { required: 'Champ requis' })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Se connecter
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary-600 hover:underline font-medium">Creer un compte</Link>
          </p>

          <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <strong>Demo :</strong> slug: <code>demo-pme</code> | email: <code>admin@demo.com</code> | mdp: <code>Admin123!</code>
          </div>
        </div>
      </div>
    </div>
  );
}
