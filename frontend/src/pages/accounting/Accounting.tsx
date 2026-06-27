import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { accountingService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';

export default function AccountingPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [tab, setTab] = useState<'entries' | 'accounts' | 'balance'>('entries');
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();
  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      journalId: '',
      reference: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      lines: [{ debitAccountId: '', creditAccountId: '', debit: 0, credit: 0, description: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const { data: entriesData } = useQuery({ queryKey: ['entries'], queryFn: () => accountingService.entries() });
  const { data: accountsData } = useQuery({ queryKey: ['accounts'], queryFn: () => accountingService.accounts() });
  const { data: journalsData } = useQuery({ queryKey: ['journals'], queryFn: () => accountingService.journals() });
  const { data: balanceData } = useQuery({ queryKey: ['trial-balance'], queryFn: () => accountingService.trialBalance(), enabled: tab === 'balance' });

  const entries = entriesData?.data?.data || [];
  const accounts = accountsData?.data?.data || [];
  const journals = journalsData?.data?.data || [];
  const balance = balanceData?.data?.data || [];

  const createEntry = useMutation({
    mutationFn: (d: unknown) => accountingService.createEntry(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entries'] }); setShowForm(false); reset(); },
  });

  const postEntry = useMutation({
    mutationFn: (id: string) => accountingService.postEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comptabilite</h1>
          <p className="text-gray-500 text-sm">Plan SYSCOHADA</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle ecriture
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['entries', 'accounts', 'balance'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'entries' ? 'Ecritures' : t === 'accounts' ? 'Plan comptable' : 'Balance'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Nouvelle ecriture comptable</h3>
          <form onSubmit={handleSubmit((d) => createEntry.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><label className="label">Journal *</label>
                <select {...register('journalId', { required: true })} className="input">
                  {journals.map((j: Record<string, unknown>) => <option key={j.id as string} value={j.id as string}>{j.name as string}</option>)}
                </select>
              </div>
              <div><label className="label">Reference *</label><input {...register('reference', { required: true })} className="input" /></div>
              <div><label className="label">Date *</label><input {...register('date', { required: true })} type="date" className="input" /></div>
              <div className="col-span-3"><label className="label">Libelle *</label><input {...register('description', { required: true })} className="input" /></div>
            </div>

            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-5 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="label text-xs">Compte debit</label>
                    <select {...register(`lines.${i}.debitAccountId`)} className="input">
                      <option value="">-</option>
                      {accounts.map((a: Record<string, unknown>) => <option key={a.id as string} value={a.id as string}>{a.code as string} - {a.name as string}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label text-xs">Compte credit</label>
                    <select {...register(`lines.${i}.creditAccountId`)} className="input">
                      <option value="">-</option>
                      {accounts.map((a: Record<string, unknown>) => <option key={a.id as string} value={a.id as string}>{a.code as string} - {a.name as string}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Montant</label>
                    <div className="flex gap-1">
                      <input {...register(`lines.${i}.debit`, { valueAsNumber: true })} type="number" placeholder="Debit" className="input" />
                      {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 px-1">x</button>}
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => append({ debitAccountId: '', creditAccountId: '', debit: 0, credit: 0, description: '' })} className="text-sm text-primary-600 hover:underline">
                + Ajouter une ligne
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
              <button type="submit" className="btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'entries' && (
        <div className="card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Reference</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Journal</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Libelle</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Debit</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Credit</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
              <th className="px-6 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {entries.length === 0 ? <tr><td colSpan={8} className="px-6 py-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400">Aucune ecriture comptable</p>
              </td></tr>
                : entries.map((e: Record<string, unknown>) => (
                  <tr key={e.id as string} className="table-row">
                    <td className="px-6 py-4 text-gray-500">{formatDate(e.date as string)}</td>
                    <td className="px-6 py-4 font-medium text-primary-600">{e.reference as string}</td>
                    <td className="px-6 py-4 text-gray-500">{(e.journal as Record<string, unknown>)?.name as string}</td>
                    <td className="px-6 py-4">{e.description as string}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(e.totalDebit as number, currency)}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(e.totalCredit as number, currency)}</td>
                    <td className="px-6 py-4"><StatusBadge status={e.status as string} /></td>
                    <td className="px-6 py-4">
                      {e.status === 'DRAFT' && (
                        <button onClick={() => postEntry.mutate(e.id as string)} className="text-xs text-primary-600 hover:underline">Valider</button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Code</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Intitule</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.map((a: Record<string, unknown>) => (
                <tr key={a.id as string} className="table-row">
                  <td className="px-6 py-4 font-mono text-gray-500">{a.code as string}</td>
                  <td className="px-6 py-4 font-medium">{a.name as string}</td>
                  <td className="px-6 py-4"><span className="badge badge-blue">{a.type as string}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'balance' && (
        <div className="card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Compte</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Debit</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Credit</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Solde</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {balance.map((b: Record<string, unknown>, i: number) => (
                <tr key={i} className="table-row">
                  <td className="px-6 py-4"><span className="font-mono text-gray-500 mr-2">{b.code as string}</span>{b.name as string}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(b.debit as number, currency)}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(b.credit as number, currency)}</td>
                  <td className={`px-6 py-4 text-right font-medium ${(b.balance as number) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(b.balance as number), currency)}
                    {(b.balance as number) < 0 ? ' Cr' : ' Dr'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
