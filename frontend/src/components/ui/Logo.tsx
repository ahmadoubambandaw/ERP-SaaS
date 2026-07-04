// Logo Naatal — "N" avec flèche de prospérité dorée.
// Rendu inline (SVG) : net à toute taille, aucune requête réseau.
export default function Logo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Naatal">
      <defs>
        <linearGradient id="naatal-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#naatal-grad)" />
      <path
        d="M150 372 L150 158 L362 372 L362 158"
        fill="none" stroke="#ffffff" strokeWidth="46"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M300 150 L392 150 L392 242"
        fill="none" stroke="#fbbf24" strokeWidth="30"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M392 150 L322 220" fill="none" stroke="#fbbf24" strokeWidth="30" strokeLinecap="round" />
    </svg>
  );
}
