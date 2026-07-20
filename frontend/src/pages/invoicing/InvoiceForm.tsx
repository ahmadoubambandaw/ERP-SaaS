import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicingService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface InvoiceFormData {
  customerId: string;
  type: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  notes: string;
  lines: LineItem[];
}

export default function InvoiceFormPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { register, control, handleSubmit, watch, reset } = useForm<InvoiceFormData>({
    defaultValues: {
      type: 'INVOICE',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      currency,
      lines: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');
  const docType = watch('type');
  const docLabel = docType === 'QUOTE' ? 'devis' : docType === 'PROFORMA' ? 'proforma' : docType === 'CREDIT_NOTE' ? 'avoir' : 'facture';

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => invoicingService.customers(),
  });
  const customers = customersData?.data?.data || [];

  // Chargement du document en mode édition
  const { data: invData, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicingService.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    const inv = invData?.data?.data;
    if (!inv) return;
    reset({
      customerId: inv.customerId || inv.customer?.id || '',
      type: inv.type,
      issueDate: String(inv.issueDate).split('T')[0],
      dueDate: String(inv.dueDate).split('T')[0],
      currency: inv.currency || currency,
      notes: inv.notes || '',
      lines: (inv.lines || []).map((l: Record<string, unknown>) => ({
        description: String(l.description ?? ''),
        quantity: Number(l.quantity ?? 1),
        unitPrice: Number(l.unitPrice ?? 0),
        taxRate: Number(l.taxRate ?? 0),
      })),
    });
  }, [invData, reset, currency]);

  const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);
  const tax = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * (l.taxRate / 100)), 0);
  const total = subtotal + tax;

  const mutation = useMutation({
    mutationFn: (data: InvoiceFormData) =>
      isEdit ? invoicingService.update(id!, data) : invoicingService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success(isEdit ? 'Document modifié' : 'Document enregistré');
      navigate(isEdit ? `/invoicing/${id}` : '/invoicing');
    },
    onError: (e) => toast.error(getApiError(e, "Échec de l'enregistrement")),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">
            {isEdit ? `Modifier le ${docLabel}` : 'Nouveau document'}
          </h1>
        </div>
      </div>

      {isEdit && loadingInvoice && (
        <div className="py-10 text-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      )}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Informations generales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client</label>
              <select {...register('customerId', { required: true })} className="input">
                <option value="">Selectionner un client</option>
                {customers.map((c: Record<string, unknown>) => (
                  <option key={c.id as string} value={c.id as string}>{c.name as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select {...register('type')} className="input">
                <option value="INVOICE">Facture</option>
                <option value="QUOTE">Devis</option>
                <option value="PROFORMA">Proforma</option>
                <option value="CREDIT_NOTE">Avoir</option>
              </select>
            </div>
            <div>
              <label className="label">Date d'emission</label>
              <input {...register('issueDate')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Date d'echeance</label>
              <input {...register('dueDate')} type="date" className="input" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Lignes de facturation</h3>
            <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, taxRate: 0 })} className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter une ligne
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const lineTotal = (lines[index]?.quantity || 0) * (lines[index]?.unitPrice || 0) * (1 + (lines[index]?.taxRate || 0) / 100);
              return (
                <div key={field.id} className="relative rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs font-semibold text-gray-400">
                    Ligne {index + 1}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label="Supprimer la ligne"
                      className="absolute top-3 right-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="pr-9">
                    <label className="label">Description</label>
                    <input {...register(`lines.${index}.description`)} className="input" placeholder="Description du service/produit" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="label">Qté</label>
                      <input {...register(`lines.${index}.quantity`, { valueAsNumber: true })} type="number" step="0.001" min="0" className="input text-right" />
                    </div>
                    <div>
                      <label className="label">Prix unit.</label>
                      <input {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })} type="number" step="1" min="0" className="input text-right" />
                    </div>
                    <div>
                      <label className="label">TVA %</label>
                      <input {...register(`lines.${index}.taxRate`, { valueAsNumber: true })} type="number" step="0.5" min="0" max="100" className="input text-right" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/70">
                    <span className="text-xs text-gray-500">Total de la ligne</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(lineTotal, currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Sous-total</span><span>{formatCurrency(subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">TVA</span><span>{formatCurrency(tax, currency)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                <span>Total</span><span className="text-primary-600">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <label className="label">Notes</label>
          <textarea {...register('notes')} className="input h-20 resize-none" placeholder="Conditions de paiement, notes..." />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Annuler</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Enregistrer les modifications' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
