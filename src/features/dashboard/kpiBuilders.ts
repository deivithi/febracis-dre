import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  Target,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { pickOfficialFranchiseRowsForExecutiveKpis } from './dashboardQuery';
import { buildHoldingTotals } from './holdingDerivations';
import type { DerivedHoldingView } from './holdingDerivations';
import type { DashboardSnapshot, FranchiseDashboardRow } from '../shared/portal.types';
import type { ExecutiveKpiItem, ExecutiveKpiSparklinePlan } from './ExecutiveKpiGrid';
import {
  calculateDelta,
  formatCurrency,
  formatDelta,
  formatInteger,
  formatPercent,
  isPositiveDelta,
} from '../../utils/formatters';

export function buildFranchiseKpis(snapshot: DashboardSnapshot): ExecutiveKpiItem[] {
  const { current, previous } = pickOfficialFranchiseRowsForExecutiveKpis(snapshot.franchiseRows);

  if (!current) {
    return [];
  }

  const fid = current.franchise_id;

  return [
    {
      label: 'Receita bruta',
      value: formatCurrency(current.gross_revenue),
      percent: 'Total faturado pela unidade',
      trend: formatDelta(calculateDelta(current.gross_revenue, previous?.gross_revenue ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.gross_revenue, previous?.gross_revenue ?? null)),
      variant: 'gold',
      icon: DollarSign,
      sparklinePlan: {
        metric: 'gross_revenue',
        valueFormat: 'currency',
        franchiseId: fid,
        regionalId: null,
      },
    },
    {
      label: 'Margem de contribuição 1',
      value: formatCurrency(current.mc1),
      percent: `${formatPercent(current.mc1_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.mc1, previous?.mc1 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.mc1, previous?.mc1 ?? null)),
      variant: 'default',
      icon: BarChart3,
      sparklinePlan: {
        metric: 'mc1',
        valueFormat: 'currency',
        franchiseId: fid,
        regionalId: null,
      },
    },
    {
      label: 'Margem de contribuição 2',
      value: formatCurrency(current.mc2),
      percent: `${formatPercent(current.mc2_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.mc2, previous?.mc2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.mc2, previous?.mc2 ?? null)),
      variant: 'default',
      icon: Target,
      sparklinePlan: {
        metric: 'mc2',
        valueFormat: 'currency',
        franchiseId: fid,
        regionalId: null,
      },
    },
    {
      label: 'EBITDA 2',
      value: formatCurrency(current.ebitda_2),
      percent: `${formatPercent(current.ebitda2_pct)} da receita bruta`,
      trend: formatDelta(calculateDelta(current.ebitda_2, previous?.ebitda_2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.ebitda_2, previous?.ebitda_2 ?? null)),
      variant: 'success',
      icon: TrendingUp,
      sparklinePlan: {
        metric: 'ebitda_2',
        valueFormat: 'currency',
        franchiseId: fid,
        regionalId: null,
      },
    },
  ];
}

export function buildRegionalKpis(snapshot: DashboardSnapshot): ExecutiveKpiItem[] {
  if (!snapshot.latestRegional) {
    return [];
  }

  const current = snapshot.latestRegional;
  const previous = snapshot.previousRegional;
  const rid = current.regional_id;

  return [
    {
      label: 'Receita da regional',
      value: formatCurrency(current.total_gross_revenue),
      percent: `${formatInteger(current.total_franchises)} franquias na carteira`,
      trend: formatDelta(
        calculateDelta(current.total_gross_revenue, previous?.total_gross_revenue ?? null),
      ),
      trendUp: isPositiveDelta(
        calculateDelta(current.total_gross_revenue, previous?.total_gross_revenue ?? null),
      ),
      variant: 'gold',
      icon: DollarSign,
      sparklinePlan: {
        metric: 'gross_revenue',
        valueFormat: 'currency',
        franchiseId: null,
        regionalId: rid,
      },
    },
    {
      label: 'EBITDA 2 da regional',
      value: formatCurrency(current.total_ebitda_2),
      percent: `${formatPercent(current.avg_ebitda2_pct)} de margem média`,
      trend: formatDelta(calculateDelta(current.total_ebitda_2, previous?.total_ebitda_2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.total_ebitda_2, previous?.total_ebitda_2 ?? null)),
      variant: 'success',
      icon: TrendingUp,
      sparklinePlan: {
        metric: 'ebitda_2',
        valueFormat: 'currency',
        franchiseId: null,
        regionalId: rid,
      },
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approved_count),
      percent: `${formatInteger(current.approved_count)} de ${formatInteger(current.total_franchises)} unidades`,
      trend: formatDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      variant: 'default',
      icon: CheckCircle2,
      sparklinePlan: {
        metric: 'approved_submission_count',
        valueFormat: 'integer',
        franchiseId: null,
        regionalId: rid,
      },
    },
    {
      label: 'Em ajuste',
      value: formatInteger(current.pending_count),
      percent: `${formatPercent(current.avg_default_pct)} de inadimplência média`,
      trend: formatDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      trendUp: !isPositiveDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      variant: 'warning',
      icon: AlertTriangle,
      sparklinePlan: {
        metric: 'adjustment_pipeline_count',
        valueFormat: 'integer',
        franchiseId: null,
        regionalId: rid,
      },
    },
  ];
}

export function holdingKpiSparkScope(
  derived: DerivedHoldingView,
): Pick<ExecutiveKpiSparklinePlan, 'franchiseId' | 'regionalId'> {
  if (derived.effectiveFranchiseId !== 'all') {
    return { franchiseId: derived.effectiveFranchiseId, regionalId: null };
  }
  if (derived.effectiveRegionalId !== 'all') {
    return { franchiseId: null, regionalId: derived.effectiveRegionalId };
  }
  return { franchiseId: null, regionalId: null };
}

export function buildHoldingFilteredKpis(
  currentRows: FranchiseDashboardRow[],
  previousRows: FranchiseDashboardRow[],
  sparkScope: Pick<ExecutiveKpiSparklinePlan, 'franchiseId' | 'regionalId'>,
): ExecutiveKpiItem[] {
  const current = buildHoldingTotals(currentRows);
  const previous = buildHoldingTotals(previousRows);

  return [
    {
      label: 'Receita do recorte',
      value: formatCurrency(current.totalGrossRevenue),
      percent: `${formatInteger(current.totalFranchises)} unidades no filtro`,
      trend: formatDelta(calculateDelta(current.totalGrossRevenue, previous.totalGrossRevenue)),
      trendUp: isPositiveDelta(calculateDelta(current.totalGrossRevenue, previous.totalGrossRevenue)),
      variant: 'gold',
      icon: DollarSign,
      sparklinePlan: {
        metric: 'gross_revenue',
        valueFormat: 'currency',
        franchiseId: sparkScope.franchiseId,
        regionalId: sparkScope.regionalId,
      },
    },
    {
      label: 'EBITDA 2 do recorte',
      value: formatCurrency(current.totalEbitda2),
      percent: `${formatPercent(current.avgMarginPct)} margem consolidada`,
      trend: formatDelta(calculateDelta(current.totalEbitda2, previous.totalEbitda2)),
      trendUp: isPositiveDelta(calculateDelta(current.totalEbitda2, previous.totalEbitda2)),
      variant: 'success',
      icon: TrendingUp,
      sparklinePlan: {
        metric: 'ebitda_2',
        valueFormat: 'currency',
        franchiseId: sparkScope.franchiseId,
        regionalId: sparkScope.regionalId,
      },
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approvedCount),
      percent: `${formatInteger(current.approvedCount)}/${formatInteger(current.totalFranchises)} no filtro`,
      trend: formatDelta(calculateDelta(current.approvedCount, previous.approvedCount)),
      trendUp: isPositiveDelta(calculateDelta(current.approvedCount, previous.approvedCount)),
      variant: 'default',
      icon: ShieldCheck,
      sparklinePlan: {
        metric: 'approved_submission_count',
        valueFormat: 'integer',
        franchiseId: sparkScope.franchiseId,
        regionalId: sparkScope.regionalId,
      },
    },
    {
      label: 'Em ajuste / fila',
      value: formatInteger(current.pendingCount),
      percent: `Pior margem: ${formatPercent(current.minMarginPct)}`,
      trend: formatDelta(calculateDelta(current.pendingCount, previous.pendingCount)),
      trendUp: !isPositiveDelta(calculateDelta(current.pendingCount, previous.pendingCount)),
      variant: 'warning',
      icon: ClipboardList,
      sparklinePlan: {
        metric: 'adjustment_pipeline_count',
        valueFormat: 'integer',
        franchiseId: sparkScope.franchiseId,
        regionalId: sparkScope.regionalId,
      },
    },
  ];
}

export function buildNetworkKpis(snapshot: DashboardSnapshot): ExecutiveKpiItem[] {
  if (!snapshot.latestNetwork) {
    return [];
  }

  const current = snapshot.latestNetwork;
  const previous = snapshot.previousNetwork;

  return [
    {
      label: 'Receita consolidada da rede',
      value: formatCurrency(current.total_gross_revenue),
      percent: `${formatInteger(current.total_regionals)} regionais consolidadas`,
      trend: formatDelta(
        calculateDelta(current.total_gross_revenue, previous?.total_gross_revenue ?? null),
      ),
      trendUp: isPositiveDelta(
        calculateDelta(current.total_gross_revenue, previous?.total_gross_revenue ?? null),
      ),
      variant: 'gold',
      icon: DollarSign,
      sparklinePlan: {
        metric: 'gross_revenue',
        valueFormat: 'currency',
        franchiseId: null,
        regionalId: null,
      },
    },
    {
      label: 'EBITDA 2 da rede',
      value: formatCurrency(current.total_ebitda_2),
      percent: `${formatPercent(current.avg_ebitda2_pct)} de margem média`,
      trend: formatDelta(calculateDelta(current.total_ebitda_2, previous?.total_ebitda_2 ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.total_ebitda_2, previous?.total_ebitda_2 ?? null)),
      variant: 'success',
      icon: TrendingUp,
      sparklinePlan: {
        metric: 'ebitda_2',
        valueFormat: 'currency',
        franchiseId: null,
        regionalId: null,
      },
    },
    {
      label: 'DREs aprovadas',
      value: formatInteger(current.approved_count),
      percent: `${formatInteger(current.approved_count)} de ${formatInteger(current.total_franchises)} franquias`,
      trend: formatDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      trendUp: isPositiveDelta(calculateDelta(current.approved_count, previous?.approved_count ?? null)),
      variant: 'default',
      icon: ShieldCheck,
      sparklinePlan: {
        metric: 'approved_submission_count',
        valueFormat: 'integer',
        franchiseId: null,
        regionalId: null,
      },
    },
    {
      label: 'Aguardando ação',
      value: formatInteger(current.pending_count),
      percent: `Pior margem hoje: ${formatPercent(current.min_ebitda2_pct)}`,
      trend: formatDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      trendUp: !isPositiveDelta(calculateDelta(current.pending_count, previous?.pending_count ?? null)),
      variant: 'warning',
      icon: ClipboardList,
      sparklinePlan: {
        metric: 'adjustment_pipeline_count',
        valueFormat: 'integer',
        franchiseId: null,
        regionalId: null,
      },
    },
  ];
}
