import type { AccessProfile } from '../auth/auth.types';
import type { DashboardSnapshot, FranchiseDashboardRow } from '../shared/portal.types';
import type { DerivedHoldingView, HoldingFilterState } from '../dashboard/holdingDerivations';
import { toNumber } from '../../utils/formatters';
import { getDashboardActivePeriodLabel } from './exportFilenames';

export function buildDashboardRankingRows(
  snapshot: DashboardSnapshot,
  accessProfile: AccessProfile,
  holdingDerived: DerivedHoldingView | null,
): FranchiseDashboardRow[] {
  if (accessProfile.dashboardScope === 'holding') {
    if (!holdingDerived) {
      return [];
    }
    return [...holdingDerived.filteredRows].sort((a, b) => toNumber(b.ebitda_2) - toNumber(a.ebitda_2));
  }

  const periodLabel =
    accessProfile.dashboardScope === 'franchise'
      ? snapshot.latestFranchise?.period_label ?? null
      : getDashboardActivePeriodLabel(snapshot);

  if (!periodLabel) {
    return [];
  }

  let rows = snapshot.franchiseRows.filter((r) => r.period_label === periodLabel);
  if (accessProfile.dashboardScope === 'regional' && accessProfile.regionalIds.length) {
    rows = rows.filter((r) => accessProfile.regionalIds.includes(r.regional_id));
  }

  return [...rows].sort((a, b) => toNumber(b.ebitda_2) - toNumber(a.ebitda_2));
}

export function buildDashboardFiltersSnapshot(
  accessProfile: AccessProfile,
  snapshot: DashboardSnapshot,
  holdingDerived: DerivedHoldingView | null,
  holdingFilters: HoldingFilterState | null,
): Record<string, unknown> {
  const scope = accessProfile.dashboardScope;
  const activePeriod =
    holdingDerived?.activePeriodLabel ?? getDashboardActivePeriodLabel(snapshot) ?? '';

  const base: Record<string, unknown> = {
    dashboardScope: scope,
    activePeriodLabel: activePeriod,
  };

  if (scope === 'holding' && holdingDerived && holdingFilters) {
    const regionalLabel =
      holdingDerived.effectiveRegionalId === 'all'
        ? 'Toda a rede'
        : holdingDerived.regionalOptions.find((r) => r.id === holdingDerived.effectiveRegionalId)?.name ??
          holdingDerived.effectiveRegionalId;

    const franchisePick = holdingDerived.franchiseOptions.find(
      (f) => f.id === holdingDerived.effectiveFranchiseId,
    );
    const franchiseLabel =
      holdingDerived.effectiveFranchiseId === 'all'
        ? 'Todas as unidades'
        : franchisePick
          ? `${franchisePick.code} · ${franchisePick.name}`
          : holdingDerived.effectiveFranchiseId;

    base.holding = {
      selectedPeriodLabel: holdingFilters.selectedPeriodLabel,
      activePeriodLabel: holdingDerived.activePeriodLabel,
      regionalId: holdingDerived.effectiveRegionalId,
      regionalLabel,
      franchiseId: holdingDerived.effectiveFranchiseId,
      franchiseLabel,
    };
  }

  if (scope === 'regional' && accessProfile.regionalIds.length) {
    base.regionalIds = accessProfile.regionalIds;
  }

  if (scope === 'franchise' && accessProfile.franchiseIds.length) {
    base.franchiseIds = accessProfile.franchiseIds;
  }

  return base;
}

export function formatFiltersForPdfHeader(filters: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const scope = filters.dashboardScope;
  if (typeof scope === 'string') {
    lines.push(`Escopo: ${scope}`);
  }
  if (typeof filters.activePeriodLabel === 'string' && filters.activePeriodLabel) {
    lines.push(`Competência: ${filters.activePeriodLabel}`);
  }
  const holding = filters.holding as Record<string, unknown> | undefined;
  if (holding && typeof holding === 'object') {
    if (typeof holding.regionalLabel === 'string') {
      lines.push(`Regional: ${holding.regionalLabel}`);
    }
    if (typeof holding.franchiseLabel === 'string') {
      lines.push(`Unidade: ${holding.franchiseLabel}`);
    }
  }
  return lines;
}
