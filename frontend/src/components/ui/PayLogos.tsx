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
      {/* Pingouin Wave : de face, noir, aile levée qui salue */}
      {/* aile levée (gauche) */}
      <path d="M17.5 20C13 18 9.8 13.5 10.3 8.8c4.6 1 8.3 4.8 9.6 9.4z" fill="#141414" />
      {/* corps */}
      <path d="M26.5 5.5c-6.6 0-11 4.8-11 12v13.5c0 6.8 4.6 11.5 11 11.5s11-4.7 11-11.5V17.5c0-7.2-4.4-12-11-12z" fill="#141414" />
      {/* ventre blanc */}
      <ellipse cx="26.5" cy="30.5" rx="6.8" ry="9.5" fill="#fff" />
      {/* yeux */}
      <circle cx="23" cy="13.5" r="2.5" fill="#fff" />
      <circle cx="30" cy="13.5" r="2.5" fill="#fff" />
      <circle cx="23.4" cy="14" r="1.15" fill="#141414" />
      <circle cx="29.6" cy="14" r="1.15" fill="#141414" />
      {/* bec */}
      <path d="M22.5 18h8c-.5 2.4-2 3.7-4 3.7s-3.5-1.3-4-3.7z" fill="#F58220" />
      {/* pattes */}
      <ellipse cx="22" cy="43" rx="3.6" ry="1.9" fill="#F58220" />
      <ellipse cx="31" cy="43" rx="3.6" ry="1.9" fill="#F58220" />
    </svg>
  );
}

export function MaxItLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 44" className={className} aria-hidden>
      {/* Wordmark Max it : « Max » noir, « it » blanc, mention SN */}
      <text
        x="48" y="25"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="25"
        letterSpacing="-0.5"
      >
        <tspan fill="#141414">Max</tspan>
        <tspan fill="#fff"> it</tspan>
      </text>
      <text
        x="48" y="39"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="10.5"
        letterSpacing="1"
        fill="#141414"
      >
        SN
      </text>
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
