import type { LucideIcon } from 'lucide-react';
import { DeltaIndicator, type DeltaValueMode } from './DeltaIndicator';
import './ExecutiveKpiCompareGrid.css';

export type ExecutiveKpiCompareItem = {
  label: string;
  variant: 'default' | 'gold' | 'success' | 'warning';
  icon: LucideIcon;
  valueA: string;
  percentA: string;
  valueB: string;
  percentB: string;
  rawA: unknown;
  rawB: unknown;
  deltaMode: DeltaValueMode;
  higherIsBetter: boolean;
};

type ExecutiveKpiCompareGridProps = {
  items: ExecutiveKpiCompareItem[];
  ariaLabel?: string;
  /** So variacoes delta (aba delta no mobile). */
  deltaOnly?: boolean;
  showSideColumns?: boolean;
  /** Restringe colunas visiveis (layout estreito / abas). */
  visibleSide?: 'both' | 'a' | 'b' | 'delta';
};

export function ExecutiveKpiCompareGrid({
  items,
  ariaLabel = 'Comparativo de indicadores entre competências',
  deltaOnly = false,
  showSideColumns = true,
  visibleSide = 'both',
}: ExecutiveKpiCompareGridProps) {
  const resolvedSide = deltaOnly ? 'delta' : visibleSide;
  const effectiveDeltaOnly = resolvedSide === 'delta';
  const showDelta = resolvedSide === 'both' || resolvedSide === 'delta';
  const showA = resolvedSide === 'both' || resolvedSide === 'a';
  const showB = resolvedSide === 'both' || resolvedSide === 'b';

  return (
    <div className="kpi-compare-grid" role="region" aria-label={ariaLabel}>
      {items.map((kpi, index) => {
        const Icon = kpi.icon;
        const cardClassA =
          kpi.variant === 'default' ? 'kpi-compare-card' : `kpi-compare-card kpi-compare-card--${kpi.variant}`;
        const cardClassB = cardClassA;
        const headingId = `dashboard-kpi-compare-heading-${index}`;

        const rowMod =
          resolvedSide === 'a'
            ? 'kpi-compare-row--solo-a'
            : resolvedSide === 'b'
              ? 'kpi-compare-row--solo-b'
              : resolvedSide === 'delta'
                ? 'kpi-compare-row--solo-delta'
                : '';

        return (
          <div key={headingId} className={`kpi-compare-row ${rowMod}`.trim()}>
            {showSideColumns && !effectiveDeltaOnly && showA ? (
              <article className={cardClassA} aria-labelledby={headingId}>
                <div className="kpi-compare-card__header">
                  <span id={headingId} className="kpi-compare-card__label">
                    {kpi.label}
                  </span>
                  <div className="kpi-compare-card__icon" aria-hidden="true">
                    <Icon />
                  </div>
                </div>
                <div
                  className={`kpi-compare-card__value num-tabular ${
                    kpi.variant === 'gold'
                      ? 'kpi-compare-card__value--gold'
                      : kpi.variant === 'success'
                        ? 'kpi-compare-card__value--success'
                        : ''
                  }`}
                >
                  {kpi.valueA}
                </div>
                <div className="kpi-compare-card__footer">
                  <span className="kpi-compare-card__percent num-tabular">{kpi.percentA}</span>
                </div>
              </article>
            ) : null}

            {showSideColumns && showDelta && !effectiveDeltaOnly ? (
              <div className="kpi-compare-row__delta">
                <DeltaIndicator
                  valueA={kpi.rawA}
                  valueB={kpi.rawB}
                  mode={kpi.deltaMode}
                  higherIsBetter={kpi.higherIsBetter}
                />
              </div>
            ) : null}

            {effectiveDeltaOnly && showDelta ? (
              <div className="kpi-compare-row__delta kpi-compare-row__delta--solo">
                <span className="kpi-compare-row__delta-label">{kpi.label}</span>
                <DeltaIndicator
                  valueA={kpi.rawA}
                  valueB={kpi.rawB}
                  mode={kpi.deltaMode}
                  higherIsBetter={kpi.higherIsBetter}
                />
              </div>
            ) : null}

            {showSideColumns && !effectiveDeltaOnly && showB ? (
              <article className={cardClassB} aria-labelledby={`${headingId}-b`}>
                <div className="kpi-compare-card__header">
                  <span id={`${headingId}-b`} className="kpi-compare-card__label kpi-compare-card__label--visually-muted">
                    {kpi.label}
                  </span>
                  <div className="kpi-compare-card__icon" aria-hidden="true">
                    <Icon />
                  </div>
                </div>
                <div
                  className={`kpi-compare-card__value num-tabular ${
                    kpi.variant === 'gold'
                      ? 'kpi-compare-card__value--gold'
                      : kpi.variant === 'success'
                        ? 'kpi-compare-card__value--success'
                        : ''
                  }`}
                >
                  {kpi.valueB}
                </div>
                <div className="kpi-compare-card__footer">
                  <span className="kpi-compare-card__percent num-tabular">{kpi.percentB}</span>
                </div>
              </article>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
