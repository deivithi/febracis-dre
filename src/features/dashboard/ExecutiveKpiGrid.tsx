import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

export interface ExecutiveKpiItem {
  label: string;
  value: string;
  percent: string;
  trend: string;
  trendUp: boolean;
  variant: 'default' | 'gold' | 'success' | 'warning';
  icon: LucideIcon;
}

type ExecutiveKpiGridProps = {
  items: ExecutiveKpiItem[];
  ariaLabel?: string;
};

/** Faixa KPI do painel executivo — contrato estável para acessibilidade e tema Febracis. */
export function ExecutiveKpiGrid({ items, ariaLabel = 'Indicadores do período' }: ExecutiveKpiGridProps) {
  return (
    <div className="kpi-grid" role="region" aria-label={ariaLabel}>
      {items.map((kpi) => {
        const Icon = kpi.icon;
        const cardClassName =
          kpi.variant === 'default' ? 'kpi-card' : `kpi-card kpi-card--${kpi.variant}`;

        return (
          <div key={kpi.label} className={cardClassName}>
            <div className="kpi-card__header">
              <span className="kpi-card__label">{kpi.label}</span>
              <div className="kpi-card__icon" aria-hidden="true">
                <Icon />
              </div>
            </div>

            <div
              className={`kpi-card__value ${
                kpi.variant === 'gold'
                  ? 'kpi-card__value--gold'
                  : kpi.variant === 'success'
                    ? 'kpi-card__value--success'
                    : ''
              }`}
            >
              {kpi.value}
            </div>

            <div className="kpi-card__footer">
              <span className="kpi-card__percent">{kpi.percent}</span>
              <span
                className={`kpi-card__trend ${
                  kpi.trendUp ? 'kpi-card__trend--up' : 'kpi-card__trend--down'
                }`}
              >
                {kpi.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {kpi.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
