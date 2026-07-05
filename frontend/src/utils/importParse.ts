// Aides de conversion pour l'import de fichiers (Excel/CSV/collage Word).

/** Normalise un texte pour comparer des en-têtes : minuscules, sans accents ni ponctuation. */
export function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Convertit un nombre saisi à la française : "15 000", "15.000", "12,5"…
 * Retourne undefined si la valeur n'est pas un nombre.
 */
export function parseNumberFr(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  let s = String(value).trim().replace(/[\s ]/g, '').replace(/(f?cfa|xof|fr?)$/i, '');
  if (!s) return undefined;
  // "15.000" ou "1.234.567" -> points = séparateurs de milliers
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  // "15,000" (milliers) vs "12,5" (décimal) : si , suivie de 3 chiffres en groupes -> milliers
  if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Convertit une date "15/01/2024", "15-01-2024" ou "2024-01-15" en ISO "YYYY-MM-DD".
 * Retourne undefined si invalide.
 */
export function parseDateFr(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** Découpe un texte collé depuis Word/Excel en tableau (tabulations, sinon ; sinon ,). */
export function parsePastedText(text: string): string[][] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/ /g, ' ')).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  return lines.map((l) => l.split(sep).map((c) => c.trim()));
}
