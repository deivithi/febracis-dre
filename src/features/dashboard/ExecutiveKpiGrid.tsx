import { useEffect, useRef, type ReactNode } from 'react';
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

/** Reduz ruído visual: só dois níveis (ouro vs restantes). */
function normalizeKpiVariant(variant: ExecutiveKpiItem['variant']): 'default' | 'gold' {
  return variant === 'gold' ? 'gold' : 'default';
}

type ExecutiveKpiGridProps = {
  items: ExecutiveKpiItem[];
  /** Um estado por tile; mesma ordem de `items`. Omitir = sparklines desligadas. */
  sparklineStates?: DashboardKpiSparklineState[];
  ariaLabel?: string;
  /** Quando definido, combina com o gating de RPC no `DashboardPage` (só carrega histórico visível). */
  onTileVisibilityChange?: (index: number, visible: boolean) => void;
};

function KpiTileGate({
  index,
  onVisible,
  children,
}: {
  index: number;
  onVisible?: (index: number, visible: boolean) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onVisible) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisible(index, Boolean(entry?.isIntersecting));
      },
      { threshold: 0.01, rootMargin: '0px 0px 80px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, onVisible]);

  return (
    <div ref={ref} className="kpi-grid__cell">
      {children}
    </div>
  );
}

/** Faixa KPI do painel executivo — contrato estável para acessibilidade e tema Febracis. */
export function ExecutiveKpiGrid({
  items,
  sparklineStates = [],
  ariaLabel = 'Indicadores do período',
  onTileVisibilityChange,
}: ExecutiveKpiGridProps) {
  const disabledSparkline: DashboardKpiSparklineState = {
    enabled: false,
    isLoading: false,
    isError: false,
    data: undefined,
    valueFormat: 'currency',
  };

  return (
    <div
      className="kpi-grid kpi-grid--snap"
      role="region"
      aria-label={ariaLabel}
      data-tour-id="dashboard-kpi-section"
    >
      {items.map((kpi, index) => {
        const headingId = `dashboard-kpi-heading-${index}`;
        const plan = kpi.sparklinePlan;
        const rawState = sparklineStates[index];
        const sparkline =
          plan == null ? disabledSparkline : (rawState ?? disabledSparkline);

        const card = (
          <KpiCard
            headingId={headingId}
            label={kpi.label}
            value={kpi.value}
            percent={kpi.percent}
            trend={kpi.trend}
            trendUp={kpi.trendUp}
            variant={normalizeKpiVariant(kpi.variant)}
            icon={kpi.icon}
            sparkline={sparkline}
          />
        );

        if (onTileVisibilityChange) {
          return (
            <KpiTileGate key={headingId} index={index} onVisible={onTileVisibilityChange}>
              {card}
            </KpiTileGate>
          );
        }

        return <div key={headingId}>{card}</div>;
      })}
    </div>
  );
}
