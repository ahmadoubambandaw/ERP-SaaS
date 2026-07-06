// Logos des moyens de paiement dessinés en SVG (aucune ressource externe).
// Couleurs officielles : Wave #00B9F1, Orange #FF7900.

export function CashLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden>
      <rect x="1" y="2" width="46" height="28" rx="4" fill="#fff" />
      <rect x="4.5" y="5.5" width="39" height="21" rx="2.5" fill="none" stroke="#0E9F6E" strokeWidth="1.6" />
      <circle cx="24" cy="16" r="7" fill="none" stroke="#0E9F6E" strokeWidth="1.6" />
      <text x="24" y="20" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Arial, sans-serif" fill="#0E9F6E">F</text>
      <circle cx="10.5" cy="16" r="1.6" fill="#0E9F6E" />
      <circle cx="37.5" cy="16" r="1.6" fill="#0E9F6E" />
    </svg>
  );
}

export function WaveLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      {/* Pingouin Wave */}
      <path d="M24 4C15.2 4 9.5 12 9.5 23S15.8 44 24 44s14.5-10 14.5-21S32.8 4 24 4Z" fill="#0B2E4E" />
      <path d="M24 13c-5.2 0-8.8 4.8-8.8 11.5S18.8 40.8 24 40.8s8.8-9.6 8.8-16.3S29.2 13 24 13Z" fill="#fff" />
      <circle cx="19" cy="12.6" r="2.1" fill="#fff" />
      <circle cx="19.5" cy="12.6" r="1" fill="#0B2E4E" />
      <path d="M22.6 15.2l6-1.7-3.8 4.1z" fill="#F6A21E" />
      <path d="M17.5 43.6l3.2-2.2 2 2.6zM30.5 43.6l-3.2-2.2-2 2.6z" fill="#F6A21E" />
    </svg>
  );
}

export function MaxItLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 40" className={className} aria-hidden>
      <text
        x="48" y="27"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="24"
        letterSpacing="-0.5"
        fill="#fff"
      >
        max it
      </text>
      <rect x="20" y="32" width="56" height="3" rx="1.5" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function CardLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden>
      <rect x="1" y="1" width="46" height="30" rx="5" fill="#fff" />
      <rect x="1" y="6" width="46" height="5" fill="#1F2937" />
      <circle cx="19.5" cy="20" r="7.5" fill="#EB001B" />
      <circle cx="28.5" cy="20" r="7.5" fill="#F79E1B" />
      <path d="M24 14.2a7.5 7.5 0 0 1 0 11.6 7.5 7.5 0 0 1 0-11.6Z" fill="#FF5F00" />
    </svg>
  );
}
