import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ChevronDown, Check, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { companiesService } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import type { User, Organization } from '../../types';

interface Company {
  id: string;
  name: string;
  slug: string;
  currency: string;
  country: string;
  logo: string | null;
  plan: string;
  isHeadquarters: boolean;
  current: boolean;
}

export default function CompanySwitcher() {
  const { organization, user, setAuth, accessToken, refreshToken } = useAuthStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const canManage = ['ADMIN', 'DIRECTOR', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesService.list(),
  });
  const companies: Company[] = data?.data?.data || [];

  // On masque le sélecteur s'il n'y a qu'une entreprise et qu'on ne peut pas en créer
  if (companies.length <= 1 && !canManage) return null;

  async function doSwitch(c: Company) {
    if (c.current) { setOpen(false); return; }
    setSwitching(c.id);
    try {
      const res = await companiesService.switch(c.id);
      const { user: u, tokens, organization: org } = res.data.data;
      setAuth(u as User, org as Organization, tokens.accessToken, tokens.refreshToken);
      await qc.invalidateQueries();
      toast.success(`Vous êtes sur « ${org.name} »`);
      // Rechargement complet pour repartir sur un contexte propre
      window.location.href = '/dashboard';
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Impossible de changer d\'entreprise');
      setSwitching(null);
    }
  }

  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {organization?.logo ? (
          <img src={organization.logo} alt="" className="w-8 h-8 rounded-lg object-contain bg-white flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-none truncate">{organization?.name || 'Naatal'}</p>
          <p className="text-xs text-gray-400">{organization?.currency}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            <p className="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Mes entreprises</p>
            <div className="max-h-64 overflow-y-auto">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => doSwitch(c)}
                  disabled={!!switching}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-gray-50 text-left"
                >
                  {c.logo ? (
                    <img src={c.logo} alt="" className="w-7 h-7 rounded-md object-contain bg-gray-100" />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {c.isHeadquarters ? 'Siège' : 'Établissement'} · {c.currency}
                    </p>
                  </div>
                  {switching === c.id ? (
                    <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                  ) : c.current ? (
                    <Check className="w-4 h-4 text-primary-600" />
                  ) : null}
                </button>
              ))}
            </div>
            {canManage && (
              <button
                onClick={() => { setOpen(false); setShowCreate(true); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 border-t border-gray-100 text-primary-600 font-medium hover:bg-primary-50"
              >
                <Plus className="w-4 h-4" /> Ajouter une entreprise
              </button>
            )}
          </div>
        </>
      )}

      {showCreate && (
        <CreateCompanyModal
          defaultCurrency={organization?.currency || 'XOF'}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['companies'] }); }}
        />
      )}
    </div>
  );
}

function CreateCompanyModal({
  defaultCurrency, onClose, onCreated,
}: {
  defaultCurrency: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setSaving(true);
    try {
      await companiesService.create({ name: name.trim(), currency });
      toast.success('Entreprise créée');
      onCreated();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Création impossible');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 text-gray-800">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Nouvelle entreprise</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Créez une seconde société ou boutique. Vous pourrez basculer de l'une à l'autre à tout moment avec le même compte.
        </p>
        <label className="block text-sm font-medium mb-1">Nom de l'entreprise</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="Ex : Boutique Sandaga"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 mb-4 focus:ring-2 focus:ring-primary-500"
        />
        <label className="block text-sm font-medium mb-1">Devise</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 mb-5"
        >
          {['XOF', 'XAF', 'GNF', 'MAD', 'NGN', 'USD', 'EUR'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving || name.trim().length < 2}
          className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold disabled:opacity-40"
        >
          {saving ? 'Création…' : 'Créer l\'entreprise'}
        </button>
      </form>
    </div>
  );
}
