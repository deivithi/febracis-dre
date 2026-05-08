import type { DashboardSnapshot, FranchiseDashboardRow } from '../shared/portal.types';
import { toNumber } from '../../utils/formatters';

export type HoldingFilterState = {
  selectedPeriodLabel: string;
  selectedRegionalId: string;
  selectedFranchiseId: string;
};

export function getHoldingPeriodOptions(franchiseRows: FranchiseDashboardRow[]) {
  const seen = new Set<string>();
  const values: string[] = [];

  franchiseRows.forEach((row) => {
    if (!seen.has(row.period_label)) {
      seen.add(row.period_label);
      values.push(row.period_label);
    }
  });

  return values;
}

/** Agrega linhas filtradas (mesma lógica do cockpit legado para KPIs e lateral). */
export function buildHoldingTotals(rows: FranchiseDashboardRow[]) {
  const totalGrossRevenue = rows.reduce((total, row) => total + toNumber(row.gross_revenue), 0);
  const totalEbitda2 = rows.reduce((total, row) => total + toNumber(row.ebitda_2), 0);
  const approvedCount = rows.filter((row) => row.submission_status === 'approved').length;
  const pendingCount = rows.filter((row) =>
    ['submitted', 'under_review', 'pending_adjustment'].includes(row.submission_status),
  ).length;
  const regionals = new Set(rows.map((row) => row.regional_id)).size;
  const margins = rows.map((row) => toNumber(row.ebitda2_pct));

  return {
    totalGrossRevenue,
    totalEbitda2,
    totalFranchises: rows.length,
    totalRegionals: regionals,
    approvedCount,
    pendingCount,
    avgMarginPct: totalGrossRevenue > 0 ? (totalEbitda2 / totalGrossRevenue) * 100 : 0,
    minMarginPct: margins.length ? Math.min(...margins) : 0,
    maxMarginPct: margins.length ? Math.max(...margins) : 0,
  };
}

export type DerivedHoldingView = {
  periodOptions: string[];
  activePeriodLabel: string;
  previousPeriodLabel: string | null;
  regionalOptions: { id: string; name: string }[];
  franchiseOptions: { id: string; name: string; code: string }[];
  effectiveRegionalId: string;
  effectiveFranchiseId: string;
  filteredRows: FranchiseDashboardRow[];
  filteredPreviousRows: FranchiseDashboardRow[];
  filteredPendingReviews: DashboardSnapshot['pendingReviews'];
  summary: ReturnType<typeof buildHoldingTotals>;
};

/**
 * Derivados do cockpit Holding a partir dos filtros (estado elevado ao pai).
 */
export function deriveHoldingView(
  snapshot: DashboardSnapshot,
  filters: HoldingFilterState,
): DerivedHoldingView | null {
  const current = snapshot.latestNetwork;

  if (!current) {
    return null;
  }

  const periodOptions = getHoldingPeriodOptions(snapshot.franchiseRows);

  const activePeriodLabel = periodOptions.includes(filters.selectedPeriodLabel)
    ? filters.selectedPeriodLabel
    : current.period_label;

  const previousPeriodLabel =
    periodOptions[periodOptions.findIndex((label) => label === activePeriodLabel) + 1] ?? null;

  const currentPeriodRows = snapshot.franchiseRows.filter((row) => row.period_label === activePeriodLabel);
  const regionalOptions = [...new Map(
    currentPeriodRows.map((row) => [row.regional_id, { id: row.regional_id, name: row.regional_name }]),
  ).values()].sort((left, right) => left.name.localeCompare(right.name));

  const effectiveRegionalId = regionalOptions.some((regional) => regional.id === filters.selectedRegionalId)
    ? filters.selectedRegionalId
    : 'all';

  const franchiseOptions = [...new Map(
    currentPeriodRows
      .filter((row) => effectiveRegionalId === 'all' || row.regional_id === effectiveRegionalId)
      .map((row) => [
        row.franchise_id,
        { id: row.franchise_id, name: row.franchise_name, code: row.franchise_code },
      ]),
  ).values()].sort((left, right) => left.name.localeCompare(right.name));

  const effectiveFranchiseId = franchiseOptions.some((franchise) => franchise.id === filters.selectedFranchiseId)
    ? filters.selectedFranchiseId
    : 'all';

  const filteredRows = currentPeriodRows.filter((row) => {
    const matchesRegional = effectiveRegionalId === 'all' || row.regional_id === effectiveRegionalId;
    const matchesFranchise = effectiveFranchiseId === 'all' || row.franchise_id === effectiveFranchiseId;
    return matchesRegional && matchesFranchise;
  });

  const filteredPreviousRows = previousPeriodLabel
    ? snapshot.franchiseRows.filter((row) => {
        if (row.period_label !== previousPeriodLabel) {
          return false;
        }

        const matchesRegional = effectiveRegionalId === 'all' || row.regional_id === effectiveRegionalId;
        const matchesFranchise = effectiveFranchiseId === 'all' || row.franchise_id === effectiveFranchiseId;
        return matchesRegional && matchesFranchise;
      })
    : [];

  const filteredPendingReviews = snapshot.pendingReviews.filter((row) => {
    const matchesPeriod = row.period_label === activePeriodLabel;
    const matchesFranchise = effectiveFranchiseId === 'all' || row.franchise_id === effectiveFranchiseId;
    const matchesRegional =
      effectiveRegionalId === 'all' ||
      filteredRows.some((franchiseRow) => franchiseRow.franchise_id === row.franchise_id);

    return matchesPeriod && matchesFranchise && matchesRegional;
  });

  const summary = buildHoldingTotals(filteredRows);

  return {
    periodOptions,
    activePeriodLabel,
    previousPeriodLabel,
    regionalOptions,
    franchiseOptions,
    effectiveRegionalId,
    effectiveFranchiseId,
    filteredRows,
    filteredPreviousRows,
    filteredPendingReviews,
    summary,
  };
}
