import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search, ScanLine, Plus, Minus, Trash2, X, Banknote, ArrowLeft,
  Printer, Check, ShoppingCart, Camera, Delete, BarChart3, Receipt,
} from 'lucide-react';
import { CashLogo, WaveLogo, MaxItLogo, CardLogo } from '../../components/ui/PayLogos';
import BarcodeScanner from '../../components/ui/BarcodeScanner';
import QRCode from 'qrcode';
import { posService, organizationService } from '../../services/api';
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

const METHODS: {
  id: Method;
  label: string;
  logo: (props: { className?: string }) => JSX.Element;
  bg: string;
}[] = [
  { id: 'CASH', label: 'Espèces', logo: CashLogo, bg: '#0E9F6E' },
  { id: 'WAVE', label: 'Wave', logo: WaveLogo, bg: '#5BC0EF' },
  { id: 'ORANGE_MONEY', label: 'Orange Money', logo: MaxItLogo, bg: '#FF7900' },
  { id: 'BANK_TRANSFER', label: 'Carte bancaire', logo: CardLogo, bg: '#1F2A5A' },
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
  const navigate = useNavigate();
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
    <div className="h-[100dvh] flex flex-col bg-gray-100 overflow-hidden">
      {/* ===== Barre de caisse (la caisse est une app à part entière) ===== */}
      <header className="bg-gray-900 text-white flex items-center gap-2 px-2.5 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-white/10 active:scale-90"
          title="Retour à Naatal"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ScanLine className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold leading-none">Caisse</p>
            <p className="text-[11px] text-gray-400 truncate">{organization?.name}</p>
          </div>
        </div>
        <button
          onClick={() => setScanOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium"
          title="Scanner avec la caméra"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">Scanner</span>
        </button>
        <button
          onClick={() => setSummaryOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium"
          title="Rapport de caisse du jour (Z)"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">Journée</span>
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* ----- Catalogue ----- */}
        <div className="flex-1 flex flex-col min-h-0 p-2.5 sm:p-3">
          <div className="relative mb-2 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit ou scanner…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-sky-500 text-sm"
            />
          </div>

          {/* Tuiles de catégories (style caisse) */}
          {categories.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-1.5 mb-2 shrink-0">
              <button
                onClick={() => setCategory(null)}
                className={`py-3 px-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-white truncate transition active:scale-95 ${!category ? 'bg-sky-800' : 'bg-sky-500 hover:bg-sky-600'}`}
              >
                Tout
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c === category ? null : c)}
                  className={`py-3 px-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-white truncate transition active:scale-95 ${category === c ? 'bg-sky-800' : 'bg-sky-500 hover:bg-sky-600'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Cartes produits */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {isLoading ? (
              <p className="text-gray-500 p-6 text-center">Chargement…</p>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 p-10">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Aucun produit. Ajoutez des produits dans Stocks.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="text-left bg-white rounded-lg border border-gray-200 hover:border-sky-400 hover:shadow transition active:scale-[0.97] p-2.5 flex flex-col justify-between min-h-[86px]"
                  >
                    <p className="text-xs font-semibold leading-tight line-clamp-2">{p.name}</p>
                    <div className="flex items-end justify-between gap-1 mt-2">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(p.salePrice, currency)}</span>
                      {p.image ? (
                        <img src={p.image} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                      ) : (
                        <span className={`w-3 h-3 rounded-full mb-1 shrink-0 ${tileColor(p.name)}`} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ----- Ticket (desktop) ----- */}
        <div className="hidden lg:flex w-[340px] shrink-0 flex-col bg-white border-l border-gray-200 min-h-0">
          <CartPanel
            cart={cart}
            currency={currency}
            total={total}
            setQty={setQty}
            onCheckout={() => setTenderOpen(true)}
            onClear={() => setCart([])}
          />
        </div>
      </div>

      {/* ----- Barre panier (mobile) ----- */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-30 flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-600 text-white shadow-lg"
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
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
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
        <BarcodeScanner
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

// ==================== Ticket (style caisse pro) ====================
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const sel = cart.find((l) => l.key === selectedKey);
  const itemCount = cart.reduce((s, l) => s + l.quantity, 0);
  const tax = cart.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate / 100), 0);
  const lineTotal = (l: CartLine) => l.quantity * l.unitPrice * (1 + l.taxRate / 100);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h2 className="font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-sky-600" /> Ticket
        </h2>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        )}
      </div>

      {/* En-têtes de colonnes */}
      <div className="grid grid-cols-[1fr_2.5rem_5.5rem] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 shrink-0">
        <span>Produit</span>
        <span className="text-center">Qté</span>
        <span className="text-right">Total</span>
      </div>

      {/* Lignes du ticket — toucher une ligne pour la modifier */}
      <div className="flex-1 overflow-y-auto min-h-[100px]">
        {cart.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-10">Touchez un produit pour l'ajouter</p>
        ) : (
          cart.map((l) => {
            const active = l.key === selectedKey;
            return (
              <button
                key={l.key}
                onClick={() => setSelectedKey(active ? null : l.key)}
                className={`w-full grid grid-cols-[1fr_2.5rem_5.5rem] items-center px-4 py-2.5 text-left border-b border-gray-50 transition ${active ? 'bg-sky-600 text-white' : 'hover:bg-gray-50'}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{l.description}</span>
                  <span className={`block text-[11px] ${active ? 'text-sky-100' : 'text-gray-400'}`}>
                    {formatCurrency(l.unitPrice, currency)} / u
                  </span>
                </span>
                <span className="text-center font-semibold">{l.quantity}</span>
                <span className="text-right text-sm font-bold">{formatCurrency(lineTotal(l), currency)}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Contrôles de la ligne sélectionnée */}
      {sel && (
        <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border-t border-sky-100 shrink-0">
          <button
            onClick={() => { if (sel.quantity <= 1) setSelectedKey(null); setQty(sel.key, sel.quantity - 1); }}
            className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-bold">{sel.quantity}</span>
          <button
            onClick={() => setQty(sel.key, sel.quantity + 1)}
            className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90"
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="flex-1 text-right text-sm font-bold">{formatCurrency(lineTotal(sel), currency)}</span>
          <button
            onClick={() => { setQty(sel.key, 0); setSelectedKey(null); }}
            className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 text-red-500 flex items-center justify-center active:scale-90"
            title="Supprimer la ligne"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Totaux */}
      <div className="px-4 py-2.5 border-t border-gray-100 text-sm space-y-1 shrink-0">
        <div className="flex justify-between text-gray-500">
          <span>Articles</span><span>{itemCount}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Dont TVA</span><span>{formatCurrency(tax, currency)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1">
          <span className="font-semibold text-gray-700">TOTAL</span>
          <span className="text-2xl font-extrabold text-gray-900">{formatCurrency(total, currency)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 pt-0 shrink-0">
        <button
          disabled={cart.length === 0}
          onClick={() => { onClear(); setSelectedKey(null); }}
          className="px-4 py-3.5 rounded-lg bg-red-500 text-white font-bold text-sm uppercase disabled:opacity-40 active:scale-95"
        >
          Vider
        </button>
        <button
          disabled={cart.length === 0}
          onClick={onCheckout}
          className="flex-1 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-lg uppercase tracking-wide disabled:opacity-40 active:scale-[0.98] transition"
        >
          Payer
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
  const [step, setStep] = useState<Method | null>(null);

  // Coordonnées d'encaissement du commerçant (lien Wave, numéro Mobile Money)
  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationService.get(),
  });
  const org = orgData?.data?.data as
    | { name?: string; phone?: string; wavePaymentLink?: string; mobileMoneyNumber?: string }
    | undefined;
  const momoNumber = org?.mobileMoneyNumber || org?.phone || '';

  if (!step) {
    return (
      <Modal onClose={onClose} title="Paiement">
        <p className="text-center text-3xl font-extrabold mb-5">{formatCurrency(total, currency)}</p>
        <div className="grid grid-cols-2 gap-3">
          {METHODS.map((m) => {
            const Logo = m.logo;
            return (
              <button
                key={m.id}
                onClick={() => setStep(m.id)}
                style={{ backgroundColor: m.bg }}
                className="flex flex-col items-center justify-center gap-2.5 py-6 rounded-2xl text-white font-bold active:scale-95 transition shadow-sm"
              >
                <Logo className="h-10" />
                {m.label}
              </button>
            );
          })}
        </div>
      </Modal>
    );
  }

  const back = () => setStep(null);
  if (step === 'CASH') {
    return <CashStep total={total} currency={currency} onClose={onClose} onBack={back} onConfirm={onConfirm} />;
  }
  if (step === 'WAVE') {
    return (
      <WaveStep
        total={total} currency={currency} onClose={onClose} onBack={back}
        waveLink={org?.wavePaymentLink} number={momoNumber}
        onConfirm={() => onConfirm('WAVE', 'Wave', null)}
      />
    );
  }
  if (step === 'ORANGE_MONEY') {
    return (
      <MobileMoneyStep
        title="Orange Money" accent="#FF7900"
        total={total} currency={currency} onClose={onClose} onBack={back}
        number={momoNumber}
        hint="Le client envoie le montant sur ce numéro depuis Max it ou en composant #144#."
        onConfirm={() => onConfirm('ORANGE_MONEY', 'Orange Money', null)}
      />
    );
  }
  return (
    <CardStep
      total={total} currency={currency} onClose={onClose} onBack={back}
      onConfirm={() => onConfirm('BANK_TRANSFER', 'Carte bancaire', null)}
    />
  );
}

// ---- Espèces : pavé numérique + rendu monnaie ----
function CashStep({
  total, currency, onClose, onBack, onConfirm,
}: {
  total: number;
  currency: string;
  onClose: () => void;
  onBack: () => void;
  onConfirm: (method: Method, label: string, amountReceived: number | null) => void;
}) {
  const [received, setReceived] = useState('');
  const receivedNum = parseInt(received || '0', 10) || 0;
  const change = receivedNum - total;

  function press(v: string) {
    if (v === 'C') return setReceived('');
    if (v === '⌫') return setReceived((s) => s.slice(0, -1));
    setReceived((s) => (s + v).slice(0, 12));
  }

  return (
    <Modal onClose={onClose} title="Espèces" onBack={onBack}>
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

// ---- Wave : QR à scanner par le client + ouverture de l'app ----
function WaveStep({
  total, currency, onClose, onBack, onConfirm, waveLink, number,
}: {
  total: number;
  currency: string;
  onClose: () => void;
  onBack: () => void;
  onConfirm: () => void;
  waveLink?: string;
  number?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);

  // Lien marchand Wave avec le montant pré-rempli
  const payUrl = waveLink
    ? `${waveLink}${waveLink.includes('?') ? '&' : '?'}amount=${Math.round(total)}`
    : null;

  useEffect(() => {
    if (!payUrl) return;
    QRCode.toDataURL(payUrl, { width: 480, margin: 1, color: { dark: '#0B2E4E' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [payUrl]);

  return (
    <Modal onClose={onClose} title="Wave" onBack={onBack}>
      <div className="text-center mb-3">
        <p className="text-sm text-gray-500">À payer</p>
        <p className="text-3xl font-extrabold" style={{ color: '#00A5E0' }}>{formatCurrency(total, currency)}</p>
      </div>

      {payUrl ? (
        <>
          <div className="flex flex-col items-center mb-3">
            {qr && <img src={qr} alt="QR Wave" className="w-52 h-52 rounded-xl border border-gray-200" />}
            <p className="text-sm text-gray-600 text-center mt-2">
              Le client <b>scanne ce QR avec son app Wave</b> — le montant est déjà rempli.
            </p>
          </div>
          <a
            href={payUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold mb-3"
            style={{ backgroundColor: '#5BC0EF' }}
          >
            <WaveLogo className="h-6" /> Ouvrir Wave
          </a>
        </>
      ) : (
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mb-3 text-center">
          {number ? (
            <>
              <p className="text-sm text-gray-600 mb-1">Le client envoie le montant par Wave au&nbsp;:</p>
              <p className="text-2xl font-extrabold tracking-wide">{number}</p>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Ajoutez votre <b>lien de paiement Wave</b> ou votre numéro dans{' '}
              <b>Paramètres → Entreprise</b> pour afficher un QR à scanner.
            </p>
          )}
        </div>
      )}

      <button
        onClick={onConfirm}
        className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-[0.98]"
      >
        ✓ Paiement reçu — valider
      </button>
      <p className="text-[11px] text-gray-400 text-center mt-2">
        Validez uniquement après avoir reçu la notification Wave.
      </p>
    </Modal>
  );
}

// ---- Orange Money / autre mobile money : numéro + raccourci USSD ----
function MobileMoneyStep({
  title, accent, total, currency, onClose, onBack, onConfirm, number, hint,
}: {
  title: string;
  accent: string;
  total: number;
  currency: string;
  onClose: () => void;
  onBack: () => void;
  onConfirm: () => void;
  number?: string;
  hint: string;
}) {
  return (
    <Modal onClose={onClose} title={title} onBack={onBack}>
      <div className="text-center mb-3">
        <p className="text-sm text-gray-500">À payer</p>
        <p className="text-3xl font-extrabold" style={{ color: accent }}>{formatCurrency(total, currency)}</p>
      </div>

      <div className="rounded-xl p-4 mb-3 text-center border" style={{ backgroundColor: `${accent}14`, borderColor: `${accent}33` }}>
        {number ? (
          <>
            <p className="text-sm text-gray-600 mb-1">Numéro du marchand&nbsp;:</p>
            <p className="text-2xl font-extrabold tracking-wide">{number}</p>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Ajoutez votre <b>numéro Mobile Money</b> dans <b>Paramètres → Entreprise</b> pour l'afficher ici.
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">{hint}</p>
      </div>

      <a
        href="tel:%23144%23"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold mb-3"
        style={{ backgroundColor: accent }}
      >
        Composer #144#
      </a>

      <button
        onClick={onConfirm}
        className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-[0.98]"
      >
        ✓ Paiement reçu — valider
      </button>
      <p className="text-[11px] text-gray-400 text-center mt-2">
        Validez uniquement après avoir reçu le SMS / la notification de réception.
      </p>
    </Modal>
  );
}

// ---- Carte bancaire : encaissement sur TPE ----
function CardStep({
  total, currency, onClose, onBack, onConfirm,
}: {
  total: number;
  currency: string;
  onClose: () => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onClose={onClose} title="Carte bancaire" onBack={onBack}>
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">À encaisser sur votre TPE</p>
        <p className="text-3xl font-extrabold text-[#1F2A5A]">{formatCurrency(total, currency)}</p>
      </div>
      <div className="flex justify-center mb-4">
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1F2A5A' }}>
          <CardLogo className="h-14" />
        </div>
      </div>
      <ol className="text-sm text-gray-600 space-y-1.5 mb-4 list-decimal list-inside">
        <li>Saisissez <b>{formatCurrency(total, currency)}</b> sur votre terminal de paiement.</li>
        <li>Le client insère ou approche sa carte.</li>
        <li>Attendez le ticket « <b>Transaction acceptée</b> ».</li>
      </ol>
      <button
        onClick={onConfirm}
        className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-[0.98]"
      >
        ✓ Paiement accepté — valider
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
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:m-4 sm:pb-5 max-h-[92vh] overflow-y-auto">
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
