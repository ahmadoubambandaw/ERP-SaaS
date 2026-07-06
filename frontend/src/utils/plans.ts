// Doit rester synchronisé avec backend/src/config/plans.ts
export type PlanModule =
  | 'dashboard' | 'pos' | 'accounting' | 'invoicing' | 'inventory'
  | 'purchasing' | 'hr' | 'crm' | 'projects';

const CAISSE: PlanModule[] = ['dashboard', 'pos', 'invoicing', 'inventory'];
const STARTER: PlanModule[] = [...CAISSE, 'accounting'];
const PRO: PlanModule[] = [...STARTER, 'purchasing', 'hr', 'crm', 'projects'];

export const PLAN_MODULES: Record<string, PlanModule[]> = {
  CAISSE: CAISSE,
  STARTER: STARTER,
  PROFESSIONAL: PRO,
  ENTERPRISE: PRO,
};

export function planHasModule(plan: string | undefined, module: PlanModule): boolean {
  return (PLAN_MODULES[plan || 'STARTER'] || STARTER).includes(module);
}
