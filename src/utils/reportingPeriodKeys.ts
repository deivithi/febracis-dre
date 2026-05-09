import type { ReportingPeriodRow } from '../features/shared/portal.types';

/** Chave canónica YYYY-MM para competência (URL e estado). */
export function reportingPeriodKey(row: Pick<ReportingPeriodRow, 'year' | 'month'>): string {
  return `${row.year}-${String(row.month).padStart(2, '0')}`;
}

export function parseReportingPeriodKey(key: string | null | undefined): { year: number; month: number } | null {
  if (!key || !/^\d{4}-\d{2}$/.test(key)) {
    return null;
  }
  const [ys, ms] = key.split('-');
  const year = Number(ys);
  const month = Number(ms);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

/** Ordem decrescente (mais recente primeiro), estável por label. */
export function sortReportingPeriodsDesc(periods: ReportingPeriodRow[]): ReportingPeriodRow[] {
  return [...periods].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }
    if (a.month !== b.month) {
      return b.month - a.month;
    }
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}

export function findReportingPeriodByKey(
  periods: ReportingPeriodRow[] | null | undefined,
  key: string | null | undefined,
): ReportingPeriodRow | null {
  const parsed = parseReportingPeriodKey(key);
  if (!parsed || !periods?.length) {
    return null;
  }
  return periods.find((p) => p.year === parsed.year && p.month === parsed.month) ?? null;
}

/** Próximo período na lista ordenada (mais antigo que `currentKey`), ou null. */
export function previousPeriodKeyFromCatalog(
  sortedDesc: ReportingPeriodRow[],
  currentKey: string,
): string | null {
  const idx = sortedDesc.findIndex((p) => reportingPeriodKey(p) === currentKey);
  if (idx === -1 || idx >= sortedDesc.length - 1) {
    return null;
  }
  return reportingPeriodKey(sortedDesc[idx + 1]);
}
