import { Skeleton } from '../ui/Skeleton';
import './skeleton-shared.css';

type KpiCardSkeletonProps = {
  /** Reserve footer slot for future sparkline / micro-chart (U13). */
  sparklineReserve?: boolean;
  ariaHidden?: boolean;
};

/**
 * Mirrors `ExecutiveKpiGrid` / `.kpi-card` padding, header row, mono value line, footer pair.
 */
export function KpiCardSkeleton({ sparklineReserve = false, ariaHidden = true }: KpiCardSkeletonProps) {
  return (
    <article className="kpi-card kpi-card--skeleton" aria-hidden={ariaHidden ? true : undefined}>
      <div className="kpi-card__header">
        <Skeleton style={{ width: '62%', height: '0.85rem' }} />
        <Skeleton style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)' }} />
      </div>
      <Skeleton style={{ width: '58%', height: 'var(--text-3xl)', marginTop: 'var(--space-1)' }} />
      <div className="kpi-card__footer">
        <Skeleton style={{ width: '72%', height: '0.75rem' }} />
        <Skeleton style={{ width: '22%', height: '0.75rem' }} />
      </div>
      {sparklineReserve ? <Skeleton className="skeleton-sparkline-slot" style={{ width: '100%' }} /> : null}
    </article>
  );
}
