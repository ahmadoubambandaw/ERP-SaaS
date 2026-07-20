import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Loader2, Download, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { invoicingService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { exportToCsv } from '../../utils/exportCsv';
import ImportModal, { ImportColumn } from '../../components/import/ImportModal';

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'Nom', required: true, aliases: ['client', 'nomclient', 'prenom', 'nomcomplet'], example: 'Awa Diop' },
  { key: 'phone', label: 'Téléphone', aliases: ['tel', 'telephone', 'portable', 'numero', 'contact'], example: '77 123 45 67' },
  { key: 'email', label: 'Email', aliases: ['mail', 'adresseemail', 'courriel'], example: 'awa@exemple.com' },
  { key: 'city', label: 'Ville', aliases: ['adresse', 'quartier', 'localite'], example: 'Dakar' },
  { key: 'taxId', label: 'NINEA/NIF', aliases: ['ninea', 'nif'], example: '' },
  { key: 'type', label: 'Type', aliases: ['categorie'], example: 'Particulier' },
];

export default function CustomersPage() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => invoicingService.customers() });
  const customers = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (data: unknown) => invoicingService.createCustomer(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setShowForm(false); setErrorMsg(''); reset(); toast.success('Client enregistré'); },
    onError: (err: unknown) => setErrorMsg(getApiError(err, 'Erreur lors de l\'enregistrement du client')),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <div className="flex items-center gap-2">
          {customers.length > 0 && (
            <button
              onClick={() => exportToCsv('clients', ['Nom', 'Email', 'Téléphone', 'Ville', 'Type', 'NINEA/NIF'],
                customers.map((c: Record<string, unknown>) => [c.name as string, c.email as string, c.phone as string, c.city as string, c.type as string, c.taxId as string]))}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Exporter
            </button>
          )}
          <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> Importer
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau client
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal
          title="Importer des clients"
          description="Récupérez votre liste de clients depuis Excel, Word ou votre cahier — plus besoin de tout retaper."
          templateName="clients"
          columns={IMPORT_COLUMNS}
          toPayload={(row) => {
            if (!row.name) return 'Le nom du client est obligatoire';
            const type = /partic|individ/i.test(row.type) ? 'INDIVIDUAL' : 'COMPANY';
            const payload: Record<string, unknown> = { name: row.name, type };
            if (row.phone) payload.phone = row.phone;
            if (row.email) payload.email = row.email;
            if (row.city) payload.city = row.city;
            if (row.taxId) payload.taxId = row.taxId;
            return payload;
          }}
          onRow={(payload) => invoicingService.createCustomer(payload)}
          onDone={(n) => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success(`${n} client(s) importé(s)`); }}
          onClose={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Nouveau client</h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="label">Nom *</label><input {...register('name', { required: true })} className="input" /></div>
            <div><label className="label">Email</label><input {...register('email')} type="email" className="input" /></div>
            <div><label className="label">Telephone</label><input {...register('phone')} className="input" /></div>
            <div><label className="label">Ville</label><input {...register('city')} className="input" /></div>
            <div><label className="label">NINEA/NIF</label><input {...register('taxId')} className="input" /></div>
            <div><label className="label">Type</label>
              <select {...register('type')} className="input">
                <option value="COMPANY">Entreprise</option>
                <option value="INDIVIDUAL">Particulier</option>
              </select>
            </div>
            <div className="col-span-full flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setErrorMsg(''); reset(); }} className="btn-secondary">Annuler</button>
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
          <thead><tr className="border-b border-gray-100">
            <th className="text-left px-6 py-3 font-medium text-gray-500">Nom</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Telephone</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Ville</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
              : customers.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400">Aucun client enregistre</p>
              </td></tr>
              : customers.map((c: Record<string, unknown>) => (
                <tr key={c.id as string} className="table-row">
                  <td className="px-6 py-4 font-medium">{c.name as string}</td>
                  <td className="px-6 py-4 text-gray-500">{c.email as string || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{c.phone as string || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{c.city as string || '-'}</td>
                  <td className="px-6 py-4"><span className="badge badge-blue">{c.type as string}</span></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
