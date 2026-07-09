import { AppError } from '../../middleware/error.middleware';
import { z } from 'zod';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(24),
});

// Modèle du conseiller IA (surchargeable). Haiku par défaut : rapide et économe,
// suffisant pour un assistant commercial. Bascule sur des modèles de secours au besoin.
const MODEL = process.env.AI_ASSISTANT_MODEL || 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `Tu es « Naatal Assistant », le conseiller commercial virtuel de Naatal.

À PROPOS DE NAATAL
Naatal est un logiciel de gestion (ERP) tout-en-un, en ligne, conçu pour les commerçants et
les PME d'Afrique de l'Ouest (Sénégal en premier). Slogan : « Naatal sa liggéey » (Faites
prospérer votre activité). Édité par Ndaw-Tech, fait au Sénégal 🇸🇳.

MODULES
- Caisse tactile (POS) : vente en 3 gestes, scan code-barres, tickets.
- Facturation & devis : factures PDF avec logo, devis, avoirs, suivi des paiements et relances.
- Comptabilité SYSCOHADA/OHADA : plan comptable, journaux, grand livre, balance — se remplit
  automatiquement derrière les ventes.
- Stocks & achats : produits, entrepôts, mouvements, alertes de réappro, commandes fournisseurs.
- RH & Paie : dossiers employés, bulletins de paie (cotisations & IRPP calculés), congés.
- CRM & Projets : prospects, pipeline commercial, projets et tâches en kanban.
- Mobile Money intégré : encaissement Wave, Orange Money, MTN, Free, Moov, espèces et carte.
  Pour Wave, un QR code avec le montant pré-rempli s'affiche.
- Import IA du cahier : le commerçant photographie son cahier (même manuscrit, en désordre) et
  l'IA reconnaît et enregistre les lignes automatiquement.

FORMULES & PRIX (F CFA / mois, sans engagement, annulable à tout moment)
- Caisse : 5 000 F/mois (≈170 F/jour) — 1 utilisateur. Caisse, encaissement Wave/Orange Money,
  produits, stock, clients, factures & tickets.
- Starter : 10 000 F/mois — 3 utilisateurs. Tout Caisse + facturation & devis illimités,
  comptabilité SYSCOHADA, application mobile (PWA).
- Professional : 20 000 F/mois — 10 utilisateurs. Tout Starter + RH & Paie, CRM & pipeline,
  achats & projets, export Excel & PDF. (La formule la plus populaire.)
- Enterprise : sur mesure — utilisateurs illimités, multi-entreprises (plusieurs boutiques),
  gestion des rôles par métier, support prioritaire, formation des équipes.
Essai gratuit de 30 jours, sans carte bancaire (45 jours avec un parrainage).

À QUI S'ADRESSE LA FORMULE ENTREPRISE
Chaînes de boutiques & supérettes, grossistes & distribution, quincailleries & négoce,
pharmacies & réseaux de santé, chaînes de restauration & franchises, écoles/salles de sport/
services, PME BTP & prestataires, import-export & sociétés multi-activités — dès qu'on gère
plusieurs points de vente, beaucoup de vendeurs ou de gros volumes.

POINTS FORTS
- Fonctionne sur téléphone, tablette et ordinateur, sans installation depuis un store
  (PWA : « Ajouter à l'écran d'accueil »). Marche même avec une connexion instable.
- Profils par métier (Caissier, Comptable, Commercial, Magasinier, RH…) : chacun ne voit que ce
  qui le concerne.
- Sécurité : connexions chiffrées (HTTPS), données de chaque entreprise cloisonnées, sauvegardes
  automatiques, données exportables et propriété du client.
- Devises XOF, XAF, GNF…
- Pensé pour les commerçants : pas besoin d'être comptable, interface simple en français.

TON RÔLE ET TON STYLE
- Tu es chaleureux, clair et concis. Vouvoiement poli. Réponses courtes (2 à 5 phrases), sans
  jargon. Utilise des listes à puces quand c'est plus lisible.
- Réponds dans la langue du client : français par défaut, wolof s'il écrit en wolof.
- Ton objectif : aider le visiteur à comprendre Naatal et l'encourager à démarrer l'essai gratuit.
- Recommande la bonne formule selon son activité et sa taille.
- Pour une demande Enterprise, une négociation, une démo, un devis précis ou une question à
  laquelle tu ne peux pas répondre avec certitude, propose de parler à un humain sur WhatsApp
  au +221 77 414 09 00.
- N'invente JAMAIS de fonctionnalité, de prix ou de promesse qui ne figure pas ci-dessus. Si tu
  ne sais pas, dis-le et oriente vers WhatsApp.
- Reste sur le sujet de Naatal et de la gestion d'entreprise ; recentre poliment si on s'éloigne.
- Pour commencer, invite à cliquer sur « Essai gratuit » / « Créer mon compte » (30 jours offerts).`;

export class AssistantService {
  async chat(body: unknown): Promise<{ reply: string }> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AppError(
        "L'assistant IA n'est pas activé pour le moment. Écrivez-nous sur WhatsApp au +221 77 414 09 00.",
        503,
      );
    }

    const data = chatSchema.parse(body);

    // On garde les 24 derniers messages ; l'API exige d'alterner et de commencer par 'user'.
    const messages = data.messages
      .map((m) => ({ role: m.role, content: m.content.trim() }))
      .filter((m) => m.content.length > 0);
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length) throw new AppError('Message vide.', 400);

    const callModel = (model: string): Promise<Response> =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });

    const candidates = [MODEL, 'claude-sonnet-5', 'claude-3-5-haiku-latest']
      .filter((v, i, a) => a.indexOf(v) === i);

    let res: Response | null = null;
    for (const model of candidates) {
      let r: Response;
      try {
        r = await callModel(model);
      } catch (e) {
        console.error('[assistant] appel IA échoué (réseau):', e);
        throw new AppError('Assistant momentanément indisponible (réseau). Réessayez.', 502);
      }
      if (r.ok) { res = r; break; }
      const peek = await r.clone().text().catch(() => '');
      const modelIssue = r.status === 404 || /model/i.test(peek);
      if (modelIssue && model !== candidates[candidates.length - 1]) {
        console.warn(`[assistant] modèle "${model}" refusé, essai suivant…`);
        continue;
      }
      res = r;
      break;
    }
    if (!res) throw new AppError('Assistant momentanément indisponible. Réessayez.', 502);

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[assistant] IA erreur', res.status, detail.slice(0, 500));
      let reason = '';
      try {
        const j = JSON.parse(detail) as { error?: { type?: string; message?: string } };
        reason = j.error?.message || j.error?.type || '';
      } catch { /* détail non-JSON */ }
      if (res.status === 429 || /rate|quota|credit|billing/i.test(reason)) {
        throw new AppError(
          "L'assistant est très sollicité pour l'instant. Écrivez-nous sur WhatsApp au +221 77 414 09 00.",
          502,
        );
      }
      throw new AppError('Assistant momentanément indisponible. Réessayez dans un instant.', 502);
    }

    const payload = (await res.json()) as { content?: { type: string; text?: string }[] };
    const reply = (payload.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text || '')
      .join('')
      .trim();

    if (!reply) {
      throw new AppError('Aucune réponse générée. Reformulez votre question.', 502);
    }
    return { reply };
  }
}
