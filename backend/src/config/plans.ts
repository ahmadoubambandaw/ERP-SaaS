// Feature gating par formule d'abonnement.
// Un module absent de la liste est bloqué côté API (403 PLAN_UPGRADE_REQUIRED).

export type PlanModule =
  | 'dashboard'
  | 'pos'
  | 'accounting'
  | 'invoicing'
  | 'inventory'
  | 'purchasing'
  | 'hr'
  | 'crm'
  | 'projects';

// Caisse : la porte d'entrée du boutiquier — vente au comptoir, stock, clients, factures
const CAISSE_MODULES: PlanModule[] = ['dashboard', 'pos', 'invoicing', 'inventory'];
const STARTER_MODULES: PlanModule[] = [...CAISSE_MODULES, 'accounting'];
const PRO_MODULES: PlanModule[] = [...STARTER_MODULES, 'purchasing', 'hr', 'crm', 'projects'];

export const PLAN_MODULES: Record<string, PlanModule[]> = {
  CAISSE: CAISSE_MODULES,
  STARTER: STARTER_MODULES,
  PROFESSIONAL: PRO_MODULES,
  ENTERPRISE: PRO_MODULES,
};

// Nombre maximum d'utilisateurs par organisation (0 = illimité)
export const PLAN_USER_LIMITS: Record<string, number> = {
  CAISSE: 1,
  STARTER: 3,
  PROFESSIONAL: 10,
  ENTERPRISE: 0,
};

export function planHasModule(plan: string, module: PlanModule): boolean {
  return (PLAN_MODULES[plan] || PLAN_MODULES.STARTER).includes(module);
}

export function planUserLimit(plan: string): number {
  return PLAN_USER_LIMITS[plan] ?? PLAN_USER_LIMITS.STARTER;
}

// Prix mensuel par formule (XOF) pour le paiement en ligne
export const PLAN_PRICE_XOF: Record<string, number> = {
  CAISSE: 5000,
  STARTER: 10000,
  PROFESSIONAL: 20000,
};
