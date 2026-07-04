import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2, Check, ArrowLeft, Gift } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import Logo from '../../components/ui/Logo';

const CURRENCIES = [{ code: 'XOF', label: 'FCFA Ouest (XOF)' }, { code: 'XAF', label: 'FCFA Centre (XAF)' }, { code: 'GNF', label: 'Franc Guineen (GNF)' }, { code: 'MAD', label: 'Dirham (MAD)' }, { code: 'NGN', label: 'Naira (NGN)' }, { code: 'KES', label: 'Shilling Kenya (KES)' }];
const COUNTRIES = [{ code: 'SN', label: 'Senegal' }, { code: 'CI', label: "Cote d'Ivoire" }, { code: 'ML', label: 'Mali' }, { code: 'BF', label: 'Burkina Faso' }, { code: 'GN', label: 'Guinee' }, { code: 'TG', label: 'Togo' }, { code: 'BJ', label: 'Benin' }, { code: 'NG', label: 'Nigeria' }, { code: 'CM', label: 'Cameroun' }, { code: 'MA', label: 'Maroc' }, { code: 'DZ', label: 'Algerie' }, { code: 'TN', label: 'Tunisie' }];

const PLANS = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: '15 000',
    period: 'F CFA / mois',
    desc: 'Pour démarrer sereinement',
    features: ['3 utilisateurs', 'Facturation & Devis', 'Comptabilité SYSCOHADA', 'Gestion des stocks', 'Application mobile'],
    highlight: false,
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: '25 000',
    period: 'F CFA / mois',
    desc: 'Pour les PME qui grandissent',
    features: ['10 utilisateurs', 'Tout Starter, plus :', 'RH & Paie complète', 'CRM & pipeline commercial', 'Achats & fournisseurs', 'Gestion de projets'],
    highlight: true,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Sur devis',
    period: '',
    desc: 'Pour les structures exigeantes',
    features: ['Utilisateurs illimités', 'Tout Professional, plus :', 'Support prioritaire', 'Formation des équipes'],
    highlight: false,
  },
];

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'plan' | 'form'>('plan');
  const [selectedPlan, setSelectedPlan] = useState('PROFESSIONAL');
  const [referralCode] = useState(() => new URLSearchParams(window.location.search).get('ref') || '');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  const onSubmit = async (data: Record<string, string>) => {
    setLoading(true);
    setError('');
    try {
      const code = (data.referralCode || referralCode || '').trim();
      const res = await authService.register({ ...data, plan: selectedPlan, referralCode: code || undefined });
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

  // ===== Étape 1 : choix de la formule =====
  if (step === 'plan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl py-8">
          <div className="text-center mb-6">
            <Logo className="w-14 h-14 mx-auto mb-3" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Choisissez votre formule</h1>
            <div className="inline-flex items-center gap-2 mt-3 bg-green-500/20 text-green-300 text-sm font-medium px-4 py-1.5 rounded-full">
              <Gift className="w-4 h-4" /> 14 jours d'essai gratuit · sans carte bancaire
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`bg-white rounded-2xl p-6 flex flex-col relative ${p.highlight ? 'ring-2 ring-primary-400 shadow-2xl' : 'shadow-lg'}`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    Recommandé
                  </span>
                )}
                <h3 className="font-bold text-gray-900">{p.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                <div className="mt-4 mb-5">
                  <span className="text-2xl font-bold text-gray-900">{p.price}</span>
                  {p.period && <span className="text-xs text-gray-400 ml-1">{p.period}</span>}
                </div>
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { setSelectedPlan(p.id); setStep('form'); }}
                  className={`mt-6 w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${p.highlight ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Créer gratuitement · 14 jours
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Déjà un compte ? <Link to="/login" className="text-primary-300 hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    );
  }

  // ===== Étape 2 : formulaire =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Logo className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Creer votre espace</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Rappel formule choisie */}
          <div className="flex items-center justify-between mb-5 p-3 bg-primary-50 border border-primary-100 rounded-xl">
            <div className="flex items-center gap-2 text-sm">
              <Gift className="w-4 h-4 text-primary-600" />
              <span className="text-gray-600">Formule <strong className="text-gray-900">{plan.name}</strong> — 14 jours gratuits</span>
            </div>
            <button onClick={() => setStep('plan')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Changer
            </button>
          </div>

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

            <div>
              <label className="label">Code de parrainage <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <input {...register('referralCode')} defaultValue={referralCode} className="input" placeholder="NA-XXXXX" />
              {referralCode && <p className="text-xs text-green-600 mt-1">🎁 Code appliqué — 7 jours d'essai bonus (21 jours au total) !</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Commencer mes 14 jours gratuits
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
