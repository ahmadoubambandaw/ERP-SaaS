import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, TrendingUp, List, FileText, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { accountingService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';

type Tab = 'entries' | 'accounts' | 'journals' | 'balance';

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
          <button onClick={() => setShowAccountForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau compte
          </button>
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

            {/* Lines */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 w-1/3">Compte</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Libellé</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Débit</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Crédit</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((field, i) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2">
                        <select {...entryForm.register(`lines.${i}.accountId`)} className="input text-sm">
                          <option value="">— compte —</option>
                          {accounts.map((a) => (
                            <option key={a.id as string} value={a.id as string}>
                              {a.code as string} {a.name as string}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input {...entryForm.register(`lines.${i}.description`)} className="input text-sm" placeholder="Libellé" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...entryForm.register(`lines.${i}.debit`, { valueAsNumber: true })} type="number" min="0" step="1" className="input text-right text-sm" placeholder="0" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...entryForm.register(`lines.${i}.credit`, { valueAsNumber: true })} type="number" min="0" step="1" className="input text-right text-sm" placeholder="0" />
                      </td>
                      <td className="px-3 py-2">
                        {fields.length > 2 && (
                          <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-3 py-2">
                      <button type="button" onClick={() => append({ accountId: '', description: '', debit: 0, credit: 0 })} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Ajouter une ligne
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-sm">{formatCurrency(totalDebit, currency)}</td>
                    <td className={`px-3 py-2 text-right font-semibold text-sm ${!isBalanced && (totalDebit || totalCredit) ? 'text-red-600' : ''}`}>
                      {formatCurrency(totalCredit, currency)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
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
              <p className="text-gray-400">Aucun compte — le plan comptable est vide</p>
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
    </div>
  );
}
