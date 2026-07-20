import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Logo from '../../components/ui/Logo';

const UPDATED = '6 juillet 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-600">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-gray-900">Naatal</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Retour au site
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Politique de confidentialité</h1>
        </div>
        <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : {UPDATED}</p>

        <Section title="1. Qui sommes-nous ?">
          <p>
            Naatal est un logiciel de gestion (facturation, caisse, stocks, comptabilité, paie, CRM)
            édité par <strong>Ndaw-Tech</strong>, entreprise établie au Sénégal. La protection de vos
            données est au cœur de notre métier : votre activité repose sur Naatal, et Naatal repose
            sur votre confiance.
          </p>
          <p>
            Cette politique s'applique au site et à l'application Naatal. Elle est établie en
            conformité avec la <strong>loi sénégalaise n° 2008-12 du 25 janvier 2008</strong> sur la
            protection des données à caractère personnel et les recommandations de la{' '}
            <strong>CDP</strong> (Commission de protection des Données Personnelles).
          </p>
        </Section>

        <Section title="2. Quelles données collectons-nous ?">
          <p><strong>a) Les données de votre compte</strong> — lorsque vous créez un compte : nom,
            prénom, adresse email, mot de passe (chiffré), nom et coordonnées de votre entreprise,
            pays et devise.</p>
          <p><strong>b) Les données de votre activité</strong> — celles que vous enregistrez en
            utilisant Naatal : vos clients, fournisseurs, produits, ventes, factures, employés,
            bulletins de paie, écritures comptables, photos de produits.</p>
          <p><strong>c) Les données techniques</strong> — journaux de connexion (date, adresse IP)
            nécessaires à la sécurité du service.</p>
          <p>
            Nous ne collectons <strong>aucune donnée à votre insu</strong> : tout ce qui se trouve
            dans Naatal y a été mis par vous ou votre équipe.
          </p>
        </Section>

        <Section title="3. À qui appartiennent les données ?">
          <p>
            <strong>Vos données vous appartiennent.</strong> Pour les données de vos propres clients
            et employés que vous enregistrez dans Naatal, <strong>vous restez le responsable du
            traitement</strong> ; Ndaw-Tech agit uniquement comme prestataire technique
            (sous-traitant) qui héberge et sécurise ces données pour votre compte. Nous ne les
            utilisons jamais pour notre propre compte, nous ne les vendons pas et nous ne les
            partageons pas avec des tiers à des fins commerciales.
          </p>
        </Section>

        <Section title="4. Pourquoi utilisons-nous ces données ?">
          <p>Exclusivement pour :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>fournir le service Naatal (votre gestion au quotidien) ;</li>
            <li>gérer votre abonnement et sa facturation ;</li>
            <li>envoyer les emails liés au service (factures, rappels d'échéance d'abonnement) ;</li>
            <li>assurer la sécurité et prévenir la fraude ;</li>
            <li>vous assister (support).</li>
          </ul>
          <p>Aucune publicité, aucune revente de données, aucun profilage.</p>
        </Section>

        <Section title="5. Où sont hébergées les données et qui y accède ?">
          <p>
            Les données sont hébergées dans des centres de données sécurisés opérés par nos
            prestataires techniques : <strong>Supabase</strong> (base de données),{' '}
            <strong>Railway</strong> et <strong>Vercel</strong> (application), <strong>Brevo</strong>{' '}
            (envoi d'emails) et <strong>PayDunya</strong> (paiement des abonnements — nous ne
            stockons jamais vos informations de paiement). Ces prestataires peuvent héberger les
            données en dehors du Sénégal (Union européenne, États-Unis), avec des garanties de
            sécurité contractuelles.
          </p>
          <p>
            Au sein de Ndaw-Tech, seul le personnel strictement nécessaire au fonctionnement et au
            support du service peut accéder aux données, dans le cadre de son travail.
          </p>
        </Section>

        <Section title="6. Comment protégeons-nous vos données ?">
          <ul className="list-disc list-inside space-y-1">
            <li>Connexions chiffrées de bout en bout (HTTPS/TLS) ;</li>
            <li>Mots de passe hachés (bcrypt) — illisibles, même par nous ;</li>
            <li>Cloisonnement strict : chaque entreprise n'accède qu'à ses propres données ;</li>
            <li>Rôles et permissions vérifiés côté serveur (caissier, comptable, RH…) ;</li>
            <li>Protection contre les attaques par force brute ;</li>
            <li>Sauvegardes automatiques régulières.</li>
          </ul>
        </Section>

        <Section title="7. Combien de temps conservons-nous les données ?">
          <p>
            Pendant toute la durée de vie de votre compte. Si vous fermez votre compte, vos données
            sont supprimées dans un délai de 30 jours, à l'exception des données que la loi nous
            oblige à conserver plus longtemps (documents de facturation, obligations comptables).
            Vous pouvez exporter vos données (CSV) à tout moment depuis l'application.
          </p>
        </Section>

        <Section title="8. Vos droits">
          <p>
            Conformément à la loi n° 2008-12, vous disposez d'un droit d'accès, de rectification, de
            suppression et d'opposition sur vos données personnelles. Pour l'exercer, contactez-nous
            (voir ci-dessous) — nous répondons sous 30 jours au plus.
          </p>
          <p>
            Vous pouvez également saisir la <strong>CDP</strong> (Commission de protection des
            Données Personnelles du Sénégal) : <span className="whitespace-nowrap">cdp.sn</span>.
          </p>
        </Section>

        <Section title="9. Cookies et stockage local">
          <p>
            Naatal n'utilise <strong>aucun cookie publicitaire ni traceur tiers</strong>. Seul un
            stockage local technique est utilisé sur votre appareil pour maintenir votre session de
            connexion et vos préférences d'affichage.
          </p>
        </Section>

        <Section title="10. Nous contacter">
          <p>
            Pour toute question sur vos données :
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>WhatsApp : <a className="text-primary-600 font-medium" href="https://wa.me/221710680152">+221 71 068 01 52</a></li>
            <li>Email : <a className="text-primary-600 font-medium" href="mailto:ndawk5699@gmail.com">ndawk5699@gmail.com</a></li>
          </ul>
          <p>
            Cette politique peut évoluer avec le service ; la date de mise à jour en haut de page
            fait foi. En cas de changement important, vous serez informé dans l'application.
          </p>
        </Section>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 text-sm text-gray-400 flex items-center justify-between">
          <p>© {new Date().getFullYear()} Naatal · Ndaw-Tech</p>
          <Link to="/" className="hover:text-gray-600">Retour au site</Link>
        </div>
      </footer>
    </div>
  );
}
