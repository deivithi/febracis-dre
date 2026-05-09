import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Suspense, lazy } from 'react';
import type { KpiHistoryPoint } from '../../features/shared/portal.types';
import type { SparklineColorMode } from './Sparkline';

const SparklineLazy = lazy(async () => {
  const mod = await import('./Sparkline');
  return { default: mod.Sparkline };
});

export type KpiCardVariant = 'default' | 'gold' | 'success' | 'warning';

export type DashboardKpiSparklineState = {
  /** Quando falso, não reserva slot inferior. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  data: KpiHistoryPoint[] | undefined;
  valueFormat: 'currency' | 'integer';
};

export type KpiCardProps = {
  headingId: string;
  label: string;
  value: string;
  percent: string;
  trend: string;
  trendUp: boolean;
  variant: KpiCardVariant;
  icon: LucideIcon;
  sparkline: DashboardKpiSparklineState;
};

function deriveSparklineColor(variant: KpiCardVariant): SparklineColorMode {
  if (variant === 'gold') {
    return 'gold';
  }
  if (variant === 'success') {
    return 'success';
  }
  return 'auto';
}

/** Cartão KPI reutilizável (dashboard executivo) com micro-spark opcional. */
export function KpiCard({
  headingId,
  label,
  value,
  percent,
  trend,
  trendUp,
  variant,
  icon: Icon,
  sparkline,
}: KpiCardProps) {
  const cardClassName = variant === 'default' ? 'kpi-card' : `kpi-card kpi-card--${variant}`;

  const chartColor = deriveSparklineColor(variant);

  const insufficient = sparkline.enabled && !sparkline.isLoading && Boolean(sparkline.data && sparkline.data.length < 3);

  const showChart =
    sparkline.enabled &&
    !sparkline.isLoading &&
    !sparkline.isError &&
    sparkline.data &&
    sparkline.data.length >= 3;

  return (
    <article className={cardClassName} aria-labelledby={headingId}>
      <div className="kpi-card__header">
        <span id={headingId} className="kpi-card__label">
          {label}
        </span>
        <div className="kpi-card__icon" aria-hidden="true">
          <Icon />
        </div>
      </div>

      <div
        className={`kpi-card__value num-tabular ${
          variant === 'gold'
            ? 'kpi-card__value--gold'
            : variant === 'success'
              ? 'kpi-card__value--success'
              : ''
        }`}
      >
        {value}
      </div>

      <div className="kpi-card__footer">
        <span className="kpi-card__percent num-tabular">{percent}</span>
        <span
          className={`kpi-card__trend num-tabular ${trendUp ? 'kpi-card__trend--up' : 'kpi-card__trend--down'}`}
        >
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </span>
      </div>

      {sparkline.enabled ? (
        <div className="kpi-card__sparkline-slot">
          {sparkline.isLoading ? (
            <div
              className="sparkline-shell"
              data-loading="true"
              style={{ ['--sparkline-height' as string]: '32px' }}
            >
              <div className="sparkline-shell__shimmer" />
            </div>
          ) : null}

          {!sparkline.isLoading && sparkline.isError ? (
            <p className="sparkline-empty-note">Histórico indisponível</p>
          ) : null}

          {!sparkline.isLoading && !sparkline.isError && insufficient ? (
            <p className="sparkline-empty-note">Sem histórico suficiente</p>
          ) : null}

          {showChart ? (
            <Suspense fallback={<div className="sparkline-shell__shimmer" />}>
              <SparklineLazy
                series={sparkline.data ?? []}
                color={chartColor}
                height={32}
                width={80}
                valueFormat={sparkline.valueFormat}
              />
            </Suspense>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
