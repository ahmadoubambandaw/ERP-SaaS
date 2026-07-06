import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, AlertTriangle, Loader2, Download, UploadCloud, Camera, LayoutGrid, ScanLine, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { inventoryService } from '../../services/api';
import { getApiError } from '../../utils/apiError';
import { exportToCsv } from '../../utils/exportCsv';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import ImportModal, { ImportColumn } from '../../components/import/ImportModal';
import { parseNumberFr } from '../../utils/importParse';
import { fileToSquareDataUrl } from '../../utils/imageFile';
import BarcodeScanner from '../../components/ui/BarcodeScanner';

interface ProductGroup {
  name: string;
  count: number;
  image: string | null;
}

// Couleur stable par nom de groupe pour les pastilles sans photo
const GROUP_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
function groupColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return GROUP_COLORS[h % GROUP_COLORS.length];
}

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'Nom du produit', required: true, aliases: ['produit', 'article', 'designation', 'libelle'], example: 'Riz parfumé 25kg' },
  { key: 'code', label: 'Code', aliases: ['reference', 'ref', 'sku', 'codeproduit'], example: 'RIZ-25' },
  { key: 'category', label: 'Catégorie', aliases: ['famille', 'rayon'], example: 'Alimentation' },
  { key: 'costPrice', label: 'Prix d\'achat', aliases: ['prixachat', 'achat', 'cout', 'pa'], example: '12 500' },
  { key: 'salePrice', label: 'Prix de vente', aliases: ['prixvente', 'vente', 'prix', 'pv', 'prixunitaire'], example: '14 000' },
  { key: 'reorderLevel', label: 'Seuil d\'alerte stock', aliases: ['seuil', 'stockmin', 'minimum'], example: '5' },
  { key: 'unitOfMeasure', label: 'Unité', aliases: ['unite', 'mesure'], example: 'pcs' },
  { key: 'barcode', label: 'Code-barres', aliases: ['codebarre', 'codebarres', 'ean', 'qr', 'barcode'], example: '6181234567890' },
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
  const [showScanner, setShowScanner] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const productPhotoRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setValue } = useForm();

  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: () => inventoryService.products() });
  const { data: lowData } = useQuery({ queryKey: ['low-stock'], queryFn: () => inventoryService.lowStock() });
  const { data: catData } = useQuery({ queryKey: ['product-categories'], queryFn: () => inventoryService.categories() });

  const allProducts = data?.data?.data || [];
  const lowStock = lowData?.data?.data || [];
  const groups: ProductGroup[] = catData?.data?.data || [];

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [uploadingGroup, setUploadingGroup] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingGroupRef = useRef<string | null>(null);

  const products = useMemo(
    () => (activeGroup ? allProducts.filter((p: Record<string, unknown>) => p.category === activeGroup) : allProducts),
    [allProducts, activeGroup],
  );

  const photoMutation = useMutation({
    mutationFn: ({ name, image }: { name: string; image: string | null }) =>
      inventoryService.setCategoryImage(name, image),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Photo du groupe enregistrée');
    },
    onError: (err: unknown) => toast.error(getApiError(err, 'Impossible d\'enregistrer la photo')),
    onSettled: () => setUploadingGroup(null),
  });

  const pickGroupPhoto = (name: string) => {
    pendingGroupRef.current = name;
    photoInputRef.current?.click();
  };

  const handleGroupPhotoFile = async (file: File) => {
    const name = pendingGroupRef.current;
    if (!name) return;
    try {
      setUploadingGroup(name);
      const image = await fileToSquareDataUrl(file);
      photoMutation.mutate({ name, image });
    } catch (e) {
      setUploadingGroup(null);
      toast.error((e as Error).message);
    }
  };

  const mutation = useMutation({
    mutationFn: (d: unknown) => inventoryService.createProduct(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      setShowForm(false);
      setErrorMsg('');
      setProductImage(null);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue produits</h1>
          <p className="text-gray-500 text-sm">{products.length} produit(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            if (row.barcode) payload.barcode = row.barcode;
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

      {/* ===== Groupes de produits (avec photo de représentation) ===== */}
      {groups.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-900">Groupes de produits</h3>
            <span className="text-xs text-gray-400">— touchez 📷 pour ajouter une photo</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveGroup(null)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[86px]"
            >
              <div className={`w-[74px] h-[74px] rounded-2xl flex items-center justify-center bg-gray-900 text-white ${activeGroup === null ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
                <Package className="w-7 h-7" />
              </div>
              <span className="text-xs font-medium text-gray-700">Tous</span>
              <span className="text-[10px] text-gray-400 -mt-1">{allProducts.length}</span>
            </button>

            {groups.map((g) => (
              <div key={g.name} className="flex flex-col items-center gap-1.5 shrink-0 w-[86px]">
                <div className="relative">
                  <button
                    onClick={() => setActiveGroup(activeGroup === g.name ? null : g.name)}
                    className={`block w-[74px] h-[74px] rounded-2xl overflow-hidden ${activeGroup === g.name ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
                    title={`Afficher les produits « ${g.name} »`}
                  >
                    {g.image ? (
                      <img src={g.image} alt={g.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-white text-2xl font-bold ${groupColor(g.name)}`}>
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => pickGroupPhoto(g.name)}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-primary-600 shadow-sm"
                    title={`Changer la photo de « ${g.name} »`}
                  >
                    {uploadingGroup === g.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-xs font-medium text-gray-700 truncate w-full text-center">{g.name}</span>
                <span className="text-[10px] text-gray-400 -mt-1">{g.count} produit{g.count > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleGroupPhotoFile(f);
              e.target.value = '';
            }}
          />
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
          <form
            onSubmit={handleSubmit((d) => mutation.mutate({ ...d, ...(productImage ? { image: productImage } : {}) }))}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {/* Photo du produit */}
            <div className="col-span-full flex items-center gap-4">
              <button
                type="button"
                onClick={() => productPhotoRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary-400 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0"
                title="Ajouter une photo du produit"
              >
                {productImage ? (
                  <img src={productImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-gray-400" />
                )}
              </button>
              <div>
                <p className="text-sm font-medium text-gray-700">Photo du produit</p>
                <p className="text-xs text-gray-400">Visible sur la caisse — prenez-la directement avec le téléphone.</p>
                {productImage && (
                  <button type="button" onClick={() => setProductImage(null)} className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                    <X className="w-3 h-3" /> Retirer la photo
                  </button>
                )}
              </div>
              <input
                ref={productPhotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try { setProductImage(await fileToSquareDataUrl(f)); }
                  catch (err) { toast.error((err as Error).message); }
                }}
              />
            </div>

            <div><label className="label">Code *</label><input {...register('code', { required: true })} className="input" /></div>
            <div className="col-span-2"><label className="label">Nom *</label><input {...register('name', { required: true })} className="input" /></div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Code-barres / QR</label>
              <div className="flex gap-2">
                <input {...register('barcode')} className="input flex-1" placeholder="EAN, QR…" />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="px-3 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0"
                  title="Scanner le code-barres avec la caméra"
                >
                  <ScanLine className="w-4 h-4" />
                </button>
              </div>
            </div>
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
              <button type="button" onClick={() => { setShowForm(false); setErrorMsg(''); setProductImage(null); reset(); }} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          title="Scanner le code du produit"
          onClose={() => setShowScanner(false)}
          onDetected={(code) => {
            setValue('barcode', code);
            setShowScanner(false);
            toast.success(`Code-barres capturé : ${code}`);
          }}
        />
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
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
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {p.code as string}
                      {Boolean(p.barcode) && (
                        <span className="mt-0.5 text-[10px] text-gray-400 flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> {p.barcode as string}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <span className="flex items-center gap-2.5">
                        {p.image ? (
                          <img src={p.image as string} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <span className="w-9 h-9 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </span>
                        )}
                        {p.name as string}
                      </span>
                    </td>
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
