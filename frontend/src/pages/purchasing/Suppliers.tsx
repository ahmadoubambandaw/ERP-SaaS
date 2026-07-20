import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck, Loader2, Download, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { invoicingService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { exportToCsv } from '../../utils/exportCsv';
import ImportModal, { ImportColumn } from '../../components/import/ImportModal';

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'Nom', required: true, aliases: ['fournisseur', 'societe', 'entreprise'], example: 'Ets Fall & Frères' },
  { key: 'phone', label: 'Téléphone', aliases: ['tel', 'telephone', 'portable', 'numero', 'contact'], example: '33 800 00 00' },
  { key: 'email', label: 'Email', aliases: ['mail', 'adresseemail', 'courriel'], example: 'contact@fall.sn' },
  { key: 'address', label: 'Adresse', aliases: ['ville', 'quartier', 'localite'], example: 'Sandaga, Dakar' },
  { key: 'country', label: 'Pays', aliases: [], example: 'Sénégal' },
  { key: 'taxId', label: 'NINEA/NIF', aliases: ['ninea', 'nif'], example: '' },
];

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  taxId: string;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  taxId?: string;
}

export default function SuppliersPage() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormData>();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => invoicingService.suppliers(),
  });
  const suppliers: Supplier[] = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (d: SupplierFormData) => invoicingService.createSupplier(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setShowForm(false);
      setErrorMsg('');
      reset();
      toast.success('Fournisseur enregistré');
    },
    onError: (err: unknown) => {
      setErrorMsg(getApiError(err, 'Erreur lors de l\'enregistrement du fournisseur'));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500 text-sm">{suppliers.length} fournisseur(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {suppliers.length > 0 && (
            <button
              onClick={() => exportToCsv('fournisseurs', ['Nom', 'Email', 'Téléphone', 'Adresse', 'Pays', 'NINEA/NIF'],
                suppliers.map((sp) => [sp.name, sp.email, sp.phone, sp.address, sp.country, sp.taxId]))}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Exporter
            </button>
          )}
          <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> Importer
          </button>
          <button onClick={() => { setShowForm(true); setErrorMsg(''); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau fournisseur
          </button>
        </div>
        {showImport && (
          <ImportModal
            title="Importer des fournisseurs"
            templateName="fournisseurs"
            columns={IMPORT_COLUMNS}
            toPayload={(row) => {
              if (!row.name) return 'Le nom du fournisseur est obligatoire';
              const payload: Record<string, unknown> = { name: row.name };
              if (row.phone) payload.phone = row.phone;
              if (row.email) payload.email = row.email;
              if (row.address) payload.address = row.address;
              if (row.country) payload.country = row.country;
              if (row.taxId) payload.taxId = row.taxId;
              return payload;
            }}
            onRow={(payload) => invoicingService.createSupplier(payload)}
            onDone={(n) => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success(`${n} fournisseur(s) importé(s)`); }}
            onClose={() => setShowImport(false)}
          />
        )}
      </div>

      {showForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold mb-4">Nouveau fournisseur</h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Nom *</label>
              <input {...register('name', { required: 'Requis' })} className="input" placeholder="Nom du fournisseur" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="contact@fournisseur.com" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input {...register('phone')} className="input" placeholder="+221 33 000 00 00" />
            </div>
            <div>
              <label className="label">Adresse</label>
              <input {...register('address')} className="input" />
            </div>
            <div>
              <label className="label">Pays</label>
              <input {...register('country')} className="input" placeholder="Sénégal" />
            </div>
            <div>
              <label className="label">NINEA / NIF</label>
              <input {...register('taxId')} className="input" />
            </div>
            <div className="col-span-full flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); reset(); setErrorMsg(''); }} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Nom</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Téléphone</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Pays</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">NINEA/NIF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Truck className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 mb-4">Aucun fournisseur enregistré</p>
                  <button onClick={() => setShowForm(true)} className="btn-secondary text-sm">
                    Ajouter le premier fournisseur
                  </button>
                </td>
              </tr>
            ) : suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{s.name}</td>
                <td className="px-6 py-4 text-gray-500">{s.email || '-'}</td>
                <td className="px-6 py-4 text-gray-500">{s.phone || '-'}</td>
                <td className="px-6 py-4 text-gray-500">{s.country || '-'}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{s.taxId || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
