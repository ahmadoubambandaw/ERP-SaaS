import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  dark: boolean;
  setDark: (v: boolean) => void;
  toggleDark: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      dark: false,
      setDark: (v) => set({ dark: v }),
      toggleDark: () => set({ dark: !get().dark }),
    }),
    { name: 'naatal-ui' },
  ),
);

/** Applique/enlève la classe `dark` sur <html>. Utilisé par les vues internes. */
export function applyDarkClass(dark: boolean): void {
  const el = document.documentElement;
  if (dark) el.classList.add('dark');
  else el.classList.remove('dark');
}
