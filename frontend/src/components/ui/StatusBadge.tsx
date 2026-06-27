import { clsx } from 'clsx';

const statusConfig: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Brouillon', class: 'badge-gray' },
  SENT: { label: 'Envoyee', class: 'badge-blue' },
  PARTIAL: { label: 'Partiel', class: 'badge-yellow' },
  PAID: { label: 'Payee', class: 'badge-green' },
  OVERDUE: { label: 'En retard', class: 'badge-red' },
  CANCELLED: { label: 'Annulee', class: 'badge-gray' },
  NEW: { label: 'Nouveau', class: 'badge-blue' },
  CONTACTED: { label: 'Contacte', class: 'badge-yellow' },
  QUALIFIED: { label: 'Qualifie', class: 'badge-green' },
  UNQUALIFIED: { label: 'Non qualifie', class: 'badge-gray' },
  CONVERTED: { label: 'Converti', class: 'badge-green' },
  PLANNING: { label: 'Planification', class: 'badge-gray' },
  IN_PROGRESS: { label: 'En cours', class: 'badge-blue' },
  ON_HOLD: { label: 'En pause', class: 'badge-yellow' },
  COMPLETED: { label: 'Termine', class: 'badge-green' },
  TODO: { label: 'A faire', class: 'badge-gray' },
  IN_REVIEW: { label: 'En revue', class: 'badge-yellow' },
  DONE: { label: 'Fait', class: 'badge-green' },
  LOW: { label: 'Faible', class: 'badge-gray' },
  MEDIUM: { label: 'Moyen', class: 'badge-yellow' },
  HIGH: { label: 'Eleve', class: 'badge-red' },
  URGENT: { label: 'Urgent', class: 'badge-red' },
  ACTIVE: { label: 'Actif', class: 'badge-green' },
  INACTIVE: { label: 'Inactif', class: 'badge-gray' },
  PENDING: { label: 'En attente', class: 'badge-yellow' },
  APPROVED: { label: 'Approuve', class: 'badge-green' },
  REJECTED: { label: 'Rejete', class: 'badge-red' },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, class: 'badge-gray' };
  return <span className={clsx('badge', config.class)}>{config.label}</span>;
}
