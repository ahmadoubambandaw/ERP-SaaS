import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, AlertTriangle, Loader2, Download, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { inventoryService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { exportToCsv } from '../../utils/exportCsv';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import ImportModal, { ImportColumn } from '../../components/import/ImportModal';
import { parseNumberFr } from '../../utils/importParse';

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'Nom du produit', required: true, aliases: ['produit', 'article', 'designation', 'libelle'], example: 'Riz parfumé 25kg' },
  { key: 'code', label: 'Code', aliases: ['reference', 'ref', 'sku', 'codeproduit'], example: 'RIZ-25' },
  { key: 'category', label: 'Catégorie', aliases: ['famille', 'rayon'], example: 'Alimentation' },
  { key: 'costPrice', label: 'Prix d\'achat', aliases: ['prixachat', 'achat', 'cout', 'pa'], example: '12 500' },
  { key: 'salePrice', label: 'Prix de vente', aliases: ['prixvente', 'vente', 'prix', 'pv', 'prixunitaire'], example: '14 000' },
  { key: 'reorderLevel', label: 'Seuil d\'alerte stock', aliases: ['seuil', 'stockmin', 'minimum'], example: '5' },
  { key: 'unitOfMeasure', label: 'Unité', aliases: ['unite', 'mesure'], example: 'pcs' },
];

// Code produit généré quand la colonne est absente (cahiers sans références)
function autoCode(name: string): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'ART';
  return `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export default function ProductsPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: () => inventoryService.products() });
  const { data: lowData } = useQuery({ queryKey: ['low-stock'], queryFn: () => inventoryService.lowStock() });

  const products = data?.data?.data || [];
  const lowStock = lowData?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (d: unknown) => inventoryService.createProduct(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowForm(false);
      setErrorMsg('');
      reset();
      toast.success('Produit enregistré');
    },
    onError: (err: unknown) => {
      setErrorMsg(getApiError(err, 'Erreur lors de l\'enregistrement du produit'));
    },
  });

  const getStock = (p: Record<string, unknown>) => {
    const levels = p.stockLevels as Array<{ quantity: number }>;
    return levels?.reduce((s, l) => s + Number(l.quantity), 0) || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue produits</h1>
          <p className="text-gray-500 text-sm">{products.length} produit(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <button
              onClick={() => exportToCsv('produits', ['Code', 'Nom', 'Catégorie', 'Unité', 'Prix achat', 'Prix vente', 'TVA (%)', 'Stock'],
                products.map((pr: Record<string, unknown>) => [pr.code as string, pr.name as string, pr.category as string, pr.unitOfMeasure as string, pr.costPrice ? Number(pr.costPrice) : '', pr.salePrice ? Number(pr.salePrice) : '', Number(pr.taxRate || 0), getStock(pr)]))}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Exporter
            </button>
          )}
          <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> Importer
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau produit
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal
          title="Importer des produits"
          description="Récupérez votre catalogue depuis Excel, Word ou votre cahier. Si vos produits n'ont pas de code, Naatal en génère un automatiquement."
          templateName="produits"
          columns={IMPORT_COLUMNS}
          toPayload={(row) => {
            if (!row.name) return 'Le nom du produit est obligatoire';
            const payload: Record<string, unknown> = {
              name: row.name,
              code: row.code || autoCode(row.name),
              unitOfMeasure: row.unitOfMeasure || 'pcs',
            };
            if (row.category) payload.category = row.category;
            const cost = parseNumberFr(row.costPrice);
            const sale = parseNumberFr(row.salePrice);
            const reorder = parseNumberFr(row.reorderLevel);
            if (cost !== undefined) payload.costPrice = cost;
            if (sale !== undefined) payload.salePrice = sale;
            if (reorder !== undefined) payload.reorderLevel = reorder;
            return payload;
          }}
          onRow={(payload) => inventoryService.createProduct(payload)}
          onDone={(n) => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success(`${n} produit(s) importé(s)`); }}
          onClose={() => setShowImport(false)}
        />
      )}

      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <p className="text-sm text-orange-700">
            <strong>{lowStock.length}</strong> produit(s) en dessous du seuil de reapprovisionnement
          </p>
        </div>
      )}

      {showForm && (
        <div className="card p-6 border-2 border-primary-100">
          <h3 className="font-semibold mb-4">Nouveau produit</h3>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="label">Code *</label><input {...register('code', { required: true })} className="input" /></div>
            <div className="col-span-2"><label className="label">Nom *</label><input {...register('name', { required: true })} className="input" /></div>
            <div><label className="label">Categorie</label><input {...register('category')} className="input" /></div>
            <div><label className="label">Unite de mesure</label>
              <select {...register('unitOfMeasure')} className="input">
                <option value="pcs">Piece</option>
                <option value="kg">Kilogramme</option>
                <option value="l">Litre</option>
                <option value="m">Metre</option>
                <option value="box">Boite</option>
              </select>
            </div>
            <div><label className="label">Prix d'achat</label><input {...register('costPrice', { valueAsNumber: true })} type="number" step="1" className="input" /></div>
            <div><label className="label">Prix de vente</label><input {...register('salePrice', { valueAsNumber: true })} type="number" step="1" className="input" /></div>
            <div><label className="label">Seuil reappro.</label><input {...register('reorderLevel', { valueAsNumber: true })} type="number" className="input" /></div>
            <div><label className="label">TVA (%)</label><input {...register('taxRate', { valueAsNumber: true })} type="number" step="0.5" className="input" /></div>
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
            <th className="text-left px-6 py-3 font-medium text-gray-500">Code</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Produit</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500">Categorie</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Prix achat</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Prix vente</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500">Stock</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
              : products.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400">Aucun produit</p>
              </td></tr>
              : products.map((p: Record<string, unknown>) => {
                const stock = getStock(p);
                const isLow = Boolean(p.reorderLevel) && stock <= Number(p.reorderLevel);
                return (
                  <tr key={p.id as string} className="table-row">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{p.code as string}</td>
                    <td className="px-6 py-4 font-medium">{p.name as string}</td>
                    <td className="px-6 py-4 text-gray-500">{(p.category as string) || '-'}</td>
                    <td className="px-6 py-4 text-right">{p.costPrice ? formatCurrency(p.costPrice as number, currency) : '-'}</td>
                    <td className="px-6 py-4 text-right">{p.salePrice ? formatCurrency(p.salePrice as number, currency) : '-'}</td>
                    <td className={`px-6 py-4 text-right font-medium ${isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                      {stock} {p.unitOfMeasure as string}
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 inline ml-1" />}
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
