import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Send, Trash2, Eye, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { invoicingService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/format';
import StatusBadge from '../../components/ui/StatusBadge';
import { exportToCsv } from '../../utils/exportCsv';
import { useAuthStore } from '../../store/auth.store';

export default function InvoicesPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicingService.list(),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => invoicingService.send(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const invoices = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
          <p className="text-gray-500 text-sm mt-1">Factures, devis et avoirs</p>
        </div>
        <div className="flex items-center gap-2">
          {invoices.length > 0 && (
            <button
              onClick={() => exportToCsv('factures', ['Numéro', 'Client', 'Type', 'Date', 'Échéance', 'Montant', 'Payé', 'Statut'],
                invoices.map((i: Record<string, unknown>) => [i.number as string, (i.customer as Record<string, unknown>)?.name as string, i.type as string, (i.issueDate as string)?.slice(0, 10), (i.dueDate as string)?.slice(0, 10), Number(i.total), Number(i.paidAmount || 0), i.status as string]))}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Exporter
            </button>
          )}
          <Link to="/invoicing/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouvelle facture
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Numero</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Client</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Echeance</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Montant</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Statut</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">Chargement...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p>Aucune facture. Creez-en une maintenant !</p>
                </td></tr>
              ) : invoices.map((inv: Record<string, unknown>) => (
                <tr key={inv.id as string} className="table-row">
                  <td className="px-6 py-4 font-medium text-primary-600">{inv.number as string}</td>
                  <td className="px-6 py-4">{(inv.customer as Record<string, unknown>)?.name as string}</td>
                  <td className="px-6 py-4">
                    <span className="badge badge-blue">{inv.type as string}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(inv.issueDate as string)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(inv.dueDate as string)}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(inv.total as number, currency)}</td>
                  <td className="px-6 py-4"><StatusBadge status={inv.status as string} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {inv.status === 'DRAFT' && (
                        <button
                          onClick={() => sendMutation.mutate(inv.id as string)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                          title="Envoyer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <Link to={`/invoicing/${inv.id}`} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
