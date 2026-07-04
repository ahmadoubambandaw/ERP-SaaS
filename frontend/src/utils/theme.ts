// Thèmes de couleur : chaque palette = les 10 nuances au format "R G B"
// (compatible avec rgb(var(--primary-500) / <alpha-value>) dans Tailwind)

export interface Theme {
  id: string;
  label: string;
  swatch: string; // couleur d'aperçu (nuance 600)
  shades: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'blue', label: 'Bleu', swatch: '#2563eb',
    shades: {
      50: '239 246 255', 100: '219 234 254', 200: '191 219 254', 300: '147 197 253', 400: '96 165 250',
      500: '59 130 246', 600: '37 99 235', 700: '29 78 216', 800: '30 64 175', 900: '30 58 138',
    },
  },
  {
    id: 'emerald', label: 'Émeraude', swatch: '#059669',
    shades: {
      50: '236 253 245', 100: '209 250 229', 200: '167 243 208', 300: '110 231 183', 400: '52 211 153',
      500: '16 185 129', 600: '5 150 105', 700: '4 120 87', 800: '6 95 70', 900: '6 78 59',
    },
  },
  {
    id: 'violet', label: 'Violet', swatch: '#7c3aed',
    shades: {
      50: '245 243 255', 100: '237 233 254', 200: '221 214 254', 300: '196 181 253', 400: '167 139 250',
      500: '139 92 246', 600: '124 58 237', 700: '109 40 217', 800: '91 33 182', 900: '76 29 149',
    },
  },
  {
    id: 'amber', label: 'Ambre', swatch: '#d97706',
    shades: {
      50: '255 251 235', 100: '254 243 199', 200: '253 230 138', 300: '252 211 77', 400: '251 191 36',
      500: '245 158 11', 600: '217 119 6', 700: '180 83 9', 800: '146 64 14', 900: '120 53 15',
    },
  },
  {
    id: 'rose', label: 'Rose', swatch: '#e11d48',
    shades: {
      50: '255 241 242', 100: '255 228 230', 200: '254 205 211', 300: '253 164 175', 400: '251 113 133',
      500: '244 63 94', 600: '225 29 72', 700: '190 18 60', 800: '159 18 57', 900: '136 19 55',
    },
  },
  {
    id: 'teal', label: 'Sarcelle', swatch: '#0d9488',
    shades: {
      50: '240 253 250', 100: '204 251 241', 200: '153 246 228', 300: '94 234 212', 400: '45 212 191',
      500: '20 184 166', 600: '13 148 136', 700: '15 118 110', 800: '17 94 89', 900: '19 78 74',
    },
  },
];

const STORAGE_KEY = 'erp-theme';
export const DEFAULT_THEME = 'blue';

export function applyTheme(id: string): void {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.shades).forEach(([shade, rgb]) => {
    root.style.setProperty(`--primary-${shade}`, rgb);
  });
  localStorage.setItem(STORAGE_KEY, theme.id);
}

export function getCurrentTheme(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
}

// Appelé au démarrage de l'app
export function initTheme(): void {
  applyTheme(getCurrentTheme());
}
