import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AccessProfile } from '../auth/auth.types';
import { buildFranchiseMetricTrendRpcFilters } from './franchiseMetricTrendParams';
import type { DerivedHoldingView } from './holdingDerivations';
import { fetchFranchiseMetricTrend } from '../shared/portal.api';
import type { FranchiseMetricTrendMetric, FranchiseMetricTrendRow } from '../shared/portal.types';
import { colorFromFranchiseId } from '../../utils/colorFromId';
import {
  formatSparkPeriodTooltip,
  formatSparkTooltipValue,
  toNumber,
} from '../../utils/formatters';
import { EmptyState } from '../../components/EmptyState';
import { LineChart as LineChartIcon } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

const REDE_TOTAL_KEY = '__rede_total__';
const OTHERS_KEY = '__others__';
const MEDIA_REGIONAL_KEY = '__media_regional__';

const GOLD_STROKE = 'var(--accent-gold, #f0b73e)';
const MEDIA_REGIONAL_STROKE = '#64748b';

const MAX_FRANCHISE_LINES = 8;

type TrendChartDataRow = Record<string, number | string | null> & {
  monthSort: string;
  monthLabel: string;
};

function getSelectedFranchiseId(
  access: AccessProfile,
  holdingDerived: DerivedHoldingView | null,
): string | null {
  if (holdingDerived?.effectiveFranchiseId && holdingDerived.effectiveFranchiseId !== 'all') {
    return holdingDerived.effectiveFranchiseId;
  }
  if (access.dashboardScope === 'franchise' && access.franchiseIds.length === 1) {
    return access.franchiseIds[0] ?? null;
  }
  return null;
}

function parsePeriodParts(periodMonth: string): { y: number; m: number } {
  const [ys, ms] = periodMonth.split('-');
  const y = Number(ys);
  const m = Number(ms);
  return { y: Number.isFinite(y) ? y : 0, m: Number.isFinite(m) ? m : 1 };
}

/** FUTURE: projeção opcional — continuar 3 meses com média móvel tracejada (feature-flag de produto). */

function buildChartPayload(
  rows: FranchiseMetricTrendRow[],
  selectedFranchiseId: string | null,
): {
  chartData: TrendChartDataRow[];
  lineKeys: string[];
  lineMeta: Record<string, { label: string; color: string; strokeWidth?: number; strokeDasharray?: string }>;
} {
  const byPeriod = new Map<string, Map<string, number>>();
  const idToName = new Map<string, string>();

  for (const row of rows) {
    const pid = row.franchise_id;
    idToName.set(pid, row.franchise_name);
    const period = row.period_month;
    if (!byPeriod.has(period)) {
      byPeriod.set(period, new Map());
    }
    byPeriod.get(period)!.set(pid, toNumber(row.metric_value));
  }

  const sortedPeriods = [...byPeriod.keys()].sort();
  const franchiseIds = [...idToName.keys()];

  const lineMeta: Record<string, { label: string; color: string; strokeWidth?: number; strokeDasharray?: string }> =
    {};
  const lineKeys: string[] = [];

  /** Uma única unidade visível (ex.: franchise_user): só a série da franquia — sem “Rede total” duplicado. */
  if (franchiseIds.length === 1) {
    const only = franchiseIds[0]!;
    lineKeys.push(only);
    lineMeta[only] = {
      label: idToName.get(only) ?? 'Franquia',
      color: colorFromFranchiseId(only),
      strokeWidth: 2,
    };
    const chartDataSingle: TrendChartDataRow[] = sortedPeriods.map((period) => {
      const cell = byPeriod.get(period)!;
      const { y, m } = parsePeriodParts(period);
      return {
        monthSort: period,
        monthLabel: formatSparkPeriodTooltip(y, m),
        [only]: cell.get(only) ?? null,
      };
    });
    return { chartData: chartDataSingle, lineKeys, lineMeta };
  }

  const peerAvgMode = Boolean(selectedFranchiseId) && franchiseIds.length > 1;

  if (peerAvgMode && selectedFranchiseId) {
    const name = idToName.get(selectedFranchiseId) ?? 'Franquia';
    lineKeys.push(selectedFranchiseId);
    lineMeta[selectedFranchiseId] = { label: name, color: colorFromFranchiseId(selectedFranchiseId), strokeWidth: 2 };

    lineKeys.push(MEDIA_REGIONAL_KEY);
    lineMeta[MEDIA_REGIONAL_KEY] = {
      label: 'Média regional',
      color: MEDIA_REGIONAL_STROKE,
      strokeWidth: 2,
      strokeDasharray: '5 5',
    };

    const chartData: TrendChartDataRow[] = sortedPeriods.map((period) => {
      const cell = byPeriod.get(period)!;
      const { y, m } = parsePeriodParts(period);
      const row: TrendChartDataRow = {
        monthSort: period,
        monthLabel: formatSparkPeriodTooltip(y, m),
        [selectedFranchiseId]: cell.get(selectedFranchiseId) ?? null,
      };

      const others = franchiseIds.filter((id) => id !== selectedFranchiseId);
      const vals = others.map((id) => cell.get(id)).filter((v): v is number => v != null && Number.isFinite(v));
      row[MEDIA_REGIONAL_KEY] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return row;
    });

    return { chartData, lineKeys, lineMeta };
  }

  /** Ordena franquias pelo valor no último mês com dado (fallback: soma). */
  const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
  const score = (fid: string) => {
    let s = 0;
    if (lastPeriod && byPeriod.has(lastPeriod)) {
      s = toNumber(byPeriod.get(lastPeriod)!.get(fid));
    }
    if (s === 0) {
      for (const p of sortedPeriods) {
        s += toNumber(byPeriod.get(p)!.get(fid));
      }
    }
    return s;
  };

  const sortedFranchises = [...franchiseIds].sort((a, b) => score(b) - score(a));
  const topIds = sortedFranchises.slice(0, MAX_FRANCHISE_LINES);
  const restIds = sortedFranchises.slice(MAX_FRANCHISE_LINES);

  for (const fid of topIds) {
    lineKeys.push(fid);
    lineMeta[fid] = {
      label: idToName.get(fid) ?? fid,
      color: colorFromFranchiseId(fid),
      strokeWidth: 2,
    };
  }

  if (restIds.length) {
    lineKeys.push(OTHERS_KEY);
    lineMeta[OTHERS_KEY] = {
      label: 'Outras unidades',
      color: '#94a3b8',
      strokeWidth: 2,
      strokeDasharray: '4 4',
    };
  }

  lineKeys.push(REDE_TOTAL_KEY);
  lineMeta[REDE_TOTAL_KEY] = {
    label: 'Rede total',
    color: GOLD_STROKE,
    strokeWidth: 3,
    strokeDasharray: '6 4',
  };

  const chartData: TrendChartDataRow[] = sortedPeriods.map((period) => {
    const cell = byPeriod.get(period)!;
    const { y, m } = parsePeriodParts(period);
    const row: TrendChartDataRow = {
      monthSort: period,
      monthLabel: formatSparkPeriodTooltip(y, m),
    };

    let total = 0;
    for (const fid of franchiseIds) {
      const v = cell.get(fid);
      const num = v != null ? toNumber(v) : null;
      if (num != null) {
        total += num;
      }
    }

    for (const fid of topIds) {
      row[fid] = cell.get(fid) ?? null;
    }

    if (restIds.length) {
      let sumOthers = 0;
      for (const fid of restIds) {
        const v = cell.get(fid);
        if (v != null) {
          sumOthers += toNumber(v);
        }
      }
      row[OTHERS_KEY] = sumOthers;
    }

    row[REDE_TOTAL_KEY] = total;
    return row;
  });

  return { chartData, lineKeys, lineMeta };
}

function EbitdaTrendChartSkeleton() {
  return (
    <div className="ebitda-trend-chart ebitda-trend-chart--skeleton" style={{ minHeight: 320 }} aria-hidden>
      <div className="ebitda-trend-chart__header-row">
        <Skeleton style={{ width: '40%', height: '1rem', maxWidth: 280 }} />
        <Skeleton style={{ width: 280, height: 36, borderRadius: 8 }} />
      </div>
      <Skeleton style={{ width: '100%', height: 320, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
}

const METRIC_LABELS: Record<FranchiseMetricTrendMetric, string> = {
  ebitda_1: 'EBITDA 1',
  ebitda_2: 'EBITDA 2',
  mc1: 'MC1',
  mc2: 'MC2',
};

type Props = {
  access: AccessProfile;
  holdingDerived: DerivedHoldingView | null;
};

export function EbitdaTrendChart({ access, holdingDerived }: Props) {
  const [metric, setMetric] = useState<FranchiseMetricTrendMetric>('ebitda_2');
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());

  const rpcFilters = useMemo(
    () => buildFranchiseMetricTrendRpcFilters(access, holdingDerived),
    [access, holdingDerived],
  );

  const trendEnabled =
    access.dashboardScope !== 'holding' ||
    (holdingDerived != null && access.dashboardScope === 'holding');

  const trendQuery = useQuery({
    queryKey: [
      'franchise-metric-trend',
      metric,
      access.dashboardScope,
      rpcFilters.p_region_id,
      rpcFilters.p_franchise_ids?.join(',') ?? '',
      holdingDerived?.effectiveRegionalId,
      holdingDerived?.effectiveFranchiseId,
      access.regionalIds.join(','),
    ],
    queryFn: () =>
      fetchFranchiseMetricTrend({
        regionId: rpcFilters.p_region_id,
        franchiseIds: rpcFilters.p_franchise_ids,
        months: 12,
        metric,
      }),
    enabled: trendEnabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const selectedFranchiseId = useMemo(
    () => getSelectedFranchiseId(access, holdingDerived),
    [access, holdingDerived],
  );

  const { chartData, lineKeys, lineMeta } = useMemo(
    () => buildChartPayload(trendQuery.data ?? [], selectedFranchiseId),
    [trendQuery.data, selectedFranchiseId],
  );

  const toggleKey = useCallback((dataKey: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  }, []);

  if (!trendEnabled) {
    return null;
  }

  if (trendQuery.isLoading) {
    return (
      <section
        className="dashboard__section dashboard__section--trend"
        aria-labelledby="dashboard-trend-heading-skel"
      >
        <h2 id="dashboard-trend-heading-skel" className="dashboard__section-heading">
          Tendência multi-franquia
        </h2>
        <EbitdaTrendChartSkeleton />
      </section>
    );
  }

  if (trendQuery.isError) {
    return (
      <section className="dashboard__section dashboard__section--trend" aria-labelledby="dashboard-trend-heading-err">
        <h2 id="dashboard-trend-heading-err" className="dashboard__section-heading">
          Tendência multi-franquia
        </h2>
        <div className="card card--accent">
          <div className="card__body">
            <p className="inline-message inline-message--danger">
              Não foi possível carregar o gráfico de tendência. Tente atualizar a página.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!chartData.length) {
    return (
      <section className="dashboard__section dashboard__section--trend" aria-labelledby="dashboard-trend-heading">
        <h2 id="dashboard-trend-heading" className="dashboard__section-heading">
          Tendência multi-franquia
        </h2>
        <div className="card card--accent">
          <div className="card__body">
            <EmptyState
              icon={LineChartIcon}
              title="Sem histórico aprovado"
              description="Sem períodos aprovados para gerar tendência"
              size="md"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard__section dashboard__section--trend" aria-labelledby="dashboard-trend-heading">
      <h2 id="dashboard-trend-heading" className="dashboard__section-heading">
        Tendência multi-franquia (últimos 12 meses, BRT)
      </h2>

      <div className="card card--accent ebitda-trend-chart">
        <div className="card__header ebitda-trend-chart__header-row">
          <div>
            <h3 className="card__title">Indicadores por unidade</h3>
            <p className="card__subtitle">Somente submissões aprovadas. Clique na legenda para exibir ou ocultar séries.</p>
          </div>
          <ToggleGroup.Root
            type="single"
            className="ebitda-trend-chart__toggle-root"
            value={metric}
            onValueChange={(v: string) => {
              if (v) {
                setMetric(v as FranchiseMetricTrendMetric);
              }
            }}
            aria-label="Métrica do gráfico"
          >
            {(Object.keys(METRIC_LABELS) as FranchiseMetricTrendMetric[]).map((m) => (
              <ToggleGroup.Item key={m} value={m} className="ebitda-trend-chart__toggle-item">
                {METRIC_LABELS[m]}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>

        <div className="card__body ebitda-trend-chart__body">
          <div className="ebitda-trend-chart__plot" style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted, #334155)" opacity={0.35} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, className: 'tabular-nums' }}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 11, className: 'tabular-nums' }}
                  tickFormatter={(v) => formatSparkTooltipValue(v, 'currency')}
                  width={72}
                />
                <Tooltip
                  content={({ active, label, payload }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }
                    const sorted = [...payload].sort(
                      (a, b) => toNumber(b.value) - toNumber(a.value),
                    );
                    return (
                      <div className="ebitda-trend-chart__tooltip glass">
                        <div className="ebitda-trend-chart__tooltip-title">{label}</div>
                        <ul className="ebitda-trend-chart__tooltip-list">
                          {sorted.map((item) => {
                            const key = String(item.dataKey ?? '');
                            const meta = lineMeta[key];
                            const title = meta?.label ?? key;
                            return (
                              <li key={key} className="tabular-nums ebitda-trend-chart__tooltip-row">
                                <span className="ebitda-trend-chart__tooltip-dot" style={{ background: item.color }} />
                                <span className="ebitda-trend-chart__tooltip-name">{title}</span>
                                <span className="ebitda-trend-chart__tooltip-val">
                                  {formatSparkTooltipValue(item.value, 'currency')}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  }}
                />
                <Legend
                  onClick={(item) => {
                    if (item?.dataKey != null) {
                      toggleKey(String(item.dataKey));
                    }
                  }}
                  wrapperStyle={{ cursor: 'pointer', paddingTop: 12 }}
                />
                {lineKeys.map((key) => {
                  const meta = lineMeta[key];
                  if (!meta) {
                    return null;
                  }
                  const hide = hiddenKeys.has(key);
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={meta.label}
                      stroke={meta.color}
                      strokeWidth={meta.strokeWidth ?? 2}
                      strokeDasharray={meta.strokeDasharray}
                      dot={false}
                      connectNulls
                      hide={hide}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="ebitda-trend-chart__hint page-container__subtitle">
            Exportação PNG opcional: <strong>html2canvas</strong> não foi adicionada (impacto de bundle típico &gt;100kb).
            Use captura de ecrã ou exporte dados via relatórios até haver flag de produto.
          </p>
        </div>
      </div>
    </section>
  );
}
