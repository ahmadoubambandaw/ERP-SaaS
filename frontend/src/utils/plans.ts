// Doit rester synchronisé avec backend/src/config/plans.ts
export type PlanModule =
  | 'dashboard' | 'accounting' | 'invoicing' | 'inventory'
  | 'purchasing' | 'hr' | 'crm' | 'projects';

const STARTER: PlanModule[] = ['dashboard', 'accounting', 'invoicing', 'inventory'];
const PRO: PlanModule[] = [...STARTER, 'purchasing', 'hr', 'crm', 'projects'];

export const PLAN_MODULES: Record<string, PlanModule[]> = {
  STARTER: STARTER,
  PROFESSIONAL: PRO,
  ENTERPRISE: PRO,
};

export function planHasModule(plan: string | undefined, module: PlanModule): boolean {
  return (PLAN_MODULES[plan || 'STARTER'] || STARTER).includes(module);
}
