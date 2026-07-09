import { create } from 'zustand';

interface AssistantState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

/** Contrôle l'ouverture du conseiller IA depuis n'importe quel bouton de la page. */
export const useAssistantStore = create<AssistantState>((set, get) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set({ open: !get().open }),
}));
