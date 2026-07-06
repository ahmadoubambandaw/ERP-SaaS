// Impression d'un ticket de caisse au format thermique (80 mm).
// Utilise une iframe cachée pour éviter le blocage des popups.

interface ReceiptLine {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
}

interface ReceiptOrg {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  logo?: string | null;
}

export interface ReceiptData {
  org: ReceiptOrg;
  number: string;
  date: Date | string;
  lines: ReceiptLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  methodLabel: string;
  amountReceived?: number | null;
  change?: number | null;
  cashier?: string | null;
}

function money(n: number, currency: string): string {
  const digits = ['XOF', 'XAF', 'GNF'].includes(currency) ? 0 : 2;
  return `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${currency}`;
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

export function buildReceiptHtml(d: ReceiptData): string {
  const dt = new Date(d.date);
  const dateStr = dt.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const rows = d.lines
    .map((l) => {
      const qty = Number(l.quantity);
      const pu = Number(l.unitPrice);
      const tot = Number(l.total);
      return `
        <tr>
          <td colspan="2" class="name">${esc(l.description)}</td>
        </tr>
        <tr class="sub">
          <td>${qty.toLocaleString('fr-FR')} × ${money(pu, d.currency)}</td>
          <td class="r">${money(tot, d.currency)}</td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 80mm;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #000;
    padding: 4mm 3mm 6mm;
    line-height: 1.35;
  }
  .center { text-align: center; }
  .r { text-align: right; }
  .logo { max-width: 40mm; max-height: 18mm; margin: 0 auto 4px; display: block; }
  .shop { font-size: 15px; font-weight: bold; }
  .muted { font-size: 10px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0; vertical-align: top; }
  .name { font-weight: bold; padding-top: 3px; }
  tr.sub td { font-size: 11px; padding-bottom: 2px; }
  .totals td { padding: 1px 0; }
  .grand td { font-size: 15px; font-weight: bold; padding-top: 3px; }
  .pay { font-weight: bold; }
  .thanks { margin-top: 8px; font-size: 12px; }
</style></head>
<body>
  <div class="center">
    ${d.org.logo ? `<img src="${esc(d.org.logo)}" class="logo"/>` : ''}
    <div class="shop">${esc(d.org.name || 'Boutique')}</div>
    ${d.org.address ? `<div class="muted">${esc(d.org.address)}</div>` : ''}
    ${d.org.phone ? `<div class="muted">Tél : ${esc(d.org.phone)}</div>` : ''}
    ${d.org.taxId ? `<div class="muted">NINEA/RC : ${esc(d.org.taxId)}</div>` : ''}
  </div>
  <hr/>
  <div class="muted">Ticket : <b>${esc(d.number)}</b></div>
  <div class="muted">${esc(dateStr)}</div>
  ${d.cashier ? `<div class="muted">Caissier : ${esc(d.cashier)}</div>` : ''}
  <hr/>
  <table>${rows}</table>
  <hr/>
  <table class="totals">
    <tr><td>Sous-total</td><td class="r">${money(d.subtotal, d.currency)}</td></tr>
    ${d.taxAmount > 0 ? `<tr><td>TVA</td><td class="r">${money(d.taxAmount, d.currency)}</td></tr>` : ''}
    <tr class="grand"><td>TOTAL</td><td class="r">${money(d.total, d.currency)}</td></tr>
  </table>
  <hr/>
  <div class="pay">Paiement : ${esc(d.methodLabel)}</div>
  ${d.amountReceived != null ? `<div>Reçu : ${money(d.amountReceived, d.currency)}</div>` : ''}
  ${d.change != null && d.change > 0 ? `<div>Monnaie : ${money(d.change, d.currency)}</div>` : ''}
  <div class="center thanks">
    Merci de votre visite !<br/>
    <span class="muted">Naatal · by Ndaw-Tech</span>
  </div>
</body></html>`;
}

export function printReceipt(d: ReceiptData): void {
  printHtmlDocument(buildReceiptHtml(d));
}

// ==================== Z de caisse (rapport de journée) ====================

export interface ZReportData {
  org: ReceiptOrg;
  date: Date | string;
  count: number;
  total: number;
  byMethod: Record<string, number>;
  currency: string;
  cashier?: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  BANK_TRANSFER: 'Carte bancaire',
  MTN_MONEY: 'MTN Money',
  FREE_MONEY: 'Free Money',
  MOOV_MONEY: 'Moov Money',
  CHECK: 'Chèque',
};

export function methodLabel(method: string): string {
  return METHOD_LABELS[method] || method;
}

export function buildZReportHtml(d: ZReportData): string {
  const dt = new Date(d.date);
  const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const printedAt = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const methodRows = Object.entries(d.byMethod)
    .sort(([, a], [, b]) => b - a)
    .map(([m, amt]) => `<tr><td>${esc(methodLabel(m))}</td><td class="r">${money(amt, d.currency)}</td></tr>`)
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 80mm;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #000;
    padding: 4mm 3mm 6mm;
    line-height: 1.4;
  }
  .center { text-align: center; }
  .r { text-align: right; }
  .shop { font-size: 15px; font-weight: bold; }
  .title { font-size: 14px; font-weight: bold; margin-top: 4px; }
  .muted { font-size: 10px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .grand td { font-size: 15px; font-weight: bold; padding-top: 4px; }
</style></head>
<body>
  <div class="center">
    <div class="shop">${esc(d.org.name || 'Boutique')}</div>
    <div class="title">RAPPORT DE CAISSE (Z)</div>
    <div class="muted">${esc(dateStr)}</div>
  </div>
  <hr/>
  <table>
    <tr><td>Nombre de ventes</td><td class="r"><b>${d.count}</b></td></tr>
    <tr class="grand"><td>TOTAL ENCAISSÉ</td><td class="r">${money(d.total, d.currency)}</td></tr>
  </table>
  <hr/>
  <div><b>Par moyen de paiement</b></div>
  <table>${methodRows || '<tr><td class="muted" colspan="2">Aucune vente</td></tr>'}</table>
  <hr/>
  ${d.cashier ? `<div class="muted">Édité par : ${esc(d.cashier)}</div>` : ''}
  <div class="muted">Imprimé le ${esc(printedAt)}</div>
  <div class="center muted" style="margin-top:6px">Naatal · by Ndaw-Tech</div>
</body></html>`;
}

export function printZReport(d: ZReportData): void {
  printHtmlDocument(buildZReportHtml(d));
}

// ==================== Impression via iframe cachée ====================

function printHtmlDocument(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  triggerPrint(iframe);
}

function triggerPrint(iframe: HTMLIFrameElement): void {

  let printed = false;
  const trigger = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    }
  };

  // Laisse le temps aux images (logo) de se charger avant l'impression
  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => setTimeout(trigger, 150);
  }
  setTimeout(trigger, 600);
}
