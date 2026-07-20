import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, TrendingUp, List, FileText, Check, Trash2, ChevronDown, ChevronUp, Scale, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { accountingService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';

type Tab = 'entries' | 'accounts' | 'journals' | 'balance' | 'bilan';

interface BilanLine { code: string; name: string; amount: number; }
interface BalanceSheet {
  actif: { immobilise: BilanLine[]; circulant: BilanLine[]; tresorerie: BilanLine[] };
  passif: { capitaux: BilanLine[]; dettesFin: BilanLine[]; circulant: BilanLine[]; tresorerie: BilanLine[] };
  resultatNet: number; totalActif: number; totalPassif: number; equilibre: boolean;
}

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Actif', color: 'badge-blue' },
  { value: 'LIABILITY', label: 'Passif', color: 'badge-red' },
  { value: 'EQUITY', label: 'Capitaux propres', color: 'badge-purple' },
  { value: 'REVENUE', label: 'Produits', color: 'badge-green' },
  { value: 'EXPENSE', label: 'Charges', color: 'badge-orange' },
];

const JOURNAL_TYPES = [
  { value: 'SALES', label: 'Ventes' },
  { value: 'PURCHASES', label: 'Achats' },
  { value: 'BANK', label: 'Banque' },
  { value: 'CASH', label: 'Caisse' },
  { value: 'GENERAL', label: 'Opérations diverses' },
  { value: 'PAYROLL', label: 'Paie' },
];

export default function AccountingPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [tab, setTab] = useState<Tab>('entries');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['entries'],
    queryFn: () => accountingService.entries(),
  });
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountingService.accounts(),
  });
  const { data: journalsData } = useQuery({
    queryKey: ['journals'],
    queryFn: () => accountingService.journals(),
  });
  const { data: balanceData } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: () => accountingService.trialBalance(),
    enabled: tab === 'balance',
  });
  const { data: bilanData, isLoading: bilanLoading } = useQuery({
    queryKey: ['balance-sheet'],
    queryFn: () => accountingService.balanceSheet(),
    enabled: tab === 'bilan',
  });
  const bilan = bilanData?.data?.data as BalanceSheet | undefined;

  const seedMutation = useMutation({
    mutationFn: () => accountingService.seedSyscohada(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      const created = res?.data?.data?.created ?? 0;
      toast.success(created > 0 ? `${created} compte(s) ajouté(s) au plan comptable` : 'Plan comptable déjà à jour');
    },
    onError: (err: unknown) => toast.error(getApiError(err, 'Échec du chargement du plan')),
  });

  const entries = entriesData?.data?.data?.entries || entriesData?.data?.data || [];
  const accounts = (accountsData?.data?.data || []) as Record<string, unknown>[];
  const journals = (journalsData?.data?.data || []) as Record<string, unknown>[];
  const balance = (balanceData?.data?.data || []) as Record<string, unknown>[];

  // Entry form
  const entryForm = useForm({
    defaultValues: {
      journalId: '',
      reference: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      lines: [
        { accountId: '', description: '', debit: 0, credit: 0 },
        { accountId: '', description: '', debit: 0, credit: 0 },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: entryForm.control, name: 'lines' });
  const watchedLines = entryForm.watch('lines');
  const totalDebit = watchedLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = watchedLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const createEntry = useMutation({
    mutationFn: (d: unknown) => {
      const data = d as { journalId: string; reference: string; date: string; description: string; lines: { accountId: string; description: string; debit: number; credit: number }[] };
      const lines = data.lines.map((l) => ({
        debitAccountId: Number(l.debit) > 0 ? l.accountId : undefined,
        creditAccountId: Number(l.credit) > 0 ? l.accountId : undefined,
        description: l.description,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));
      return accountingService.createEntry({ ...data, lines });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setShowEntryForm(false);
      entryForm.reset();
    },
  });

  const postEntry = useMutation({
    mutationFn: (id: string) => accountingService.postEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  });

  // Account form
  const accountForm = useForm({ defaultValues: { code: '', name: '', type: 'ASSET', parentCode: '' } });
  const createAccount = useMutation({
    mutationFn: (d: unknown) => accountingService.createAccount(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setShowAccountForm(false);
      accountForm.reset();
    },
  });

  // Journal form
  const journalForm = useForm({ defaultValues: { code: '', name: '', type: 'GENERAL' } });
  const createJournal = useMutation({
    mutationFn: (d: unknown) => accountingService.createJournal(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journals'] });
      setShowJournalForm(false);
      journalForm.reset();
    },
  });

  const tabs = [
    { id: 'entries' as Tab, label: 'Écritures', icon: FileText },
    { id: 'accounts' as Tab, label: 'Plan comptable', icon: List },
    { id: 'journals' as Tab, label: 'Journaux', icon: BookOpen },
    { id: 'balance' as Tab, label: 'Balance', icon: TrendingUp },
    { id: 'bilan' as Tab, label: 'Bilan (Actif/Passif)', icon: Scale },
  ];

  const totalDebitBalance = balance.reduce((s, b) => s + Number(b.debit), 0);
  const totalCreditBalance = balance.reduce((s, b) => s + Number(b.credit), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comptabilité</h1>
          <p className="text-gray-500 text-sm">Plan comptable SYSCOHADA</p>
        </div>
        {tab === 'entries' && (
          <button onClick={() => setShowEntryForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouvelle écriture
          </button>
        )}
        {tab === 'accounts' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="btn-secondary flex items-center gap-2"
              title="Charger le plan comptable SYSCOHADA standard"
            >
              {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Plan SYSCOHADA
            </button>
            <button onClick={() => setShowAccountForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouveau compte
            </button>
          </div>
        )}
        {tab === 'journals' && (
          <button onClick={() => setShowJournalForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau journal
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ENTRY FORM */}
      {showEntryForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Nouvelle écriture comptable</h3>
          <form onSubmit={entryForm.handleSubmit((d) => createEntry.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Journal *</label>
                <select {...entryForm.register('journalId', { required: true })} className="input">
                  <option value="">Sélectionner...</option>
                  {journals.map((j) => (
                    <option key={j.id as string} value={j.id as string}>{j.code as string} — {j.name as string}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Référence *</label>
                <input {...entryForm.register('reference', { required: true })} className="input" placeholder="VTE-2024-001" />
              </div>
              <div>
                <label className="label">Date *</label>
                <input {...entryForm.register('date', { required: true })} type="date" className="input" />
              </div>
              <div>
                <label className="label">Libellé *</label>
                <input {...entryForm.register('description', { required: true })} className="input" placeholder="Description de l'écriture" />
              </div>
            </div>

            {/* Lignes de l'écriture — une carte par ligne */}
            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="relative rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs font-semibold text-gray-400">
                    Ligne {i + 1}
                  </span>
                  {fields.length > 2 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label="Supprimer la ligne"
                      className="absolute top-3 right-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="pr-9">
                    <label className="label">Compte</label>
                    <select {...entryForm.register(`lines.${i}.accountId`)} className="input">
                      <option value="">— compte —</option>
                      {accounts.map((a) => (
                        <option key={a.id as string} value={a.id as string}>
                          {a.code as string} {a.name as string}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3">
                    <label className="label">Libellé</label>
                    <input {...entryForm.register(`lines.${i}.description`)} className="input" placeholder="Libellé" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="label">Débit</label>
                      <input {...entryForm.register(`lines.${i}.debit`, { valueAsNumber: true })} type="number" min="0" step="1" className="input text-right" placeholder="0" />
                    </div>
                    <div>
                      <label className="label">Crédit</label>
                      <input {...entryForm.register(`lines.${i}.credit`, { valueAsNumber: true })} type="number" min="0" step="1" className="input text-right" placeholder="0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <button type="button" onClick={() => append({ accountId: '', description: '', debit: 0, credit: 0 })} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
              </button>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">Débit : <strong className="text-gray-900 tabular-nums">{formatCurrency(totalDebit, currency)}</strong></span>
                <span className={!isBalanced && (totalDebit || totalCredit) ? 'text-red-600' : 'text-gray-500'}>
                  Crédit : <strong className="tabular-nums">{formatCurrency(totalCredit, currency)}</strong>
                </span>
              </div>
            </div>

            {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                ⚠ Écriture déséquilibrée — écart : {formatCurrency(Math.abs(totalDebit - totalCredit), currency)}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowEntryForm(false); entryForm.reset(); }} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={!isBalanced || createEntry.isPending} className="btn-primary">
                {createEntry.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACCOUNT FORM */}
      {showAccountForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Nouveau compte</h3>
          <form onSubmit={accountForm.handleSubmit((d) => createAccount.mutate(d))} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Code *</label>
              <input {...accountForm.register('code', { required: true })} className="input font-mono" placeholder="521" />
            </div>
            <div className="col-span-2">
              <label className="label">Intitulé *</label>
              <input {...accountForm.register('name', { required: true })} className="input" placeholder="Banques locales" />
            </div>
            <div>
              <label className="label">Type *</label>
              <select {...accountForm.register('type')} className="input">
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-4 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowAccountForm(false); accountForm.reset(); }} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={createAccount.isPending} className="btn-primary">Créer</button>
            </div>
          </form>
        </div>
      )}

      {/* JOURNAL FORM */}
      {showJournalForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Nouveau journal</h3>
          <form onSubmit={journalForm.handleSubmit((d) => createJournal.mutate(d))} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Code *</label>
              <input {...journalForm.register('code', { required: true })} className="input font-mono" placeholder="VTE" />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input {...journalForm.register('name', { required: true })} className="input" placeholder="Journal des ventes" />
            </div>
            <div>
              <label className="label">Type *</label>
              <select {...journalForm.register('type')} className="input">
                {JOURNAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-full flex justify-end gap-3">
              <button type="button" onClick={() => { setShowJournalForm(false); journalForm.reset(); }} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={createJournal.isPending} className="btn-primary">Créer</button>
            </div>
          </form>
        </div>
      )}

      {/* ENTRIES TAB */}
      {tab === 'entries' && (
        <div className="card">
          {entriesLoading ? (
            <div className="px-6 py-12 text-center text-gray-400">Chargement...</div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">Aucune écriture comptable</p>
              <p className="text-gray-400 text-sm mt-1">Créez votre première écriture en cliquant sur "Nouvelle écriture"</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Référence</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Journal</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Libellé</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Débit</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Crédit</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(entries as Record<string, unknown>[]).map((e) => (
                  <>
                    <tr key={e.id as string} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedEntry(expandedEntry === e.id ? null : e.id as string)}>
                      <td className="px-6 py-4 text-gray-500">{formatDate(e.date as string)}</td>
                      <td className="px-6 py-4 font-medium text-primary-600">{e.reference as string}</td>
                      <td className="px-6 py-4 text-gray-500">{(e.journal as Record<string, unknown>)?.name as string}</td>
                      <td className="px-6 py-4">{e.description as string}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(e.totalDebit as number, currency)}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(e.totalCredit as number, currency)}</td>
                      <td className="px-6 py-4"><StatusBadge status={e.status as string} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {e.status === 'DRAFT' && (
                            <button
                              onClick={(ev) => { ev.stopPropagation(); postEntry.mutate(e.id as string); }}
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                              title="Valider"
                            >
                              <Check className="w-3.5 h-3.5" /> Valider
                            </button>
                          )}
                          {expandedEntry === e.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </td>
                    </tr>
                    {expandedEntry === e.id && (
                      <tr key={`${e.id}-detail`}>
                        <td colSpan={8} className="px-6 pb-4 bg-gray-50">
                          <table className="w-full text-xs mt-2">
                            <thead>
                              <tr className="text-gray-500">
                                <th className="text-left py-1 font-medium">Compte débit</th>
                                <th className="text-left py-1 font-medium">Compte crédit</th>
                                <th className="text-left py-1 font-medium">Libellé</th>
                                <th className="text-right py-1 font-medium">Débit</th>
                                <th className="text-right py-1 font-medium">Crédit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {((e.lines as Record<string, unknown>[]) || []).map((line: Record<string, unknown>, idx: number) => (
                                <tr key={idx} className="border-t border-gray-200">
                                  <td className="py-1 font-mono">{(line.debitAccount as Record<string, unknown>)?.code as string} {(line.debitAccount as Record<string, unknown>)?.name as string}</td>
                                  <td className="py-1 font-mono">{(line.creditAccount as Record<string, unknown>)?.code as string} {(line.creditAccount as Record<string, unknown>)?.name as string}</td>
                                  <td className="py-1 text-gray-500">{line.description as string}</td>
                                  <td className="py-1 text-right">{Number(line.debit) > 0 ? formatCurrency(line.debit as number, currency) : ''}</td>
                                  <td className="py-1 text-right">{Number(line.credit) > 0 ? formatCurrency(line.credit as number, currency) : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          {ACCOUNT_TYPES.map(({ value, label, color }) => {
            const group = accounts.filter((a) => a.type === value);
            if (group.length === 0) return null;
            return (
              <div key={value} className="card">
                <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">{label}</h3>
                  <span className={`badge ${color}`}>{group.length} comptes</span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {group.map((a) => (
                      <tr key={a.id as string} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-mono text-gray-500 w-24">{a.code as string}</td>
                        <td className="px-6 py-3 font-medium text-gray-900">{a.name as string}</td>
                        <td className="px-6 py-3 text-right text-gray-500 font-mono">{formatCurrency(a.balance as number, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="card px-6 py-16 text-center">
              <List className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-medium">Votre plan comptable est vide</p>
              <p className="text-gray-400 text-sm mt-1 mb-5">Chargez le plan comptable SYSCOHADA standard pour démarrer en un clic.</p>
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="btn-primary inline-flex items-center gap-2"
              >
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Charger le plan comptable SYSCOHADA
              </button>
            </div>
          )}
        </div>
      )}

      {/* JOURNALS TAB */}
      {tab === 'journals' && (
        <div className="card">
          {journals.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Aucun journal comptable</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Code</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Nom</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {journals.map((j) => (
                  <tr key={j.id as string} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-semibold text-primary-600">{j.code as string}</td>
                    <td className="px-6 py-4 font-medium">{j.name as string}</td>
                    <td className="px-6 py-4">
                      <span className="badge badge-blue">
                        {JOURNAL_TYPES.find((t) => t.value === j.type)?.label || j.type as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* BALANCE TAB */}
      {tab === 'balance' && (
        <div className="card">
          {balance.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Aucun mouvement comptable validé</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Code</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Compte</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Débit</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Crédit</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {balance.map((b, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-gray-500">{b.code as string}</td>
                    <td className="px-6 py-4 text-gray-900">{b.name as string}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(b.debit as number, currency)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(b.credit as number, currency)}</td>
                    <td className={`px-6 py-4 text-right font-semibold font-mono ${(b.balance as number) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(Math.abs(b.balance as number), currency)}
                      <span className="text-xs ml-1 text-gray-400">{(b.balance as number) < 0 ? 'Cr' : 'Dr'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={2} className="px-6 py-3 font-semibold text-gray-700">Totaux</td>
                  <td className="px-6 py-3 text-right font-bold font-mono">{formatCurrency(totalDebitBalance, currency)}</td>
                  <td className="px-6 py-3 text-right font-bold font-mono">{formatCurrency(totalCreditBalance, currency)}</td>
                  <td className={`px-6 py-3 text-right font-bold font-mono ${Math.abs(totalDebitBalance - totalCreditBalance) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                    {Math.abs(totalDebitBalance - totalCreditBalance) < 0.01 ? '✓ Équilibrée' : formatCurrency(Math.abs(totalDebitBalance - totalCreditBalance), currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* BILAN TAB (Actif / Passif) */}
      {tab === 'bilan' && (
        <div className="space-y-4">
          {bilanLoading ? (
            <div className="card px-6 py-16 text-center text-gray-400">
              <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            </div>
          ) : !bilan || !bilan.actif || !bilan.passif || (bilan.totalActif === 0 && bilan.totalPassif === 0) ? (
            <div className="card px-6 py-16 text-center">
              <Scale className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-medium">Bilan vide</p>
              <p className="text-gray-400 text-sm mt-1">Le bilan se remplit à partir de vos écritures comptables validées.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ACTIF */}
                <div className="card overflow-hidden">
                  <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                    <h3 className="font-bold text-blue-800">ACTIF</h3>
                    <span className="text-xs text-blue-600">Ce que l'entreprise possède</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {renderBilanGroup('Actif immobilisé', bilan.actif.immobilise, currency)}
                    {renderBilanGroup('Actif circulant', bilan.actif.circulant, currency)}
                    {renderBilanGroup('Trésorerie – Actif', bilan.actif.tresorerie, currency)}
                  </div>
                  <div className="px-6 py-3 bg-blue-600 text-white flex items-center justify-between">
                    <span className="font-bold">TOTAL ACTIF</span>
                    <span className="font-bold font-mono">{formatCurrency(bilan.totalActif, currency)}</span>
                  </div>
                </div>

                {/* PASSIF */}
                <div className="card overflow-hidden">
                  <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                    <h3 className="font-bold text-amber-800">PASSIF</h3>
                    <span className="text-xs text-amber-600">Ce que l'entreprise doit</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {renderBilanGroup('Capitaux propres', bilan.passif.capitaux, currency)}
                    {renderBilanGroup('Dettes financières', bilan.passif.dettesFin, currency)}
                    {renderBilanGroup('Passif circulant (dettes)', bilan.passif.circulant, currency)}
                    {renderBilanGroup('Trésorerie – Passif', bilan.passif.tresorerie, currency)}
                  </div>
                  <div className="px-6 py-3 bg-amber-500 text-white flex items-center justify-between">
                    <span className="font-bold">TOTAL PASSIF</span>
                    <span className="font-bold font-mono">{formatCurrency(bilan.totalPassif, currency)}</span>
                  </div>
                </div>
              </div>

              <div className={`card px-6 py-4 flex items-center justify-between ${bilan.equilibre ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <span className={`font-semibold ${bilan.equilibre ? 'text-green-700' : 'text-red-700'}`}>
                  {bilan.equilibre ? '✓ Bilan équilibré (Actif = Passif)' : '⚠ Bilan déséquilibré — vérifiez vos écritures'}
                </span>
                <span className="text-sm text-gray-500">
                  Résultat net : <strong className={bilan.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(bilan.resultatNet, currency)}
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Rend un groupe de lignes du bilan avec son sous-total
function renderBilanGroup(title: string, lines: BilanLine[], currency: string) {
  if (!lines || lines.length === 0) return null;
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div>
      <div className="px-6 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</span>
        <span className="text-xs font-mono text-gray-500">{formatCurrency(subtotal, currency)}</span>
      </div>
      {lines.map((l) => (
        <div key={l.code} className="px-6 py-2 flex items-center justify-between text-sm">
          <span className="text-gray-700"><span className="font-mono text-gray-400 mr-2">{l.code}</span>{l.name}</span>
          <span className="font-mono text-gray-900">{formatCurrency(l.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}
