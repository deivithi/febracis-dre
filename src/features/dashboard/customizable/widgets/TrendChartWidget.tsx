import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardWidgetRuntimeProps } from '../dashboard-widget.types';
import { formatCurrency, formatPeriodLabel } from '../../../../utils/formatters';
import type { NetworkDashboardRow } from '../../../shared/portal.types';

export default function TrendChartWidget({
  config,
  snapshot,
  onPropsPatch,
  editMode,
}: DashboardWidgetRuntimeProps) {
  const metric =
    typeof config.props.metric === 'string' &&
    (config.props.metric === 'gross_revenue' || config.props.metric === 'ebitda_2')
      ? config.props.metric
      : 'ebitda_2';

  const periods: NetworkDashboardRow[] = [...snapshot.networkRows].sort((a, b) => {
    if (a.period_year !== b.period_year) {
      return a.period_year - b.period_year;
    }
    return a.period_month - b.period_month;
  });

  const windowed = periods.slice(-10);
  const data = windowed.map((row) => ({
    label: formatPeriodLabel(row.period_label),
    receita: Number(row.total_gross_revenue ?? 0),
    ebitda: Number(row.total_ebitda_2 ?? 0),
  }));

  const fmt = (v: number) => (metric === 'gross_revenue' ? formatCurrency(v) : formatCurrency(v));

  return (
    <div className="card dashboard-widget-shell">
      <div className="card__header card__header--widget">
        <div>
          <h3 className="card__title">Tendência da rede</h3>
          <p className="card__subtitle">Histórico por competência (consolidado)</p>
        </div>
        {editMode ? (
          <select
            className="form-select form-select--dense"
            value={metric}
            onChange={(e) =>
              onPropsPatch(config.id, { ...config.props, metric: e.target.value })
            }
          >
            <option value="ebitda_2">EBITDA 2 consolidado</option>
            <option value="gross_revenue">Receita bruta consolidada</option>
          </select>
        ) : null}
      </div>
      <div className="card__body" style={{ minHeight: 220 }}>
        {data.length === 0 ? (
          <p className="text-secondary">Sem série histórica de rede disponível neste utilizador.</p>
        ) : (
          <div className="trend-chart-wrap" aria-label="Gráfico de tendência EBITDA/receita">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ left: 4, right: 12, bottom: 0, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={52}
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(
                      Number(v),
                    )
                  }
                />
                <Tooltip
                  formatter={(value) =>
                    [
                      fmt(Number(value ?? 0)),
                      metric === 'gross_revenue' ? 'Receita' : 'EBITDA 2',
                    ] as [string, string]
                  }
                />
                <Line
                  type="monotone"
                  dataKey={metric === 'gross_revenue' ? 'receita' : 'ebitda'}
                  stroke="var(--color-gold-strong, #c9a227)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
