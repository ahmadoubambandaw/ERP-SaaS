// Profils métiers : libellés et modules accessibles par rôle.

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  DIRECTOR: 'Directeur',
  ACCOUNTANT: 'Comptable',
  SALES: 'Commercial',
  CASHIER: 'Caissier',
  INVENTORY_MANAGER: 'Magasinier',
  HR_MANAGER: 'Responsable RH',
  PROJECT_MANAGER: 'Chef de projet',
  EMPLOYEE: 'Employé',
};

// Profils réservés à la formule Enterprise (Admin et Employé restent disponibles partout)
export const ADVANCED_ROLES = ['DIRECTOR', 'ACCOUNTANT', 'SALES', 'CASHIER', 'INVENTORY_MANAGER', 'HR_MANAGER', 'PROJECT_MANAGER'];

// Modules visibles par rôle (les rôles absents de cette liste voient tout)
const ROLE_MODULES: Record<string, string[]> = {
  ACCOUNTANT: ['dashboard', 'accounting', 'invoicing'],
  SALES: ['dashboard', 'invoicing', 'crm', 'projects'],
  CASHIER: ['dashboard', 'invoicing'],
  INVENTORY_MANAGER: ['dashboard', 'inventory', 'purchasing'],
  HR_MANAGER: ['dashboard', 'hr'],
  PROJECT_MANAGER: ['dashboard', 'projects', 'crm'],
  EMPLOYEE: ['dashboard'],
};

/** Le rôle a-t-il accès à ce module ? (SUPER_ADMIN, ADMIN et DIRECTOR voient tout) */
export function roleHasModule(role: string | undefined, module: string | undefined): boolean {
  if (!module || !role) return true;
  const allowed = ROLE_MODULES[role];
  return !allowed || allowed.includes(module);
}
