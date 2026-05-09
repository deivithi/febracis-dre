import type { DashboardSnapshot, FranchiseDashboardRow } from '../shared/portal.types';
import { toNumber } from '../../utils/formatters';

export function getCurrentPeriodLabel(snapshot: DashboardSnapshot) {
  return (
    snapshot.latestFranchise?.period_label ??
    snapshot.latestRegional?.period_label ??
    snapshot.latestNetwork?.period_label ??
    null
  );
}

export function getCurrentPeriodFranchiseRows(snapshot: DashboardSnapshot) {
  const periodLabel = getCurrentPeriodLabel(snapshot);

  if (!periodLabel) {
    return [];
  }

  return snapshot.franchiseRows.filter((row) => row.period_label === periodLabel);
}

export function getTopFranchises(rows: FranchiseDashboardRow[]) {
  return [...rows]
    .sort((left, right) => toNumber(right.ebitda_2) - toNumber(left.ebitda_2))
    .slice(0, 5);
}

export function getCriticalFranchises(rows: FranchiseDashboardRow[]) {
  return [...rows]
    .sort((left, right) => toNumber(left.ebitda2_pct) - toNumber(right.ebitda2_pct))
    .slice(0, 5);
}

export function formatSnapshotFreshness(updatedAtMs: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(updatedAtMs));
}
