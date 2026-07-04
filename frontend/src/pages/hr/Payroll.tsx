import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Check, Loader2, X, Download } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { hrService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { exportToCsv } from '../../utils/exportCsv';

export default function PayrollPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [errorMsg, setErrorMsg] = useState('');
  const [toApprove, setToApprove] = useState<Record<string, unknown> | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['payslips', period], queryFn: () => hrService.payslips(period) });
  const payslips = data?.data?.data || [];

  const generateMutation = useMutation({
    mutationFn: () => hrService.generatePayslips(period),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['payslips'] }); setErrorMsg(''); toast.success(`${res?.data?.data?.length ?? ''} bulletin(s) généré(s)`); },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de la génération de la paie')),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrService.approvePayslip(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payslips'] }); setToApprove(null); toast.success('Bulletin approuvé'); },
    onError: (err: unknown) => setErrorMsg(getApiError(err)),
  });

  const totalNet = payslips.reduce((s: number, p: Record<string, unknown>) => s + Number(p.netSalary), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulletins de paie</h1>
          <p className="text-gray-500 text-sm">Gestion de la paie mensuelle</p>
        </div>
        <div className="flex items-center gap-3">
          {payslips.length > 0 && (
            <button
              onClick={() => exportToCsv(`paie-${period}`, ['Employé', 'Poste', 'Salaire brut', 'Cotisations', 'IRPP', 'Salaire net', 'Statut'],
                payslips.map((ps: Record<string, unknown>) => {
                  const emp = ps.employee as Record<string, unknown>;
                  return [`${emp?.firstName} ${emp?.lastName}`, emp?.position as string, Number(ps.baseSalary), Number(ps.socialSecurity), Number(ps.incomeTax), Number(ps.netSalary), ps.status as string];
                }))}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Exporter
            </button>
          )}
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="input w-40" />
          <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="btn-primary flex items-center gap-2">
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {generateMutation.isPending ? 'Génération...' : 'Générer la paie'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {payslips.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-sm text-gray-500">Bulletins</p>
            <p className="text-2xl font-bold">{payslips.length}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-sm text-gray-500">Masse salariale nette</p>
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(totalNet, currency)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-sm text-gray-500">Approuves</p>
            <p className="text-2xl font-bold text-green-600">{payslips.filter((p: Record<string, unknown>) => p.status === 'APPROVED').length}</p>
          </div>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left px-6 py-3 font-medium text-gray-500">Employe</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Salaire brut</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Cotisations</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">IRPP</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Salaire net</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
            <th className="px-6 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
              : payslips.length === 0 ? <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                Aucun bulletin pour cette periode. Cliquez sur "Generer la paie".
              </td></tr>
              : payslips.map((p: Record<string, unknown>) => (
                <tr key={p.id as string} className="table-row">
                  <td className="px-6 py-4 font-medium">
                    {(p.employee as Record<string, unknown>)?.firstName as string} {(p.employee as Record<string, unknown>)?.lastName as string}
                    <p className="text-xs text-gray-400">{(p.employee as Record<string, unknown>)?.position as string}</p>
                  </td>
                  <td className="px-6 py-4 text-right">{formatCurrency(p.baseSalary as number, currency)}</td>
                  <td className="px-6 py-4 text-right text-orange-600">{formatCurrency(p.socialSecurity as number, currency)}</td>
                  <td className="px-6 py-4 text-right text-orange-600">{formatCurrency(p.incomeTax as number, currency)}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(p.netSalary as number, currency)}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status as string} /></td>
                  <td className="px-6 py-4">
                    {p.status === 'DRAFT' && (
                      <button onClick={() => setToApprove(p)} className="p-1.5 hover:bg-green-50 text-green-600 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!toApprove}
        title="Approuver ce bulletin ?"
        message={toApprove ? `${(toApprove.employee as Record<string, unknown>)?.firstName} ${(toApprove.employee as Record<string, unknown>)?.lastName} — net à payer : ${formatCurrency(toApprove.netSalary as number, currency)}` : ''}
        confirmLabel="Approuver"
        loading={approveMutation.isPending}
        onConfirm={() => toApprove && approveMutation.mutate(toApprove.id as string)}
        onCancel={() => setToApprove(null)}
      />
    </div>
  );
}
