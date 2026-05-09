import type { DashboardWidgetRuntimeProps } from '../dashboard-widget.types';
import { ExecutiveKpiGrid } from '../../ExecutiveKpiGrid';

/** Faixa KPI completa — reutiliza dados já carregados no painel. */
export default function KpiWidget({ kpis, kpiSparklineStates }: DashboardWidgetRuntimeProps) {
  return (
    <div className="dashboard-widget-shell dashboard-widget-shell--kpis">
      <ExecutiveKpiGrid
        items={kpis}
        sparklineStates={kpiSparklineStates}
        ariaLabel="Indicadores configuráveis do painel"
      />
    </div>
  );
}
