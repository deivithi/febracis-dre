import type { LucideIcon } from 'lucide-react';
import type { KpiSparklineMetric } from '../shared/portal.types';
import { KpiCard, type DashboardKpiSparklineState } from '../../components/ui/KpiCard';

export type ExecutiveKpiSparklinePlan = {
  metric: KpiSparklineMetric;
  valueFormat: 'currency' | 'integer';
  franchiseId: string | null;
  regionalId: string | null;
};

export interface ExecutiveKpiItem {
  label: string;
  value: string;
  percent: string;
  trend: string;
  trendUp: boolean;
  variant: 'default' | 'gold' | 'success' | 'warning';
  icon: LucideIcon;
  /** RPC `get_kpi_history`; omitir ou `null` desliga sparkline neste tile. */
  sparklinePlan?: ExecutiveKpiSparklinePlan | null;
}

type ExecutiveKpiGridProps = {
  items: ExecutiveKpiItem[];
  /** Um estado por tile; mesma ordem de `items`. Omitir = sparklines desligadas. */
  sparklineStates?: DashboardKpiSparklineState[];
  ariaLabel?: string;
};

/** Faixa KPI do painel executivo — contrato estável para acessibilidade e tema Febracis. */
export function ExecutiveKpiGrid({
  items,
  sparklineStates = [],
  ariaLabel = 'Indicadores do período',
}: ExecutiveKpiGridProps) {
  const disabledSparkline: DashboardKpiSparklineState = {
    enabled: false,
    isLoading: false,
    isError: false,
    data: undefined,
    valueFormat: 'currency',
  };

  return (
    <div className="kpi-grid" role="region" aria-label={ariaLabel}>
      {items.map((kpi, index) => {
        const headingId = `dashboard-kpi-heading-${index}`;
        const plan = kpi.sparklinePlan;
        const rawState = sparklineStates[index];
        const sparkline =
          plan == null
            ? disabledSparkline
            : (rawState ?? disabledSparkline);

        return (
          <KpiCard
            key={headingId}
            headingId={headingId}
            label={kpi.label}
            value={kpi.value}
            percent={kpi.percent}
            trend={kpi.trend}
            trendUp={kpi.trendUp}
            variant={kpi.variant}
            icon={kpi.icon}
            sparkline={sparkline}
          />
        );
      })}
    </div>
  );
}
