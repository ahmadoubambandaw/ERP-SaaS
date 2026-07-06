import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search, ScanLine, Plus, Minus, Trash2, X, Banknote, Smartphone,
  CreditCard, Printer, Check, ShoppingCart, Camera, Delete, BarChart3, Receipt,
} from 'lucide-react';
import { posService } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/format';
import { printReceipt, printZReport, methodLabel, ReceiptData } from '../../utils/posReceipt';

interface PosProduct {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  category: string | null;
  image: string | null;
  salePrice: number;
  taxRate: number;
  unitOfMeasure: string;
  stock: number;
}

interface CartLine {
  key: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

type Method = 'CASH' | 'WAVE' | 'ORANGE_MONEY' | 'BANK_TRANSFER';

const METHODS: { id: Method; label: string; icon: typeof Banknote; color: string }[] = [
  { id: 'CASH', label: 'Espèces', icon: Banknote, color: 'bg-emerald-500' },
  { id: 'WAVE', label: 'Wave', icon: Smartphone, color: 'bg-sky-500' },
  { id: 'ORANGE_MONEY', label: 'Orange Money', icon: Smartphone, color: 'bg-orange-500' },
  { id: 'BANK_TRANSFER', label: 'Carte bancaire', icon: CreditCard, color: 'bg-indigo-500' },
];

function tileColor(seed: string): string {
  const colors = [
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500',
    'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500', 'bg-fuchsia-500',
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

export default function POS() {
  const { organization, user } = useAuthStore();
  const currency = organization?.currency || 'XOF';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pos-catalog'],
    queryFn: () => posService.catalog(),
  });
  const products: PosProduct[] = data?.data?.data || [];

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tenderOpen, setTenderOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [cartOpen, setCartOpen] = useState(false); // mobile drawer
  const [scanOpen, setScanOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [products, search, category]);

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + l.taxRate / 100), 0),
    [cart],
  );
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  function addProduct(p: PosProduct) {
    setCart((prev) => {
      const found = prev.find((l) => l.productId === p.id);
      if (found) {
        return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        { key: p.id, productId: p.id, description: p.name, quantity: 1, unitPrice: p.salePrice, taxRate: p.taxRate },
      ];
    });
  }

  function setQty(key: string, qty: number) {
    setCart((prev) =>
      qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: qty } : l)),
    );
  }

  function findByCode(code: string): PosProduct | undefined {
    const c = code.trim().toLowerCase();
    return products.find((p) => (p.barcode || '').toLowerCase() === c || p.code.toLowerCase() === c);
  }

  function handleScanned(code: string) {
    const p = findByCode(code);
    if (p) {
      addProduct(p);
      toast.success(p.name, { duration: 1200 });
    } else {
      toast.error(`Aucun produit pour « ${code} »`);
    }
  }

  // ---- Lecteur code-barres USB/Bluetooth (émulation clavier) ----
  const bufferRef = useRef('');
  const lastRef = useRef(0);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      const now = Date.now();
      if (now - lastRef.current > 80) bufferRef.current = '';
      lastRef.current = now;
      if (e.key === 'Enter') {
        const code = bufferRef.current;
        bufferRef.current = '';
        if (code.length >= 3) handleScanned(code);
        return;
      }
      if (e.key.length === 1) bufferRef.current += e.key;
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  async function doSale(method: Method, methodLabel: string, amountReceived: number | null) {
    if (!cart.length) return;
    const t = toast.loading('Enregistrement…');
    try {
      const res = await posService.sale({
        lines: cart.map((l) => ({
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
        })),
        method,
        methodLabel,
        amountReceived: amountReceived ?? undefined,
        currency,
      });
      const payload = res.data.data;
      const inv = payload.invoice;
      const rec: ReceiptData = {
        org: inv.organization || {},
        number: inv.number,
        date: inv.issueDate || new Date(),
        lines: inv.lines.map((l: { description: string; quantity: number; unitPrice: number; total: number }) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.total,
        })),
        subtotal: Number(inv.subtotal),
        taxAmount: Number(inv.taxAmount),
        total: Number(inv.total),
        currency: inv.currency || currency,
        methodLabel,
        amountReceived,
        change: payload.change,
        cashier: user ? `${user.firstName} ${user.lastName}` : null,
      };
      toast.success('Vente enregistrée', { id: t });
      setTenderOpen(false);
      setCart([]);
      setCartOpen(false);
      setReceipt(rec);
      printReceipt(rec);
      refetch();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Échec de la vente', { id: t });
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-full lg:overflow-hidden">
      {/* ----- Catalogue ----- */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit ou scanner…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <button
            onClick={() => setScanOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium"
            title="Scanner avec la caméra"
          >
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">Scanner</span>
          </button>
          <button
            onClick={() => setSummaryOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium"
            title="Rapport de caisse du jour (Z)"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Journée</span>
          </button>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-1">
            <button
              onClick={() => setCategory(null)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${!category ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Tout
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c === category ? null : c)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${category === c ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <p className="text-gray-500 p-6 text-center">Chargement…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 p-10">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Aucun produit. Ajoutez des produits dans Stocks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="group text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-primary-400 hover:shadow-md transition active:scale-95"
                >
                  <div className="h-16 sm:h-20 w-full relative">
                    {p.image ? (
                      <img src={p.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${tileColor(p.name)}`}>
                        <span className="text-white text-xl font-bold">{p.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-primary-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="px-1.5 py-1">
                    <p className="text-[11px] font-medium line-clamp-2 leading-tight min-h-[1.7rem]">{p.name}</p>
                    <p className="text-xs font-bold text-primary-700">{formatCurrency(p.salePrice, currency)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ----- Panier (desktop) ----- */}
      <div className="hidden lg:flex w-80 flex-shrink-0 flex-col bg-white rounded-2xl border border-gray-200 shadow-sm min-h-0">
        <CartPanel
          cart={cart}
          currency={currency}
          total={total}
          setQty={setQty}
          onCheckout={() => setTenderOpen(true)}
          onClear={() => setCart([])}
        />
      </div>

      {/* ----- Barre panier (mobile) ----- */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between px-5 py-4 rounded-2xl bg-primary-600 text-white shadow-lg"
        >
          <span className="flex items-center gap-2 font-medium">
            <ShoppingCart className="w-5 h-5" />
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </span>
          <span className="font-bold text-lg">{formatCurrency(total, currency)}</span>
        </button>
      )}

      {/* ----- Panier drawer (mobile) ----- */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
            <CartPanel
              cart={cart}
              currency={currency}
              total={total}
              setQty={setQty}
              onCheckout={() => { setCartOpen(false); setTenderOpen(true); }}
              onClear={() => setCart([])}
              onClose={() => setCartOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ----- Encaissement ----- */}
      {tenderOpen && (
        <TenderModal
          total={total}
          currency={currency}
          onClose={() => setTenderOpen(false)}
          onConfirm={doSale}
        />
      )}

      {/* ----- Ticket ----- */}
      {receipt && (
        <ReceiptModal receipt={receipt} currency={currency} onClose={() => setReceipt(null)} />
      )}

      {/* ----- Scanner caméra ----- */}
      {scanOpen && (
        <CameraScanner
          onClose={() => setScanOpen(false)}
          onDetected={(code) => { setScanOpen(false); handleScanned(code); }}
        />
      )}

      {/* ----- Z de caisse ----- */}
      {summaryOpen && (
        <SummaryModal
          currency={currency}
          orgName={organization?.name || null}
          cashier={user ? `${user.firstName} ${user.lastName}` : null}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}

// ==================== Panier ====================
function CartPanel({
  cart, currency, total, setQty, onCheckout, onClear, onClose,
}: {
  cart: CartLine[];
  currency: string;
  total: number;
  setQty: (key: string, qty: number) => void;
  onCheckout: () => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary-600" /> Panier
        </h2>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={onClear} className="text-sm text-gray-400 hover:text-red-500">Vider</button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
        {cart.length === 0 ? (
          <p className="text-gray-400 text-center py-10">Touchez un produit pour l'ajouter</p>
        ) : (
          cart.map((l) => (
            <div key={l.key} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{l.description}</p>
                <p className="text-xs text-gray-500">{formatCurrency(l.unitPrice, currency)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setQty(l.key, l.quantity - 1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90">
                  {l.quantity <= 1 ? <Trash2 className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4" />}
                </button>
                <span className="w-7 text-center font-semibold">{l.quantity}</span>
                <button onClick={() => setQty(l.key, l.quantity + 1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="w-20 text-right text-sm font-bold">
                {formatCurrency(l.quantity * l.unitPrice * (1 + l.taxRate / 100), currency)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-gray-500 text-sm">Total</span>
          <span className="text-xl font-extrabold text-gray-900">{formatCurrency(total, currency)}</span>
        </div>
        <button
          disabled={cart.length === 0}
          onClick={onCheckout}
          className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold disabled:opacity-40 active:scale-[0.98] transition"
        >
          Encaisser
        </button>
      </div>
    </>
  );
}

// ==================== Encaissement ====================
function TenderModal({
  total, currency, onClose, onConfirm,
}: {
  total: number;
  currency: string;
  onClose: () => void;
  onConfirm: (method: Method, label: string, amountReceived: number | null) => void;
}) {
  const [method, setMethod] = useState<{ id: Method; label: string } | null>(null);
  const [received, setReceived] = useState('');
  const receivedNum = parseInt(received || '0', 10) || 0;
  const change = receivedNum - total;

  function press(v: string) {
    if (v === 'C') return setReceived('');
    if (v === '⌫') return setReceived((s) => s.slice(0, -1));
    setReceived((s) => (s + v).slice(0, 12));
  }

  if (!method) {
    return (
      <Modal onClose={onClose} title="Moyen de paiement">
        <p className="text-center text-3xl font-extrabold mb-5">{formatCurrency(total, currency)}</p>
        <div className="grid grid-cols-2 gap-3">
          {METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (m.id === 'CASH') setMethod({ id: m.id, label: m.label });
                  else onConfirm(m.id, m.label, null);
                }}
                className={`flex flex-col items-center gap-2 py-6 rounded-2xl text-white font-bold ${m.color} active:scale-95 transition`}
              >
                <Icon className="w-8 h-8" />
                {m.label}
              </button>
            );
          })}
        </div>
      </Modal>
    );
  }

  // Cash : saisie du montant reçu + rendu monnaie
  return (
    <Modal onClose={onClose} title="Espèces" onBack={() => setMethod(null)}>
      <div className="text-center mb-3">
        <p className="text-sm text-gray-500">À payer</p>
        <p className="text-2xl font-extrabold">{formatCurrency(total, currency)}</p>
      </div>
      <div className="bg-gray-50 rounded-xl p-3 mb-3 text-center">
        <p className="text-xs text-gray-500">Montant reçu</p>
        <p className="text-3xl font-bold">{receivedNum.toLocaleString('fr-FR')}</p>
        {receivedNum > 0 && (
          <p className={`mt-1 font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {change >= 0 ? `Monnaie : ${formatCurrency(change, currency)}` : `Manque : ${formatCurrency(-change, currency)}`}
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="py-4 rounded-xl bg-gray-100 text-xl font-bold active:scale-90 flex items-center justify-center"
          >
            {k === '⌫' ? <Delete className="w-6 h-6" /> : k}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[total, 1000, 2000, 5000, 10000].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).map((v) => (
          <button key={v} onClick={() => setReceived(String(Math.round(v)))} className="py-2 rounded-lg border border-gray-200 text-sm font-medium">
            {Math.round(v).toLocaleString('fr-FR')}
          </button>
        ))}
      </div>
      <button
        disabled={receivedNum < total}
        onClick={() => onConfirm('CASH', 'Espèces', receivedNum)}
        className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg disabled:opacity-40 active:scale-[0.98]"
      >
        Valider la vente
      </button>
    </Modal>
  );
}

// ==================== Ticket ====================
function ReceiptModal({ receipt, currency, onClose }: { receipt: ReceiptData; currency: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose} title="">
      <div className="text-center py-2">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <Check className="w-8 h-8" />
        </div>
        <p className="text-xl font-bold">Vente réussie</p>
        <p className="text-3xl font-extrabold text-gray-900 my-2">{formatCurrency(receipt.total, currency)}</p>
        <p className="text-sm text-gray-500">Ticket {receipt.number} · {receipt.methodLabel}</p>
        {receipt.change != null && receipt.change > 0 && (
          <p className="mt-2 text-emerald-600 font-semibold">Monnaie à rendre : {formatCurrency(receipt.change, currency)}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button onClick={() => printReceipt(receipt)} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 font-medium">
          <Printer className="w-5 h-5" /> Réimprimer
        </button>
        <button onClick={onClose} className="py-3 rounded-xl bg-primary-600 text-white font-bold">
          Nouvelle vente
        </button>
      </div>
    </Modal>
  );
}

// ==================== Z de caisse (rapport de journée) ====================
const METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-500',
  WAVE: 'bg-sky-500',
  ORANGE_MONEY: 'bg-orange-500',
  BANK_TRANSFER: 'bg-indigo-500',
};

function SummaryModal({
  currency, orgName, cashier, onClose,
}: {
  currency: string;
  orgName: string | null;
  cashier: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['pos-summary'],
    queryFn: () => posService.summary(),
    refetchOnMount: 'always',
    staleTime: 0,
  });
  const summary = data?.data?.data as
    | { date: string; count: number; total: number; byMethod: Record<string, number> }
    | undefined;

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <Modal onClose={onClose} title="Journée de caisse">
      <p className="text-center text-sm text-gray-500 capitalize -mt-1 mb-4">{dateStr}</p>

      {isLoading || !summary ? (
        <p className="text-center text-gray-400 py-10">Chargement…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <Receipt className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-2xl font-extrabold">{summary.count}</p>
              <p className="text-xs text-gray-500">Vente{summary.count > 1 ? 's' : ''}</p>
            </div>
            <div className="bg-primary-50 rounded-2xl p-4 text-center">
              <Banknote className="w-5 h-5 mx-auto mb-1 text-primary-500" />
              <p className="text-xl font-extrabold text-primary-700 leading-tight">
                {formatCurrency(summary.total, currency)}
              </p>
              <p className="text-xs text-gray-500">Encaissé</p>
            </div>
          </div>

          <p className="text-sm font-semibold mb-2">Par moyen de paiement</p>
          {Object.keys(summary.byMethod).length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">Aucune vente aujourd'hui.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {Object.entries(summary.byMethod)
                .sort(([, a], [, b]) => b - a)
                .map(([m, amt]) => {
                  const pct = summary.total > 0 ? (amt / summary.total) * 100 : 0;
                  return (
                    <div key={m}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="font-medium">{methodLabel(m)}</span>
                        <span className="font-bold">{formatCurrency(amt, currency)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${METHOD_COLORS[m] || 'bg-gray-400'}`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <button
            onClick={() =>
              printZReport({
                org: { name: orgName },
                date: summary.date,
                count: summary.count,
                total: summary.total,
                byMethod: summary.byMethod,
                currency,
                cashier,
              })
            }
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white font-bold"
          >
            <Printer className="w-5 h-5" /> Imprimer le rapport Z
          </button>
        </>
      )}
    </Modal>
  );
}

// ==================== Scanner caméra ====================
function CameraScanner({ onClose, onDetected }: { onClose: () => void; onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = (window as any).BarcodeDetector;

    async function start() {
      if (!BD || !navigator.mediaDevices?.getUserMedia) {
        setError('La caméra du navigateur ne prend pas en charge le scan. Saisissez le code.');
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new BD({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length) {
              onDetected(codes[0].rawValue);
              return;
            }
          } catch { /* ignore frame errors */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Impossible d'accéder à la caméra. Saisissez le code.");
      }
    }
    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <Modal onClose={onClose} title="Scanner un code-barres">
      {!error ? (
        <div className="rounded-xl overflow-hidden bg-black aspect-video mb-3 relative">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500/80" />
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
          <Camera className="w-4 h-4" /> {error}
        </p>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onDetected(manual.trim()); }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Saisir le code-barres…"
          autoFocus
          className="flex-1 px-3 py-3 rounded-xl border border-gray-300"
        />
        <button type="submit" className="px-5 rounded-xl bg-primary-600 text-white font-medium">OK</button>
      </form>
    </Modal>
  );
}

// ==================== Modal générique ====================
function Modal({ children, onClose, title, onBack }: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  onBack?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:m-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          {onBack ? (
            <button onClick={onBack} className="text-sm text-primary-600 font-medium">‹ Retour</button>
          ) : <span />}
          {title && <h3 className="font-bold text-lg absolute left-1/2 -translate-x-1/2">{title}</h3>}
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
