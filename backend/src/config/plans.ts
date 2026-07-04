// Feature gating par formule d'abonnement.
// Un module absent de la liste est bloqué côté API (403 PLAN_UPGRADE_REQUIRED).

export type PlanModule =
  | 'dashboard'
  | 'accounting'
  | 'invoicing'
  | 'inventory'
  | 'purchasing'
  | 'hr'
  | 'crm'
  | 'projects';

const STARTER_MODULES: PlanModule[] = ['dashboard', 'accounting', 'invoicing', 'inventory'];
const PRO_MODULES: PlanModule[] = [...STARTER_MODULES, 'purchasing', 'hr', 'crm', 'projects'];

export const PLAN_MODULES: Record<string, PlanModule[]> = {
  STARTER: STARTER_MODULES,
  PROFESSIONAL: PRO_MODULES,
  ENTERPRISE: PRO_MODULES,
};

// Nombre maximum d'utilisateurs par organisation (0 = illimité)
export const PLAN_USER_LIMITS: Record<string, number> = {
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
  STARTER: 15000,
  PROFESSIONAL: 25000,
};
