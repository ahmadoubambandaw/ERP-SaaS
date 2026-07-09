import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

const columnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  example: z.string().optional(),
  required: z.boolean().optional(),
});

const scanSchema = z.object({
  // data URL : "data:image/jpeg;base64,...."
  image: z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/, 'Image invalide'),
  columns: z.array(columnSchema).min(1).max(20),
  entity: z.string().max(40).optional(),
});

// Modèle de vision (surchargeable). Sonnet pour la lecture fiable de l'écriture manuscrite.
const MODEL = process.env.AI_IMPORT_MODEL || 'claude-sonnet-5';

export class ScanService {
  /**
   * Lit la photo d'un cahier / tableau (manuscrit ou imprimé, dans n'importe quel ordre
   * de colonnes) et renvoie des lignes structurées, mappées sur les champs demandés.
   */
  async extractTable(body: unknown): Promise<{ rows: Record<string, string>[]; count: number }> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AppError(
        "La lecture de photo n'est pas activée. Ajoutez ANTHROPIC_API_KEY dans les variables du serveur.",
        503,
      );
    }

    const data = scanSchema.parse(body);

    // Décomposition du data URL
    const m = data.image.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/);
    if (!m) throw new AppError('Image invalide', 400);
    const mediaType = m[1];
    const base64 = m[2];
    if (base64.length > 7_000_000) {
      throw new AppError('Photo trop lourde. Réduisez la résolution avant l\'envoi.', 413);
    }

    const colList = data.columns
      .map((c) => `- "${c.key}" : ${c.label}${c.example ? ` (ex. ${c.example})` : ''}`)
      .join('\n');

    const prompt = `Tu es un assistant qui numérise des cahiers de commerçants ouest-africains.

L'image est une page de cahier ou un tableau, écrit à la main ou imprimé, potentiellement en désordre,
en français ou en wolof, avec parfois des ratures. Extrais CHAQUE ligne de données (une ligne = un enregistrement).

Pour chaque ligne, renvoie un objet JSON utilisant EXACTEMENT ces clés :
${colList}

Règles :
- Les colonnes du cahier peuvent être dans n'importe quel ordre ou avoir d'autres noms : déduis le bon champ d'après le sens.
- Les montants et quantités : uniquement des chiffres (ex. "15 000" -> "15000"). Pas de symbole monétaire.
- Si une information est absente pour une ligne, mets une chaîne vide "".
- Ignore les en-têtes, totaux, sous-totaux et lignes barrées.
- Ne devine pas de fausses données : n'invente rien.

Réponds UNIQUEMENT avec un tableau JSON (aucun texte avant ou après), par exemple :
[{"${data.columns[0].key}":"...","${data.columns[1]?.key ?? data.columns[0].key}":"..."}]`;

    const content = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: prompt },
    ];

    const callModel = async (model: string): Promise<Response> => {
      return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content }] }),
      });
    };

    // Modèle principal, puis bascule sur des modèles de secours si le nom n'est pas reconnu.
    const candidates = [MODEL, 'claude-haiku-4-5-20251001', 'claude-3-5-sonnet-latest']
      .filter((v, i, a) => a.indexOf(v) === i);

    let res: Response | null = null;
    for (const model of candidates) {
      let r: Response;
      try {
        r = await callModel(model);
      } catch (e) {
        console.error('[scan] appel IA échoué (réseau):', e);
        throw new AppError('La lecture de la photo a échoué (réseau). Réessayez.', 502);
      }
      if (r.ok) { res = r; break; }
      // Erreur liée au modèle → on tente le suivant ; sinon on s'arrête.
      const peek = await r.clone().text().catch(() => '');
      const modelIssue = r.status === 404 || /model/i.test(peek);
      if (modelIssue && model !== candidates[candidates.length - 1]) {
        console.warn(`[scan] modèle "${model}" refusé, essai suivant…`);
        continue;
      }
      res = r;
      break;
    }
    if (!res) throw new AppError('La lecture IA a échoué. Réessayez.', 502);

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[scan] IA erreur', res.status, detail.slice(0, 500));
      // Remonte la raison exacte d'Anthropic (clé invalide, modèle introuvable, quota…)
      let reason = '';
      try {
        const j = JSON.parse(detail) as { error?: { type?: string; message?: string } };
        reason = j.error?.message || j.error?.type || '';
      } catch { /* détail non-JSON */ }
      if (res.status === 401 || /authentication|x-api-key|invalid.*key/i.test(reason)) {
        throw new AppError('Clé IA (ANTHROPIC_API_KEY) invalide ou manquante sur le serveur.', 502);
      }
      if (res.status === 404 || /model/i.test(reason)) {
        throw new AppError(`Modèle IA introuvable : ${reason || MODEL}. Vérifiez AI_IMPORT_MODEL.`, 502);
      }
      if (res.status === 429 || /rate|quota|credit|billing/i.test(reason)) {
        throw new AppError('Crédit/quota IA épuisé. Vérifiez votre compte Anthropic (facturation).', 502);
      }
      throw new AppError(`La lecture IA a échoué${reason ? ' : ' + reason.slice(0, 140) : ''}.`, 502);
    }

    const payload = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (payload.content || []).filter((c) => c.type === 'text').map((c) => c.text || '').join('').trim();

    const rows = this.parseRows(text, data.columns.map((c) => c.key));
    if (!rows.length) {
      throw new AppError("Aucune ligne lisible n'a été détectée sur la photo. Cadrez bien le cahier, en pleine lumière.", 422);
    }
    return { rows, count: rows.length };
  }

  /** Extrait le tableau JSON de la réponse (tolère un éventuel bloc ```). */
  private parseRows(text: string, keys: string[]): Record<string, string>[] {
    let raw = text.trim();
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) raw = fence[1].trim();
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end === -1) return [];
    let arr: unknown;
    try {
      arr = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return [];
    }
    if (!Array.isArray(arr)) return [];

    return arr
      .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
      .map((r) => {
        const row: Record<string, string> = {};
        for (const k of keys) {
          const v = (r as Record<string, unknown>)[k];
          row[k] = v == null ? '' : String(v).trim();
        }
        return row;
      })
      .filter((r) => Object.values(r).some((v) => v !== ''));
  }
}
