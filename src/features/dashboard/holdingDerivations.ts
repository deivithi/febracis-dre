import type { DashboardSnapshot, FranchiseDashboardRow, ReportingPeriodRow } from '../shared/portal.types';
import { toNumber } from '../../utils/formatters';
import { resolveDefaultReportingPeriod } from '../../utils/reportingPeriodResolve';
import { filterFranchiseRowsForExecutiveRollup } from './dashboardQuery';

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

export type DeriveHoldingViewOptions = {
  /** Quando definido, filtra a competência por ano/mês civil (ignora `selectedPeriodLabel` para o conjunto base). */
  anchorYear?: number;
  anchorMonth?: number;
};

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
  /** Subconjunto com estados oficiais apenas (allowlist KPI executivo — ver `dashboardQuery`). */
  executiveRollupRows: FranchiseDashboardRow[];
  executiveRollupPreviousRows: FranchiseDashboardRow[];
  filteredPendingReviews: DashboardSnapshot['pendingReviews'];
  summary: ReturnType<typeof buildHoldingTotals>;
};

/**
 * Derivados do cockpit Holding a partir dos filtros (estado elevado ao pai).
 */
export function deriveHoldingView(
  snapshot: DashboardSnapshot,
  filters: HoldingFilterState,
  reportingPeriods?: ReportingPeriodRow[] | null,
  options?: DeriveHoldingViewOptions | null,
): DerivedHoldingView | null {
  const current = snapshot.latestNetwork;

  if (!current) {
    return null;
  }

  const basePeriodOptions = getHoldingPeriodOptions(snapshot.franchiseRows);
  const resolvedDefault = resolveDefaultReportingPeriod(reportingPeriods ?? null);
  const defaultPeriodLabel = resolvedDefault?.label ?? null;
  const periodOptions =
    defaultPeriodLabel && !basePeriodOptions.includes(defaultPeriodLabel)
      ? [defaultPeriodLabel, ...basePeriodOptions]
      : basePeriodOptions;

  const useAnchor =
    options != null &&
    typeof options.anchorYear === 'number' &&
    typeof options.anchorMonth === 'number' &&
    Number.isFinite(options.anchorYear) &&
    Number.isFinite(options.anchorMonth);

  let activePeriodLabel: string;
  let previousPeriodLabel: string | null;
  let currentPeriodRows: FranchiseDashboardRow[];

  if (useAnchor) {
    const y = options!.anchorYear!;
    const m = options!.anchorMonth!;
    currentPeriodRows = snapshot.franchiseRows.filter(
      (row) => row.period_year === y && row.period_month === m,
    );
    activePeriodLabel =
      currentPeriodRows[0]?.period_label ?? `${y}-${String(m).padStart(2, '0')}`;
    previousPeriodLabel = null;
  } else {
    const trimmedPeriod = filters.selectedPeriodLabel.trim();
    activePeriodLabel =
      trimmedPeriod && periodOptions.includes(trimmedPeriod)
        ? trimmedPeriod
        : defaultPeriodLabel && periodOptions.includes(defaultPeriodLabel)
          ? defaultPeriodLabel
          : current.period_label;

    previousPeriodLabel =
      periodOptions[periodOptions.findIndex((label) => label === activePeriodLabel) + 1] ?? null;

    currentPeriodRows = snapshot.franchiseRows.filter((row) => row.period_label === activePeriodLabel);
  }

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

  const executiveRollupRows = filterFranchiseRowsForExecutiveRollup(filteredRows);
  const executiveRollupPreviousRows = filterFranchiseRowsForExecutiveRollup(filteredPreviousRows);

  const filteredPendingReviews = snapshot.pendingReviews.filter((row) => {
    const matchesPeriod = row.period_label === activePeriodLabel;
    const matchesFranchise = effectiveFranchiseId === 'all' || row.franchise_id === effectiveFranchiseId;
    const matchesRegional =
      effectiveRegionalId === 'all' ||
      filteredRows.some((franchiseRow) => franchiseRow.franchise_id === row.franchise_id);

    return matchesPeriod && matchesFranchise && matchesRegional;
  });

  const summary = buildHoldingTotals(executiveRollupRows);

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
    executiveRollupRows,
    executiveRollupPreviousRows,
    filteredPendingReviews,
    summary,
  };
}
