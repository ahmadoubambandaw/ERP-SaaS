/**
 * CSV export tuned for French Excel: UTF-8 BOM (accents display
 * correctly) and semicolon separator (default list separator in
 * fr locales).
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
) {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const content = [headers, ...rows]
    .map((row) => row.map(escape).join(';'))
    .join('\r\n');

  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
