import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TYPE_LABELS: Record<string, string> = {
  INVOICE: 'FACTURE',
  QUOTE: 'DEVIS',
  PROFORMA: 'FACTURE PROFORMA',
  CREDIT_NOTE: 'AVOIR',
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  ORANGE_MONEY: 'Orange Money',
  WAVE: 'Wave',
  MTN_MONEY: 'MTN Money',
  FREE_MONEY: 'Free Money',
  MOOV_MONEY: 'Moov Money',
  CHECK: 'Chèque',
};

interface PdfOrganization {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  currency?: string;
  logo?: string | null;
}

interface PdfInvoice {
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
  customer: { name: string; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; taxId?: string | null };
  lines: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number; total: number }>;
  payments: Array<{ amount: number; date: string; method: string; reference?: string | null }>;
  organization?: PdfOrganization;
}

function money(amount: number, currency: string): string {
  return `${Math.round(Number(amount)).toLocaleString('fr-FR')} ${currency}`;
}

function fdate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

function buildInvoiceDoc(inv: PdfInvoice, fallbackOrgName?: string): jsPDF {
  const org = inv.organization || {};
  const orgName = org.name || fallbackOrgName || 'Mon Entreprise';
  const currency = org.currency || 'XOF';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // ===== Header band =====
  doc.setFillColor(17, 24, 39); // gray-900
  doc.rect(0, 0, pageWidth, 34, 'F');

  // Logo (white rounded tile so any logo stays readable on the dark band)
  let textX = margin;
  if (org.logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 6, 22, 22, 2, 2, 'F');
      doc.addImage(org.logo, margin + 2, 8, 18, 18);
      textX = margin + 27;
    } catch {
      textX = margin; // corrupt image data: fall back to text-only header
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(orgName, textX, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const orgLines = [org.address, org.phone, org.email, org.taxId ? `NINEA/NIF : ${org.taxId}` : null]
    .filter(Boolean) as string[];
  orgLines.forEach((line, i) => doc.text(line, textX, 19 + i * 4));

  // Document type + number (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(TYPE_LABELS[inv.type] || 'FACTURE', pageWidth - margin, 15, { align: 'right' });
  doc.setFontSize(11);
  doc.text(inv.number, pageWidth - margin, 22, { align: 'right' });

  // ===== Meta + customer =====
  let y = 44;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURÉ À', margin, y);
  doc.text('DÉTAILS', pageWidth - margin - 55, y);

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y + 1.5, margin + 70, y + 1.5);
  doc.line(pageWidth - margin - 55, y + 1.5, pageWidth - margin, y + 1.5);

  y += 7;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10.5);
  doc.text(inv.customer.name, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  const custLines = [
    inv.customer.address,
    inv.customer.city,
    inv.customer.phone,
    inv.customer.email,
    inv.customer.taxId ? `NINEA/NIF : ${inv.customer.taxId}` : null,
  ].filter(Boolean) as string[];
  custLines.forEach((line, i) => doc.text(line, margin, y + 5 + i * 4));

  // details block
  doc.setTextColor(90, 90, 90);
  const details: Array<[string, string]> = [
    ["Date d'émission", fdate(inv.issueDate)],
    ["Date d'échéance", fdate(inv.dueDate)],
  ];
  details.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, pageWidth - margin - 55, y + i * 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, pageWidth - margin, y + i * 5, { align: 'right' });
    doc.setTextColor(90, 90, 90);
  });

  y = Math.max(y + custLines.length * 4 + 12, y + 18);

  // ===== Lines table =====
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Qté', 'Prix unit.', 'TVA', 'Total']],
    body: inv.lines.map((l) => [
      l.description,
      Number(l.quantity).toLocaleString('fr-FR'),
      money(l.unitPrice, currency),
      `${Number(l.taxRate)}%`,
      money(l.total, currency),
    ]),
    styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 34 },
    },
    alternateRowStyles: { fillColor: [248, 249, 251] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursorY = (doc as any).lastAutoTable.finalY + 6;

  // ===== Totals =====
  const totalsX = pageWidth - margin - 70;
  const totals: Array<[string, string, boolean]> = [
    ['Sous-total', money(inv.subtotal, currency), false],
    ['TVA', money(inv.taxAmount, currency), false],
    ['TOTAL', money(inv.total, currency), true],
  ];
  if (Number(inv.paidAmount) > 0) {
    totals.push(['Payé', money(inv.paidAmount, currency), false]);
    totals.push(['Reste à payer', money(Number(inv.total) - Number(inv.paidAmount), currency), true]);
  }

  totals.forEach(([label, value, strong]) => {
    if (strong) {
      doc.setFillColor(240, 244, 255);
      doc.rect(totalsX - 3, cursorY - 4.2, 73 + 3, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }
    doc.setTextColor(strong ? 30 : 90, strong ? 30 : 90, strong ? 60 : 90);
    doc.text(label, totalsX, cursorY);
    doc.text(value, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += 7;
  });

  // ===== Payments =====
  if (inv.payments.length > 0) {
    cursorY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('PAIEMENTS REÇUS', margin, cursorY);
    autoTable(doc, {
      startY: cursorY + 2,
      margin: { left: margin, right: margin },
      head: [['Date', 'Mode', 'Référence', 'Montant']],
      body: inv.payments.map((p) => [
        fdate(p.date),
        METHOD_LABELS[p.method] || p.method,
        p.reference || '—',
        money(p.amount, currency),
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [40, 40, 40] },
      headStyles: { fillColor: [243, 244, 246], textColor: [70, 70, 70], fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Notes =====
  if (inv.notes) {
    cursorY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('NOTES', margin, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    const noteLines = doc.splitTextToSize(inv.notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, cursorY + 5);
  }

  // ===== Footer =====
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  const footerParts = [orgName, org.taxId ? `NINEA/NIF : ${org.taxId}` : null, org.phone, org.email].filter(Boolean);
  doc.text(footerParts.join('  •  '), pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('Merci de votre confiance', pageWidth / 2, pageHeight - 7, { align: 'center' });

  return doc;
}

/** Download the invoice as a PDF file. */
export function generateInvoicePdf(inv: PdfInvoice, fallbackOrgName?: string) {
  buildInvoiceDoc(inv, fallbackOrgName).save(`${inv.number}.pdf`);
}

/** Base64 payload (no data: prefix) for email attachments. */
export function getInvoicePdfBase64(inv: PdfInvoice, fallbackOrgName?: string): string {
  return buildInvoiceDoc(inv, fallbackOrgName).output('datauristring').split(',')[1];
}
