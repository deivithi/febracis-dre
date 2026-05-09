import type { DashboardSnapshot } from '../shared/portal.types';

const BRT = 'America/Sao_Paulo';

export function getDashboardActivePeriodLabel(snapshot: DashboardSnapshot): string | null {
  return (
    snapshot.latestFranchise?.period_label ??
    snapshot.latestRegional?.period_label ??
    snapshot.latestNetwork?.period_label ??
    null
  );
}

/** YYYY-MM a partir do snapshot ou label tipo MM/YYYY. */
export function periodSlugForFilename(
  snapshot: DashboardSnapshot,
  holdingActivePeriodLabel: string | null,
): string {
  const label = holdingActivePeriodLabel ?? getDashboardActivePeriodLabel(snapshot);
  const nw = snapshot.latestNetwork;

  if (nw && label === nw.period_label) {
    return `${nw.period_year}-${String(nw.period_month).padStart(2, '0')}`;
  }

  if (label && /^\d{4}-\d{2}$/.test(label)) {
    return label;
  }

  const m = label?.match(/(\d{1,2})\/(\d{4})/);
  if (m) {
    return `${m[2]}-${m[1].padStart(2, '0')}`;
  }

  return 'periodo';
}

/** Sufixo YYYYMMDD-HHmm em BRT (para nome de ficheiro). */
export function brtCompactTimestamp(d = new Date()): string {
  const s = d.toLocaleString('sv-SE', {
    timeZone: BRT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [date, time] = s.split(' ');
  const [y, mo, da] = date.split('-');
  const [h, mi] = time.split(':');
  return `${y}${mo}${da}-${h}${mi}`;
}

export function dashboardExportBasename(
  snapshot: DashboardSnapshot,
  holdingActivePeriodLabel: string | null,
): string {
  const period = periodSlugForFilename(snapshot, holdingActivePeriodLabel);
  const ts = brtCompactTimestamp();
  return `febracis-dre_dashboard_${period}_${ts}`;
}

export function approvalsExportBasename(): string {
  return `febracis-dre_approvals_${brtCompactTimestamp()}`;
}

export function formatBrtReportTimestamp(d = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(d);
}
