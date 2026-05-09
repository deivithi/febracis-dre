import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import {
  formatCurrency,
  formatInteger,
  formatPercent,
} from '../../utils/formatters';
import { filterFranchiseRowsForExecutiveRollup } from './dashboardQuery';
import { buildHoldingTotals } from './holdingDerivations';
import type { ExecutiveKpiCompareItem } from './ExecutiveKpiCompareGrid';
import type {
  DashboardSnapshot,
  FranchiseDashboardRow,
  NetworkDashboardRow,
  RegionalDashboardRow,
} from '../shared/portal.types';

type CompareMeta = {
  label: string;
  icon: LucideIcon;
  variant: ExecutiveKpiCompareItem['variant'];
  higherIsBetter: boolean;
  deltaMode: 'currency' | 'integer';
};

function pushCurrencyPair(
  out: ExecutiveKpiCompareItem[],
  meta: CompareMeta,
  rawA: unknown,
  rawB: unknown,
  pctA: string,
  pctB: string,
) {
  out.push({
    label: meta.label,
    icon: meta.icon,
    variant: meta.variant,
    valueA: formatCurrency(rawA),
    valueB: formatCurrency(rawB),
    percentA: pctA,
    percentB: pctB,
    rawA,
    rawB,
    deltaMode: 'currency',
    higherIsBetter: meta.higherIsBetter,
  });
}

function pushIntPair(
  out: ExecutiveKpiCompareItem[],
  meta: CompareMeta,
  rawA: unknown,
  rawB: unknown,
  pctA: string,
  pctB: string,
) {
  out.push({
    label: meta.label,
    icon: meta.icon,
    variant: meta.variant,
    valueA: formatInteger(rawA),
    valueB: formatInteger(rawB),
    percentA: pctA,
    percentB: pctB,
    rawA,
    rawB,
    deltaMode: 'integer',
    higherIsBetter: meta.higherIsBetter,
  });
}

export function pickExecutiveFranchiseRowForYm(
  rows: FranchiseDashboardRow[],
  franchiseId: string,
  year: number,
  month: number,
): FranchiseDashboardRow | null {
  const bucket = filterFranchiseRowsForExecutiveRollup(
    rows.filter(
      (r) => r.franchise_id === franchiseId && r.period_year === year && r.period_month === month,
    ),
  );
  return bucket[0] ?? null;
}

export function pickRegionalRowForYm(
  rows: RegionalDashboardRow[],
  regionalId: string,
  year: number,
  month: number,
): RegionalDashboardRow | null {
  return (
    rows.find(
      (r) => r.regional_id === regionalId && r.period_year === year && r.period_month === month,
    ) ?? null
  );
}

export function pickNetworkRowForYm(
  rows: NetworkDashboardRow[],
  year: number,
  month: number,
): NetworkDashboardRow | null {
  return rows.find((r) => r.period_year === year && r.period_month === month) ?? null;
}

export function buildFranchiseCompareKpiItems(
  snapshot: DashboardSnapshot,
  franchiseId: string,
  yA: number,
  mA: number,
  yB: number,
  mB: number,
): ExecutiveKpiCompareItem[] {
  const a = pickExecutiveFranchiseRowForYm(snapshot.franchiseRows, franchiseId, yA, mA);
  const b = pickExecutiveFranchiseRowForYm(snapshot.franchiseRows, franchiseId, yB, mB);
  const out: ExecutiveKpiCompareItem[] = [];

  pushCurrencyPair(
    out,
    { label: 'Receita bruta', icon: DollarSign, variant: 'gold', higherIsBetter: true, deltaMode: 'currency' },
    a?.gross_revenue ?? 0,
    b?.gross_revenue ?? 0,
    a ? 'Total faturado pela unidade' : '—',
    b ? 'Total faturado pela unidade' : '—',
  );

  pushCurrencyPair(
    out,
    { label: 'Margem de contribuição 1', icon: BarChart3, variant: 'default', higherIsBetter: true, deltaMode: 'currency' },
    a?.mc1 ?? 0,
    b?.mc1 ?? 0,
    a ? `${formatPercent(a.mc1_pct)} da receita bruta` : '—',
    b ? `${formatPercent(b.mc1_pct)} da receita bruta` : '—',
  );

  pushCurrencyPair(
    out,
    { label: 'Margem de contribuição 2', icon: Target, variant: 'default', higherIsBetter: true, deltaMode: 'currency' },
    a?.mc2 ?? 0,
    b?.mc2 ?? 0,
    a ? `${formatPercent(a.mc2_pct)} da receita bruta` : '—',
    b ? `${formatPercent(b.mc2_pct)} da receita bruta` : '—',
  );

  pushCurrencyPair(
    out,
    { label: 'EBITDA 2', icon: TrendingUp, variant: 'success', higherIsBetter: true, deltaMode: 'currency' },
    a?.ebitda_2 ?? 0,
    b?.ebitda_2 ?? 0,
    a ? `${formatPercent(a.ebitda2_pct)} da receita bruta` : '—',
    b ? `${formatPercent(b.ebitda2_pct)} da receita bruta` : '—',
  );

  return out;
}

export function buildRegionalCompareKpiItems(
  snapshot: DashboardSnapshot,
  regionalId: string,
  yA: number,
  mA: number,
  yB: number,
  mB: number,
): ExecutiveKpiCompareItem[] {
  const a = pickRegionalRowForYm(snapshot.regionalRows, regionalId, yA, mA);
  const b = pickRegionalRowForYm(snapshot.regionalRows, regionalId, yB, mB);
  const out: ExecutiveKpiCompareItem[] = [];

  pushCurrencyPair(
    out,
    { label: 'Receita da regional', icon: DollarSign, variant: 'gold', higherIsBetter: true, deltaMode: 'currency' },
    a?.total_gross_revenue ?? 0,
    b?.total_gross_revenue ?? 0,
    a ? `${formatInteger(a.total_franchises)} franquias na carteira` : '—',
    b ? `${formatInteger(b.total_franchises)} franquias na carteira` : '—',
  );

  pushCurrencyPair(
    out,
    { label: 'EBITDA 2 da regional', icon: TrendingUp, variant: 'success', higherIsBetter: true, deltaMode: 'currency' },
    a?.total_ebitda_2 ?? 0,
    b?.total_ebitda_2 ?? 0,
    a ? `${formatPercent(a.avg_ebitda2_pct)} de margem média` : '—',
    b ? `${formatPercent(b.avg_ebitda2_pct)} de margem média` : '—',
  );

  pushIntPair(
    out,
    { label: 'DREs aprovadas', icon: CheckCircle2, variant: 'default', higherIsBetter: true, deltaMode: 'integer' },
    a?.approved_count ?? 0,
    b?.approved_count ?? 0,
    a ? `${formatInteger(a.approved_count)} de ${formatInteger(a.total_franchises)} unidades` : '—',
    b ? `${formatInteger(b.approved_count)} de ${formatInteger(b.total_franchises)} unidades` : '—',
  );

  pushIntPair(
    out,
    { label: 'Em ajuste', icon: ClipboardList, variant: 'warning', higherIsBetter: false, deltaMode: 'integer' },
    a?.pending_count ?? 0,
    b?.pending_count ?? 0,
    a ? `${formatPercent(a.avg_default_pct)} de inadimplência média` : '—',
    b ? `${formatPercent(b.avg_default_pct)} de inadimplência média` : '—',
  );

  return out;
}

export function buildNetworkCompareKpiItems(
  snapshot: DashboardSnapshot,
  yA: number,
  mA: number,
  yB: number,
  mB: number,
): ExecutiveKpiCompareItem[] {
  const a = pickNetworkRowForYm(snapshot.networkRows, yA, mA);
  const b = pickNetworkRowForYm(snapshot.networkRows, yB, mB);
  const out: ExecutiveKpiCompareItem[] = [];

  pushCurrencyPair(
    out,
    { label: 'Receita consolidada da rede', icon: DollarSign, variant: 'gold', higherIsBetter: true, deltaMode: 'currency' },
    a?.total_gross_revenue ?? 0,
    b?.total_gross_revenue ?? 0,
    a ? `${formatInteger(a.total_regionals)} regionais consolidadas` : '—',
    b ? `${formatInteger(b.total_regionals)} regionais consolidadas` : '—',
  );

  pushCurrencyPair(
    out,
    { label: 'EBITDA 2 da rede', icon: TrendingUp, variant: 'success', higherIsBetter: true, deltaMode: 'currency' },
    a?.total_ebitda_2 ?? 0,
    b?.total_ebitda_2 ?? 0,
    a ? `${formatPercent(a.avg_ebitda2_pct)} de margem média` : '—',
    b ? `${formatPercent(b.avg_ebitda2_pct)} de margem média` : '—',
  );

  pushIntPair(
    out,
    { label: 'DREs aprovadas', icon: ShieldCheck, variant: 'default', higherIsBetter: true, deltaMode: 'integer' },
    a?.approved_count ?? 0,
    b?.approved_count ?? 0,
    a ? `${formatInteger(a.approved_count)} de ${formatInteger(a.total_franchises)} franquias` : '—',
    b ? `${formatInteger(b.approved_count)} de ${formatInteger(b.total_franchises)} franquias` : '—',
  );

  pushIntPair(
    out,
    { label: 'Aguardando ação', icon: ClipboardList, variant: 'warning', higherIsBetter: false, deltaMode: 'integer' },
    a?.pending_count ?? 0,
    b?.pending_count ?? 0,
    a ? `Pior margem hoje: ${formatPercent(a.min_ebitda2_pct)}` : '—',
    b ? `Pior margem hoje: ${formatPercent(b.min_ebitda2_pct)}` : '—',
  );

  return out;
}

export function buildHoldingCompareKpiItems(
  rowsA: FranchiseDashboardRow[],
  rowsB: FranchiseDashboardRow[],
): ExecutiveKpiCompareItem[] {
  const a = buildHoldingTotals(rowsA);
  const b = buildHoldingTotals(rowsB);
  const out: ExecutiveKpiCompareItem[] = [];

  pushCurrencyPair(
    out,
    { label: 'Receita do recorte', icon: DollarSign, variant: 'gold', higherIsBetter: true, deltaMode: 'currency' },
    a.totalGrossRevenue,
    b.totalGrossRevenue,
    `${formatInteger(a.totalFranchises)} unidades no filtro`,
    `${formatInteger(b.totalFranchises)} unidades no filtro`,
  );

  pushCurrencyPair(
    out,
    { label: 'EBITDA 2 do recorte', icon: TrendingUp, variant: 'success', higherIsBetter: true, deltaMode: 'currency' },
    a.totalEbitda2,
    b.totalEbitda2,
    `${formatPercent(a.avgMarginPct)} margem consolidada`,
    `${formatPercent(b.avgMarginPct)} margem consolidada`,
  );

  pushIntPair(
    out,
    { label: 'DREs aprovadas', icon: ShieldCheck, variant: 'default', higherIsBetter: true, deltaMode: 'integer' },
    a.approvedCount,
    b.approvedCount,
    `${formatInteger(a.approvedCount)}/${formatInteger(a.totalFranchises)} no filtro`,
    `${formatInteger(b.approvedCount)}/${formatInteger(b.totalFranchises)} no filtro`,
  );

  pushIntPair(
    out,
    { label: 'Em ajuste / fila', icon: ClipboardList, variant: 'warning', higherIsBetter: false, deltaMode: 'integer' },
    a.pendingCount,
    b.pendingCount,
    `Pior margem: ${formatPercent(a.minMarginPct)}`,
    `Pior margem: ${formatPercent(b.minMarginPct)}`,
  );

  return out;
}
