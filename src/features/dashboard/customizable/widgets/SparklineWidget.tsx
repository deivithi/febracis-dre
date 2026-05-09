import { KpiCard, type DashboardKpiSparklineState } from '../../../../components/ui/KpiCard';
import type { DashboardWidgetRuntimeProps } from '../dashboard-widget.types';

export default function SparklineWidget({
  config,
  onPropsPatch,
  kpis,
  kpiSparklineStates,
  editMode,
}: DashboardWidgetRuntimeProps) {
  const raw = config.props.kpiIndex;
  const kpiIndex = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) || 0 : 0;

  const kpi = kpis[kpiIndex];
  const spark = kpiSparklineStates[kpiIndex] ?? ({
    enabled: false,
    isLoading: false,
    isError: false,
    data: undefined,
    valueFormat: 'currency',
  } satisfies DashboardKpiSparklineState);

  if (!kpi) {
    return (
      <div className="dashboard-widget-shell">
        <p className="text-secondary">Índice de KPI indisponível neste âmbito.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-widget-shell dashboard-widget-shell--sparkline">
      {editMode ? (
        <label className="dashboard-widget-mini-field">
          <span className="form-label">KPI #{kpiIndex + 1}</span>
          <select
            className="form-select"
            value={kpiIndex}
            onChange={(e) =>
              onPropsPatch(config.id, { ...config.props, kpiIndex: Number.parseInt(e.target.value, 10) })
            }
          >
            {kpis.map((item, idx) => (
              <option key={`${idx}-${item.label}`} value={idx}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <KpiCard
        headingId={`widget-spark-${config.id}`}
        label={kpi.label}
        value={kpi.value}
        percent={kpi.percent}
        trend={kpi.trend}
        trendUp={kpi.trendUp}
        variant={kpi.variant}
        icon={kpi.icon}
        sparkline={spark}
      />
    </div>
  );
}
