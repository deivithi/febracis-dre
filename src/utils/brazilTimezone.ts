/** Fuso canónico para operação e competência civil no Brasil. */
export const BRAZIL_IANA_TIMEZONE = 'America/Sao_Paulo' as const;

const brYearMonthDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRAZIL_IANA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function pickNumericPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const raw = parts.find((part) => part.type === type)?.value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Retorna ano, mês (1–12) e dia no calendário civil de America/Sao_Paulo para o instante dado.
 * Útil para “que mês é hoje?” sem depender do fuso do browser.
 */
export function getBrazilCalendarDateParts(reference: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const parts = brYearMonthDay.formatToParts(reference);
  const year = pickNumericPart(parts, 'year');
  const month = pickNumericPart(parts, 'month');
  const day = pickNumericPart(parts, 'day');
  return { year, month, day };
}

export function getBrazilCalendarYearMonth(reference: Date = new Date()): {
  year: number;
  month: number;
} {
  const { year, month } = getBrazilCalendarDateParts(reference);
  return { year, month };
}

/** Label `YYYY-MM` alinhada ao período oficial (`reporting_periods.label`). */
export function formatBrazilYearMonthLabel(reference: Date = new Date()): string {
  const { year, month } = getBrazilCalendarYearMonth(reference);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Nomes de mês pt-BR (competência civil Brasil). */
const BRAZIL_MONTH_NAMES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** Competência por extenso, ex.: "março de 2026". */
export function formatBrazilCompetenciaPtBr(year: number, month: number): string {
  const name = BRAZIL_MONTH_NAMES_PT[month - 1] ?? `mês ${month}`;
  return `${name} de ${year}`;
}
