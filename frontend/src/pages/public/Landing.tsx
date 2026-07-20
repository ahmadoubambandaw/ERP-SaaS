import { Link } from 'react-router-dom';
import {
  Building2, BarChart2, FileText, Package, Users, TrendingUp, FolderKanban,
  Smartphone, ShieldCheck, Globe, Check, ArrowRight, Menu, X, Star, MessageCircle,
  Store, Utensils, Wrench, Sparkles, ChevronDown, HelpCircle,
  Zap, Crown, Warehouse, Truck, Pill, GraduationCap, HardHat, Boxes,
} from 'lucide-react';
import { useState } from 'react';
import Logo from '../../components/ui/Logo';
import AudioGuide from '../../components/ui/AudioGuide';
import ChatAssistant from '../../components/ui/ChatAssistant';
import { useAssistantStore } from '../../store/assistant.store';

// Numéro WhatsApp de contact (format international sans +)
const WHATSAPP = '221710680152';
const WHATSAPP_MSG = encodeURIComponent('Bonjour, je souhaite en savoir plus sur votre ERP pour ma PME.');

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Combien coûte Naatal ?',
    a: "Vous commencez avec 30 jours d'essai gratuit, sans carte bancaire. Ensuite, l'abonnement démarre à 5 000 F CFA/mois (formule Caisse — soit 170 F par jour), 10 000 F CFA/mois (Starter) ou 20 000 F CFA/mois (Professional). Sans engagement : vous arrêtez quand vous voulez.",
  },
  {
    q: 'Est-ce que ça marche sur mon téléphone ?',
    a: "Oui. Naatal fonctionne sur téléphone, tablette et ordinateur, sans rien installer depuis un store : ouvrez le site, touchez « Ajouter à l'écran d'accueil » et Naatal devient une application sur votre téléphone.",
  },
  {
    q: 'Puis-je encaisser avec Wave et Orange Money ?',
    a: "Oui. La caisse intégrée gère les paiements en Espèces, Wave, Orange Money et carte bancaire. Pour Wave, un QR code avec le montant déjà rempli s'affiche : votre client le scanne et paie en quelques secondes.",
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: "Oui. Connexions chiffrées (HTTPS), mots de passe illisibles même par nous, sauvegardes automatiques, et chaque entreprise est strictement cloisonnée : personne d'autre ne peut voir vos chiffres. Vos données vous appartiennent et vous pouvez les exporter à tout moment.",
  },
  {
    q: 'Mes vendeurs peuvent-ils avoir un accès limité ?',
    a: "Oui. Vous créez des profils par métier — Caissier, Comptable, Commercial, Magasinier, RH… — et chacun ne voit que ce qui le concerne. Le caissier encaisse, mais ne voit pas votre comptabilité.",
  },
  {
    q: 'Je gère plusieurs boutiques, c\'est possible ?',
    a: "Oui, avec la formule Entreprise : vous créez vos différentes boutiques ou sociétés et passez de l'une à l'autre avec le même compte, chacune avec ses propres stocks, ventes et comptabilité.",
  },
  {
    q: "Faut-il savoir bien lire ou être comptable pour l'utiliser ?",
    a: "Non. Naatal est pensé pour les commerçants : gros boutons visuels, photos des produits, vente en 3 gestes (toucher le produit → encaisser → ticket). La comptabilité SYSCOHADA se remplit automatiquement derrière.",
  },
  {
    q: 'Et si j\'ai un problème ?',
    a: "Le support se fait directement sur WhatsApp, en français ou en wolof. Touchez le bouton vert en bas de la page et on vous répond rapidement.",
  },
];

const TESTIMONIALS = [
  {
    name: 'Awa D.', role: 'Boutique de prêt-à-porter, Dakar',
    text: "Avant je notais tout dans un cahier. Maintenant je fais mes factures en 2 minutes et je connais mon stock en temps réel. Un gain de temps énorme.",
  },
  {
    name: 'Moussa S.', role: 'Quincaillerie, Thiès',
    text: "L'alerte de stock bas m'a évité plusieurs ruptures. Et je vois enfin qui me doit de l'argent. Indispensable.",
  },
  {
    name: 'Fatou N.', role: 'Institut de beauté, Rufisque',
    text: "La paie de mes employées se calcule toute seule. Mes bulletins sont propres et professionnels. Je recommande à toutes les gérantes.",
  },
];

const AUDIENCES = [
  { icon: Store, label: 'Boutiques & Commerces', desc: 'Mode, bijoux, électronique, alimentation' },
  { icon: Utensils, label: 'Restaurants & Traiteurs', desc: 'Stock, achats, personnel, caisse' },
  { icon: Wrench, label: 'Quincailleries & Négoce', desc: 'Gros volumes, fournisseurs, entrepôts' },
  { icon: Sparkles, label: 'Services & Instituts', desc: 'Beauté, conseil, artisanat, prestations' },
];

const FEATURES = [
  {
    icon: BarChart2,
    title: 'Comptabilité SYSCOHADA',
    desc: 'Plan comptable OHADA intégré, journaux, grand livre et balance générale conformes aux normes africaines.',
  },
  {
    icon: FileText,
    title: 'Facturation & Devis',
    desc: 'Factures PDF professionnelles avec votre logo, devis, avoirs, suivi des paiements et relances.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Money intégré',
    desc: 'Encaissez via Orange Money, Wave, MTN, Free et Moov Money — les paiements que vos clients utilisent vraiment.',
  },
  {
    icon: Package,
    title: 'Stocks & Achats',
    desc: 'Produits, entrepôts, mouvements de stock, alertes de réapprovisionnement et bons de commande fournisseurs.',
  },
  {
    icon: Users,
    title: 'RH & Paie',
    desc: 'Dossiers employés, bulletins de paie avec cotisations et IRPP calculés automatiquement, gestion des congés.',
  },
  {
    icon: TrendingUp,
    title: 'CRM & Projets',
    desc: 'Prospects, pipeline commercial, opportunités, projets et tâches en kanban — tout au même endroit.',
  },
];

type Plan = {
  name: string;
  icon: typeof Store;
  monthly: number | null; // null = sur mesure
  desc: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge?: string;
};

const PLANS: Plan[] = [
  {
    name: 'Caisse',
    icon: Store,
    monthly: 5000,
    desc: 'La caisse du boutiquier — 170 F/jour',
    features: ['1 utilisateur', 'Caisse tactile & scan code-barres', 'Encaissement Wave, Orange Money, espèces', 'Produits, stock & clients', 'Factures & tickets'],
    cta: 'Essayer 30 jours gratuits',
    highlight: false,
  },
  {
    name: 'Starter',
    icon: Zap,
    monthly: 10000,
    desc: 'Pour gérer sereinement',
    features: ['3 utilisateurs', 'Tout Caisse, plus :', 'Facturation & devis illimités', 'Comptabilité SYSCOHADA', 'Application mobile (PWA)'],
    cta: 'Essayer 30 jours gratuits',
    highlight: false,
  },
  {
    name: 'Professional',
    icon: TrendingUp,
    monthly: 20000,
    desc: 'Pour les PME qui grandissent',
    features: ['10 utilisateurs', 'Tout Starter, plus :', 'RH & Paie complète', 'CRM & pipeline commercial', 'Achats & gestion de projets', 'Export Excel & PDF'],
    cta: 'Essayer 30 jours gratuits',
    highlight: true,
    badge: 'Le plus populaire',
  },
  {
    name: 'Enterprise',
    icon: Crown,
    monthly: null,
    desc: 'Pour les structures exigeantes',
    features: ['Utilisateurs illimités', 'Tout Professional, plus :', 'Multi-entreprises (plusieurs boutiques)', 'Gestion des rôles (profils métiers)', 'Support prioritaire', 'Formation de vos équipes'],
    cta: 'Nous contacter',
    highlight: false,
  },
];

// Cibles principales de la formule Entreprise (multi-boutiques, utilisateurs illimités)
const ENTERPRISE_TARGETS = [
  { icon: Store, label: 'Chaînes de boutiques & supérettes', desc: 'Plusieurs points de vente pilotés depuis un seul compte.' },
  { icon: Truck, label: 'Grossistes & distribution', desc: 'Gros volumes, réseau de revendeurs, entrepôts multiples.' },
  { icon: Warehouse, label: 'Quincailleries & négoce de matériaux', desc: 'Milliers de références, fournisseurs et dépôts.' },
  { icon: Pill, label: 'Pharmacies & réseaux de santé', desc: 'Officines, cliniques et cabinets à plusieurs sites.' },
  { icon: Utensils, label: 'Chaînes de restauration & franchises', desc: 'Restaurants, fast-foods et traiteurs multi-établissements.' },
  { icon: GraduationCap, label: 'Écoles, salles de sport & services', desc: 'Abonnements, membres et équipes réparties sur plusieurs lieux.' },
  { icon: HardHat, label: 'PME BTP & prestataires', desc: 'Chantiers, projets, matériel et sous-traitants à suivre.' },
  { icon: Boxes, label: 'Import-export & sociétés multi-activités', desc: 'Plusieurs sociétés, devises et métiers dans un même tableau de bord.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const openAssistant = useAssistantStore((s) => s.setOpen);

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  return (
    <div className="min-h-screen bg-white">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-9 h-9" />
            <span className="font-bold text-gray-900 text-lg">Naatal</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#fonctionnalites" className="hover:text-gray-900">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-gray-900">Tarifs</a>
            <a href="#entreprise" className="hover:text-gray-900">Entreprise</a>
            <a href="#faq" className="hover:text-gray-900">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">
              Se connecter
            </Link>
            <Link to="/register" className="btn-primary">
              Essai gratuit
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-600">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#fonctionnalites" onClick={() => setMenuOpen(false)} className="block text-gray-600">Fonctionnalités</a>
            <a href="#tarifs" onClick={() => setMenuOpen(false)} className="block text-gray-600">Tarifs</a>
            <a href="#entreprise" onClick={() => setMenuOpen(false)} className="block text-gray-600">Entreprise</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="block text-gray-600">FAQ</a>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="btn-secondary flex-1 text-center">Se connecter</Link>
              <Link to="/register" className="btn-primary flex-1 text-center">Essai gratuit</Link>
            </div>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #3b82f6 0%, transparent 40%), radial-gradient(circle at 80% 70%, #2563eb 0%, transparent 40%)',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 text-primary-200 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Globe className="w-3.5 h-3.5" /> Conçu pour les PME africaines
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Naatal sa liggéey
          </h1>
          <p className="text-primary-200 text-lg md:text-xl mt-4 font-medium">
            Faites prospérer votre activité
          </p>
          <p className="text-gray-300 text-base mt-5 max-w-2xl mx-auto">
            Naatal réunit comptabilité SYSCOHADA, facturation Mobile Money, stocks, paie et CRM —
            simple, en français, accessible depuis votre téléphone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link to="/register" className="btn-primary text-base px-8 py-3 flex items-center gap-2 w-full sm:w-auto justify-center">
              Créer mon compte gratuit <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="text-gray-300 hover:text-white text-sm font-medium">
              J'ai déjà un compte →
            </Link>
          </div>
          {/* Présentation audio en wolof (visible dès que le MP3 est déposé) */}
          <div className="mt-6">
            <AudioGuide />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-sm text-gray-400">
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" /> Sans engagement</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" /> Devise XOF, XAF, GNF...</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" /> Installation mobile en 1 clic</span>
          </div>

          {/* ===== Aperçu de l'app (téléphone + web) ===== */}
          <div className="relative mt-16 flex items-end justify-center">
            {/* Écran ordinateur (derrière, masqué sur très petit écran) */}
            <div className="hidden sm:block w-[62%] max-w-[560px] -mr-8 md:-mr-16 mb-6">
              <div className="rounded-t-xl border-[10px] border-b-[14px] border-gray-700 bg-gray-700 overflow-hidden shadow-2xl">
                <img src="/screenshots/app-web.png" alt="Naatal sur ordinateur" className="w-full block" loading="lazy" />
              </div>
              <div className="h-3 bg-gradient-to-b from-gray-400 to-gray-600 rounded-b-lg mx-[-6px]" />
            </div>

            {/* Téléphone (devant) */}
            <div className="relative z-10 w-[210px] sm:w-[240px] border-[8px] border-gray-900 rounded-[2.2rem] overflow-hidden shadow-2xl bg-white">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
              <img src="/screenshots/app-mobile.png" alt="Naatal sur téléphone" className="w-full block" loading="lazy" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Application mobile & version web — vos données synchronisées partout</p>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="fonctionnalites" className="max-w-6xl mx-auto px-4 md:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Tout ce qu'il faut pour piloter votre PME</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Fini les cahiers, les fichiers Excel éparpillés et les logiciels étrangers inadaptés.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card p-6 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Mobile strip ===== */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Votre entreprise dans votre poche
            </h2>
            <p className="text-gray-500 mt-4 leading-relaxed">
              Installez l'application sur votre téléphone en un clic, sans passer par le Play Store.
              Consultez vos ventes, validez un congé ou vérifiez un stock, où que vous soyez —
              même avec une connexion instable.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Fonctionne sur iPhone et Android</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Interface rapide, pensée mobile d'abord</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Notifications : factures en retard, stock bas, congés</li>
            </ul>
          </div>
          <div className="flex-shrink-0">
            <div className="w-52 h-96 bg-gray-900 rounded-[2.5rem] border-8 border-gray-800 shadow-2xl p-3 flex flex-col gap-2">
              <div className="bg-primary-600 rounded-xl h-16 flex items-center px-3 gap-2">
                <Building2 className="w-6 h-6 text-white" />
                <div className="space-y-1">
                  <div className="w-20 h-2 bg-white/80 rounded" />
                  <div className="w-12 h-1.5 bg-white/40 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-xl h-16 p-2"><div className="w-8 h-1.5 bg-gray-600 rounded mb-2" /><div className="w-12 h-3 bg-green-500/70 rounded" /></div>
                <div className="bg-gray-800 rounded-xl h-16 p-2"><div className="w-8 h-1.5 bg-gray-600 rounded mb-2" /><div className="w-10 h-3 bg-primary-500/70 rounded" /></div>
              </div>
              <div className="bg-gray-800 rounded-xl flex-1 p-2 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex-shrink-0" />
                    <div className="flex-1 h-2 bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
              <div className="bg-gray-800 rounded-xl h-10 flex items-center justify-around px-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-5 h-5 rounded ${i === 0 ? 'bg-primary-500' : 'bg-gray-700'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pour qui ? ===== */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Pour qui ?</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Pensé pour les petites et moyennes entreprises africaines, quel que soit votre secteur.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {AUDIENCES.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.label} className="text-center px-4">
                <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{a.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Témoignages ===== */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Ils nous font confiance</h2>
            <p className="text-gray-500 mt-3">Des entrepreneurs qui ont abandonné le cahier.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card p-6 flex flex-col">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed flex-1">« {t.text} »</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="tarifs" className="max-w-6xl mx-auto px-4 md:px-6 py-20">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" /> 30 jours d'essai gratuit — sans carte bancaire
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Choisissez votre formule</h2>
          <p className="text-gray-500 mt-3">À partir de 170 F par jour. Payez en F CFA, annulez quand vous voulez.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch mt-12">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`card p-6 flex flex-col relative ${plan.highlight ? 'border-2 border-primary-500 shadow-xl xl:-translate-y-2' : ''}`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${plan.highlight ? 'bg-primary-600' : 'bg-primary-50'}`}>
                  <Icon className={`w-5 h-5 ${plan.highlight ? 'text-white' : 'text-primary-600'}`} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                <p className="text-xs text-gray-400 mt-1 min-h-[2rem]">{plan.desc}</p>

                <div className="mt-4 mb-6 min-h-[4.25rem]">
                  {plan.monthly === null ? (
                    <>
                      <span className="text-3xl font-bold text-gray-900">Sur mesure</span>
                      <p className="text-xs text-gray-400 mt-1">Selon vos boutiques & besoins</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">{fmt(plan.monthly)}</span>
                        <span className="text-sm text-gray-400">F CFA / mois</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Sans engagement</p>
                    </>
                  )}
                </div>

                <ul className="space-y-2.5 text-sm text-gray-600 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {plan.monthly === null ? (
                  <a
                    href={`https://wa.me/${WHATSAPP}?text=${WHATSAPP_MSG}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 text-center btn-secondary"
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    to="/register"
                    className={`mt-6 text-center ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Pour qui ? — Formule Entreprise ===== */}
      <section id="entreprise" className="relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 15% 20%, #3b82f6 0%, transparent 45%), radial-gradient(circle at 85% 80%, #2563eb 0%, transparent 45%)',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-20">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 bg-white/10 text-primary-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <Crown className="w-3.5 h-3.5" /> Formule Entreprise
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Pour qui est faite la formule Entreprise ?
            </h2>
            <p className="text-gray-300 mt-4 leading-relaxed">
              Dès que vous gérez <strong className="text-white">plusieurs boutiques ou sociétés</strong>,
              beaucoup de vendeurs et de gros volumes, la formule Entreprise réunit tout : multi-entreprises,
              utilisateurs illimités, profils par métier et support prioritaire.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ENTERPRISE_TARGETS.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                  <div className="w-11 h-11 bg-primary-600/30 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary-300" />
                  </div>
                  <h3 className="font-semibold text-white text-[15px] leading-snug">{t.label}</h3>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">{t.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openAssistant(true)}
              className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Sparkles className="w-4 h-4" /> Parler à un conseiller
            </button>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour, je gère plusieurs boutiques et je souhaite en savoir plus sur la formule Entreprise de Naatal.')}`}
              target="_blank"
              rel="noreferrer"
              className="text-gray-300 hover:text-white text-sm font-medium inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" /> ou sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20">
          <div className="text-center mb-10">
            <HelpCircle className="w-8 h-8 text-primary-600 mx-auto mb-3" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Questions fréquentes</h2>
            <p className="text-gray-500 mt-2">Tout ce que les commerçants nous demandent avant de se lancer.</p>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => {
              const open = faqOpen === i;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setFaqOpen(open ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-gray-900">{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <p className="px-5 pb-4 text-[15px] leading-relaxed text-gray-600">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">
            Une autre question ?{' '}
            <button onClick={() => openAssistant(true)} className="text-primary-600 font-medium hover:underline">
              Demandez à notre assistant
            </button>
            {' '}ou{' '}
            <a href={`https://wa.me/${WHATSAPP}?text=${WHATSAPP_MSG}`} target="_blank" rel="noreferrer" className="text-primary-600 font-medium">
              écrivez-nous sur WhatsApp
            </a>
          </p>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 text-center">
          <ShieldCheck className="w-10 h-10 text-primary-400 mx-auto mb-5" />
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Prêt à moderniser votre gestion ?
          </h2>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">
            Créez votre compte en 2 minutes. Vos données sont sauvegardées automatiquement et vous appartiennent.
          </p>
          <Link to="/register" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2 mt-8">
            Créer mon compte gratuit <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-600">Naatal</span>
          </div>
          <div className="flex items-center gap-6">
            <FolderKanban className="hidden" />
            <a href="#fonctionnalites" className="hover:text-gray-600">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-gray-600">Tarifs</a>
            <a href="#faq" className="hover:text-gray-600">FAQ</a>
            <Link to="/confidentialite" className="hover:text-gray-600">Confidentialité</Link>
            <Link to="/login" className="hover:text-gray-600">Connexion</Link>
          </div>
          <p>© {new Date().getFullYear()} Naatal · Ndaw-Tech — Fait au Sénégal 🇸🇳</p>
        </div>
      </footer>

      {/* ===== Assistant IA flottant (WhatsApp accessible à l'intérieur) ===== */}
      <ChatAssistant />
    </div>
  );
}
