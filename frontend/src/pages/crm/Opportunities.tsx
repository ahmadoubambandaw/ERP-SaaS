import { useQuery } from '@tanstack/react-query';
import { crmService } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const stageLabels: Record<string, string> = {
  PROSPECTING: 'Prospection', QUALIFICATION: 'Qualification', PROPOSAL: 'Proposition',
  NEGOTIATION: 'Negociation', CLOSED_WON: 'Gagne', CLOSED_LOST: 'Perdu',
};
const stageColors: Record<string, string> = {
  PROSPECTING: 'bg-gray-50', QUALIFICATION: 'bg-blue-50', PROPOSAL: 'bg-yellow-50',
  NEGOTIATION: 'bg-orange-50', CLOSED_WON: 'bg-green-50', CLOSED_LOST: 'bg-red-50',
};

export default function OpportunitiesPage() {
  const { organization } = useAuthStore();
  const currency = organization?.currency || 'XOF';
  const { data } = useQuery({ queryKey: ['opportunities'], queryFn: () => crmService.opportunities() });
  const opportunities = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pipeline commercial</h1>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
        {stages.map((stage) => {
          const stageOpps = opportunities.filter((o: Record<string, unknown>) => o.stage === stage);
          const value = stageOpps.reduce((s: number, o: Record<string, unknown>) => s + Number(o.value || 0), 0);
          return (
            <div key={stage} className="min-w-[180px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{stageLabels[stage]}</h3>
                <span className="badge badge-gray">{stageOpps.length}</span>
              </div>
              <div className={`rounded-xl p-2 min-h-[200px] space-y-2 ${stageColors[stage]}`}>
                {stageOpps.map((opp: Record<string, unknown>) => (
                  <div key={opp.id as string} className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="font-medium text-sm text-gray-900">{opp.name as string}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{String((opp.customer as Record<string, unknown>)?.name ?? '')}</p>
                    {Boolean(opp.value) && <p className="text-xs font-medium text-primary-600 mt-1">{formatCurrency(opp.value as number, currency)}</p>}
                    <p className="text-xs text-gray-400 mt-1">{opp.probability as number}% probabilite</p>
                  </div>
                ))}
              </div>
              {value > 0 && <p className="text-xs text-gray-500 mt-1 text-right">{formatCurrency(value, currency)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
