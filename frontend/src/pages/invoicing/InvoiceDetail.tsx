import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Send, Trash2, Plus, CreditCard, Loader2, Download, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { invoicingService } from '../../services/api';
import { generateInvoicePdf, getInvoicePdfBase64 } from '../../utils/invoicePdf';
import { getApiError } from '../../utils/apiError';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'MTN_MONEY', label: 'MTN Money' },
  { value: 'FREE_MONEY', label: 'Free Money' },
  { value: 'MOOV_MONEY', label: 'Moov Money' },
  { value: 'CHECK', label: 'Chèque' },
];

const TYPE_LABELS: Record<string, string> = {
  INVOICE: 'Facture',
  QUOTE: 'Devis',
  PROFORMA: 'Proforma',
  CREDIT_NOTE: 'Avoir',
};

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface InvoicePayment {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference?: string;
  notes?: string;
}

interface Invoice {
  id: string;
  number: string;
  type: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  notes?: string;
  customer: {
    id: string; name: string; email?: string; phone?: string;
    address?: string; city?: string; taxId?: string;
  };
  lines: InvoiceLine[];
  payments: InvoicePayment[];
  organization?: {
    name?: string; address?: string; phone?: string;
    email?: string; taxId?: string; currency?: string; logo?: string;
  };
}

interface PaymentFormData {
  amount: number;
  date: string;
  method: string;
  reference: string;
  notes: string;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const qc = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicingService.get(id!),
    enabled: !!id,
  });

  const inv = data?.data?.data as Invoice | undefined;

  const sendMutation = useMutation({
    mutationFn: () => invoicingService.send(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success('Facture marquée comme envoyée');
    },
    onError: (err: unknown) => toast.error(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => invoicingService.delete(id!),
    onSuccess: () => {
      toast.success('Facture supprimée');
      navigate('/invoicing');
    },
    onError: (err: unknown) => toast.error(getApiError(err)),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PaymentFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      method: 'CASH',
      amount: 0,
      reference: '',
      notes: '',
    },
  });
  const watchedAmount = watch('amount');

  const emailMutation = useMutation({
    mutationFn: () => invoicingService.emailInvoice(id!, {
      to: emailTo,
      message: emailMessage || undefined,
      pdfBase64: getInvoicePdfBase64(inv!, organization?.name),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      setShowEmailForm(false);
      setEmailMessage('');
      toast.success(`Email envoyé à ${emailTo}`);
    },
    onError: (err: unknown) => toast.error(getApiError(err)),
  });

  const paymentMutation = useMutation({
    mutationFn: (formData: PaymentFormData) => invoicingService.addPayment(id!, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setShowPaymentForm(false);
      reset();
      toast.success('Paiement enregistré');
    },
    onError: (err: unknown) => toast.error(getApiError(err)),
  });

  if (isLoading) {
    return <div className="text-center py-20 text-gray-400">Chargement...</div>;
  }

  if (error || !inv) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Facture introuvable</p>
        <Link to="/invoicing" className="text-primary-600 hover:underline mt-2 inline-block">
          Retour aux factures
        </Link>
      </div>
    );
  }

  const remaining = Number(inv.total) - Number(inv.paidAmount);
  const isDraft = inv.status === 'DRAFT';
  const isCancelled = inv.status === 'CANCELLED';
  const isPaid = inv.status === 'PAID';
  const canReceivePayment = !isPaid && !isCancelled && inv.status !== 'DRAFT';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoicing')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{inv.number}</h1>
              <span className="badge badge-blue">{TYPE_LABELS[inv.type] ?? inv.type}</span>
              <StatusBadge status={inv.status} />
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{inv.customer.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateInvoicePdf(inv, organization?.name)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
          {!isCancelled && (
            <button
              onClick={() => { setEmailTo(inv.customer.email || ''); setShowEmailForm(true); }}
              className="btn-secondary flex items-center gap-2"
            >
              <Mail className="w-4 h-4" /> Envoyer par email
            </button>
          )}
          {isDraft && (
            <>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="btn-secondary flex items-center gap-2"
              >
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {canReceivePayment && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Enregistrer un paiement
            </button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Date d'émission</p>
          <p className="font-semibold">{formatDate(inv.issueDate)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Échéance</p>
          <p className="font-semibold">{formatDate(inv.dueDate)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Montant total</p>
          <p className="font-bold text-lg text-primary-600">{formatCurrency(inv.total, currency)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Reste à payer</p>
          <p className={`font-bold text-lg ${remaining > 0 ? 'text-orange-500' : 'text-green-600'}`}>
            {remaining <= 0 ? '✓ Soldé' : formatCurrency(remaining, currency)}
          </p>
        </div>
      </div>

      {/* Payment form */}
      {showPaymentForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-500" />
            Enregistrer un paiement
          </h3>
          <form onSubmit={handleSubmit((d) => paymentMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Montant *</label>
                <input
                  {...register('amount', { required: true, valueAsNumber: true, min: 0.01 })}
                  type="number"
                  step="1"
                  min="0"
                  className="input"
                  placeholder={String(remaining)}
                />
                {errors.amount && <p className="text-xs text-red-500 mt-1">Montant invalide</p>}
                {Number(watchedAmount) > remaining && remaining > 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    Supérieur au solde ({formatCurrency(remaining, currency)})
                  </p>
                )}
              </div>
              <div>
                <label className="label">Date *</label>
                <input {...register('date', { required: true })} type="date" className="input" />
              </div>
              <div>
                <label className="label">Mode de paiement *</label>
                <select {...register('method', { required: true })} className="input">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Référence</label>
                <input {...register('reference')} className="input" placeholder="N° reçu, virement..." />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <input {...register('notes')} className="input" placeholder="Notes optionnelles" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowPaymentForm(false); reset(); }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" disabled={paymentMutation.isPending} className="btn-primary">
                {paymentMutation.isPending ? 'Enregistrement...' : 'Enregistrer le paiement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lines */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Lignes de facturation</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Description</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500 w-20">Qté</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500 w-32">Prix unit.</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500 w-20">TVA</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500 w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {inv.lines.map((line, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-3">{line.description}</td>
                <td className="px-6 py-3 text-right text-gray-500">{Number(line.quantity).toLocaleString()}</td>
                <td className="px-6 py-3 text-right text-gray-500">{formatCurrency(line.unitPrice, currency)}</td>
                <td className="px-6 py-3 text-right text-gray-500">{Number(line.taxRate)}%</td>
                <td className="px-6 py-3 text-right font-medium">{formatCurrency(line.total, currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={4} className="px-6 py-3 text-right text-gray-500">Sous-total</td>
              <td className="px-6 py-3 text-right font-medium">{formatCurrency(inv.subtotal, currency)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="px-6 py-3 text-right text-gray-500">TVA</td>
              <td className="px-6 py-3 text-right font-medium">{formatCurrency(inv.taxAmount, currency)}</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td colSpan={4} className="px-6 py-3 text-right font-bold text-gray-900">Total</td>
              <td className="px-6 py-3 text-right font-bold text-lg text-primary-600">
                {formatCurrency(inv.total, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payments history */}
      {inv.payments.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Historique des paiements</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Mode</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Référence</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inv.payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">{formatDate(p.date)}</td>
                  <td className="px-6 py-3 text-gray-500">
                    {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                  </td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">{p.reference ?? '—'}</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-600">
                    {formatCurrency(p.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={3} className="px-6 py-3 font-semibold text-gray-700">Total encaissé</td>
                <td className="px-6 py-3 text-right font-bold text-green-600">
                  {formatCurrency(inv.paidAmount, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Notes */}
      {inv.notes && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">{inv.notes}</p>
        </div>
      )}

      {/* Email dialog */}
      {showEmailForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEmailForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Envoyer {inv.number} par email</h3>
                <p className="text-sm text-gray-500 mt-0.5">Le PDF sera joint automatiquement.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Destinataire *</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="input"
                  placeholder="client@email.com"
                />
              </div>
              <div>
                <label className="label">Message (optionnel)</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="input h-24 resize-none"
                  placeholder="Un message personnalisé pour votre client..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEmailForm(false)} className="btn-secondary">Annuler</button>
              <button
                onClick={() => emailMutation.mutate()}
                disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTo) || emailMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {emailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {emailMutation.isPending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette facture ?"
        message={`${inv.number} — cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
