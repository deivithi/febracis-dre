import type { ReportingPeriodRow } from '../features/shared/portal.types';
import { getBrazilCalendarYearMonth } from './brazilTimezone';

function isOperationalPeriodStatus(status: string): boolean {
  return status === 'open' || status === 'reopened';
}

/** Período de competência cujo ano/mês civil coincide com BRT. */
export function reportingPeriodMatchesBrazilMonth(
  row: ReportingPeriodRow,
  reference: Date = new Date(),
): boolean {
  const { year, month } = getBrazilCalendarYearMonth(reference);
  return row.year === year && row.month === month;
}

export type ResolveDefaultReportingPeriodOptions = {
  /** Override do “instante atual” para testes. */
  referenceDate?: Date;
};

/**
 * Seleção default dos seletores de competência no portal.
 * Preferência por período Civil BRT + operacional (open|reopened);
 * caso contrário primeiro open/reopened da lista já ordenada;
 * por fim primeiro da lista como hoje.
 */
export function resolveDefaultReportingPeriod(
  periods: ReportingPeriodRow[] | null | undefined,
  opts?: ResolveDefaultReportingPeriodOptions,
): ReportingPeriodRow | null {
  if (!periods?.length) {
    return null;
  }

  const reference = opts?.referenceDate ?? new Date();

  const civilMatchOperational = periods.find(
    (p) => isOperationalPeriodStatus(p.status) && reportingPeriodMatchesBrazilMonth(p, reference),
  );
  if (civilMatchOperational) {
    return civilMatchOperational;
  }

  const firstOpen = periods.find((p) => isOperationalPeriodStatus(p.status));
  if (firstOpen) {
    return firstOpen;
  }

  return periods[0];
}
