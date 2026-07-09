import { useRef, useState } from 'react';
import {
  X, UploadCloud, ClipboardPaste, FileSpreadsheet, Loader2,
  CheckCircle2, AlertTriangle, ArrowLeft, Download, Camera, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiError } from '../../utils/apiError';
import { normalizeHeader, parsePastedText } from '../../utils/importParse';
import { fileToScaledDataUrl } from '../../utils/imageFile';
import { scanService } from '../../services/api';

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
  example?: string;
}

interface ImportModalProps {
  title: string;
  description?: string;
  templateName: string;
  columns: ImportColumn[];
  /** Transforme une ligne mappée en payload API. Retourne un message d'erreur (string) si la ligne est invalide. */
  toPayload: (row: Record<string, string>) => Record<string, unknown> | string;
  /** Crée l'enregistrement (appel API existant). */
  onRow: (payload: Record<string, unknown>) => Promise<unknown>;
  onDone: (imported: number) => void;
  onClose: () => void;
}

type Step = 'source' | 'map' | 'run' | 'done';

export default function ImportModal(props: ImportModalProps) {
  const { title, description, templateName, columns, toPayload, onRow, onDone, onClose } = props;

  const [step, setStep] = useState<Step>('source');
  const [hasHeader, setHasHeader] = useState(true);
  const [pasted, setPasted] = useState('');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({}); // column.key -> index fichier (-1 = ignoré)
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [parsing, setParsing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const autoMap = (hdrs: string[]) => {
    const map: Record<string, number> = {};
    columns.forEach((col) => {
      const candidates = [col.label, col.key, ...(col.aliases || [])].map(normalizeHeader);
      const idx = hdrs.findIndex((h) => candidates.includes(normalizeHeader(h)));
      map[col.key] = idx;
    });
    return map;
  };

  const loadRows = (rows: string[][], headerRow: boolean) => {
    const cleaned = rows.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
    if (!cleaned.length) {
      toast.error('Aucune donnée détectée dans le fichier.');
      return;
    }
    const hdrs = headerRow
      ? cleaned[0].map((h, i) => String(h ?? '').trim() || `Colonne ${i + 1}`)
      : cleaned[0].map((_, i) => `Colonne ${i + 1}`);
    const data = headerRow ? cleaned.slice(1) : cleaned;
    if (!data.length) {
      toast.error('Le fichier ne contient que des titres, pas de données.');
      return;
    }
    setHeaders(hdrs);
    setRawRows(data);
    setMapping(autoMap(hdrs));
    setStep('map');
  };

  // Lignes déjà structurées (issues de la lecture IA) : chaque objet est mappé par clé de colonne
  const loadStructuredRows = (objs: Record<string, string>[]) => {
    const data = objs
      .map((o) => columns.map((c) => String(o[c.key] ?? '').trim()))
      .filter((r) => r.some((v) => v !== ''));
    if (!data.length) {
      toast.error('Rien de lisible n\'a été détecté sur la photo.');
      return;
    }
    setHeaders(columns.map((c) => c.label));
    setRawRows(data);
    setMapping(Object.fromEntries(columns.map((c, i) => [c.key, i]))); // correspondance directe
    setStep('map');
  };

  const handlePhoto = async (file: File) => {
    setScanning(true);
    const t = toast.loading('Lecture de la photo par l\'IA…');
    try {
      const image = await fileToScaledDataUrl(file, 1600, 0.82);
      const res = await scanService.table({
        image,
        columns: columns.map((c) => ({ key: c.key, label: c.label, example: c.example, required: c.required })),
        entity: templateName,
      });
      const rows = (res.data?.data?.rows || []) as Record<string, string>[];
      toast.success(`${rows.length} ligne(s) lue(s) — vérifiez avant d'importer`, { id: t });
      loadStructuredRows(rows);
    } catch (e) {
      toast.error(getApiError(e, 'La lecture de la photo a échoué.'), { id: t });
    } finally {
      setScanning(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' })
        .map((r) => (r as unknown[]).map((c) => String(c ?? '').trim()));
      loadRows(rows, hasHeader);
    } catch (e) {
      console.error(e);
      toast.error('Impossible de lire ce fichier. Utilisez un fichier Excel (.xlsx) ou CSV.');
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handlePaste = () => {
    const rows = parsePastedText(pasted);
    if (!rows.length) {
      toast.error('Collez d\'abord vos données (depuis Word ou Excel).');
      return;
    }
    loadRows(rows, hasHeader);
  };

  const missingRequired = columns.filter((c) => c.required && (mapping[c.key] ?? -1) < 0);

  const mappedRow = (r: string[]): Record<string, string> => {
    const row: Record<string, string> = {};
    columns.forEach((col) => {
      const idx = mapping[col.key] ?? -1;
      row[col.key] = idx >= 0 ? String(r[idx] ?? '').trim() : '';
    });
    return row;
  };

  const runImport = async () => {
    setStep('run');
    setProgress(0);
    const errs: { line: number; message: string }[] = [];
    let ok = 0;
    for (let i = 0; i < rawRows.length; i++) {
      const line = i + (hasHeader ? 2 : 1); // n° de ligne dans le fichier d'origine
      const payload = toPayload(mappedRow(rawRows[i]));
      if (typeof payload === 'string') {
        errs.push({ line, message: payload });
      } else {
        try {
          await onRow(payload);
          ok++;
        } catch (e) {
          errs.push({ line, message: getApiError(e, 'Erreur inconnue') });
        }
      }
      setProgress(i + 1);
    }
    setImported(ok);
    setErrors(errs);
    setStep('done');
    if (ok > 0) onDone(ok);
  };

  const downloadTemplate = () => {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      columns.map((c) => escape(c.label)).join(';'),
      columns.map((c) => escape(c.example || '')).join(';'),
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modele-${templateName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            {step === 'map' && (
              <button onClick={() => setStep('source')} className="p-1 -ml-1 text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <FileSpreadsheet className="w-5 h-5 text-primary-600 shrink-0" />
            <h2 className="font-bold text-gray-900 truncate">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* ===== Étape 1 : source ===== */}
          {step === 'source' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                {description || 'Récupérez en quelques secondes ce que vous teniez déjà dans Excel, Word ou votre cahier.'}
              </p>

              {/* Photo du cahier — lecture IA */}
              <button
                onClick={() => photoRef.current?.click()}
                disabled={scanning}
                className="w-full rounded-2xl p-5 text-left bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-md active:scale-[0.99] transition disabled:opacity-70"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    {scanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold flex items-center gap-1.5">
                      Photographier mon cahier <Sparkles className="w-4 h-4 text-amber-300" />
                    </p>
                    <p className="text-xs text-white/85 mt-0.5">
                      {scanning ? 'Lecture en cours…' : 'L\'IA lit votre cahier, même écrit à la main et en désordre.'}
                    </p>
                  </div>
                </div>
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />

              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex-1 h-px bg-gray-200" /> ou un fichier <span className="flex-1 h-px bg-gray-200" />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="rounded" />
                La première ligne contient les titres des colonnes
              </label>

              {/* Fichier Excel / CSV */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
                className="w-full border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/40 rounded-2xl p-6 text-center transition-colors"
              >
                {parsing ? (
                  <Loader2 className="w-8 h-8 mx-auto text-primary-500 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8 mx-auto text-primary-500" />
                )}
                <p className="font-medium text-gray-900 mt-2">Choisir un fichier Excel ou CSV</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx, .xls ou .csv — la 1ʳᵉ feuille est lue</p>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {/* Collage Word / Excel */}
              <div>
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <ClipboardPaste className="w-4 h-4 text-gray-400" />
                  Ou collez votre tableau (copié depuis Word, Excel ou WhatsApp)
                </p>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  rows={5}
                  placeholder={'Exemple :\nNom\tTéléphone\tVille\nAwa Diop\t77 123 45 67\tDakar'}
                  className="input w-full font-mono text-xs"
                />
                <button onClick={handlePaste} disabled={!pasted.trim()} className="btn-primary mt-2 w-full sm:w-auto disabled:opacity-50">
                  Analyser le texte collé
                </button>
              </div>

              <button onClick={downloadTemplate} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Télécharger un modèle vide ({templateName}.csv) à remplir
              </button>
            </div>
          )}

          {/* ===== Étape 2 : correspondance + aperçu ===== */}
          {step === 'map' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                <strong>{rawRows.length}</strong> ligne(s) détectée(s). Vérifiez la correspondance des colonnes :
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {columns.map((col) => (
                  <div key={col.key}>
                    <label className="label">
                      {col.label} {col.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={mapping[col.key] ?? -1}
                      onChange={(e) => setMapping((m) => ({ ...m, [col.key]: Number(e.target.value) }))}
                      className="input"
                    >
                      <option value={-1}>— Ignorer —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {missingRequired.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Colonnes obligatoires à associer : <strong>{missingRequired.map((c) => c.label).join(', ')}</strong></span>
                </div>
              )}

              {/* Aperçu */}
              <div className="border border-gray-100 rounded-xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {columns.map((c) => (
                        <th key={c.key} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rawRows.slice(0, 5).map((r, i) => {
                      const row = mappedRow(r);
                      return (
                        <tr key={i}>
                          {columns.map((c) => (
                            <td key={c.key} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                              {row[c.key] || <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rawRows.length > 5 && (
                  <p className="text-[11px] text-gray-400 px-3 py-2 border-t border-gray-50">… et {rawRows.length - 5} autre(s) ligne(s)</p>
                )}
              </div>

              <button
                onClick={runImport}
                disabled={missingRequired.length > 0}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" /> Importer {rawRows.length} ligne(s)
              </button>
            </div>
          )}

          {/* ===== Étape 3 : import en cours ===== */}
          {step === 'run' && (
            <div className="py-10 text-center space-y-4">
              <Loader2 className="w-8 h-8 mx-auto text-primary-600 animate-spin" />
              <p className="font-medium text-gray-900">Import en cours… {progress}/{rawRows.length}</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs mx-auto">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${Math.round((progress / Math.max(1, rawRows.length)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">Ne fermez pas cette fenêtre.</p>
            </div>
          )}

          {/* ===== Étape 4 : résultat ===== */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                {imported > 0 ? (
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                ) : (
                  <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                )}
                <p className="text-lg font-bold text-gray-900">
                  {imported} enregistrement(s) importé(s)
                </p>
                {errors.length > 0 && (
                  <p className="text-sm text-orange-600 mt-1">{errors.length} ligne(s) non importée(s)</p>
                )}
              </div>

              {errors.length > 0 && (
                <div className="border border-orange-100 bg-orange-50/50 rounded-xl max-h-48 overflow-y-auto divide-y divide-orange-100">
                  {errors.map((e, i) => (
                    <p key={i} className="px-3 py-2 text-xs text-orange-700">
                      <strong>Ligne {e.line} :</strong> {e.message}
                    </p>
                  ))}
                </div>
              )}

              <button onClick={onClose} className="btn-primary w-full">Fermer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
