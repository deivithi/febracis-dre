import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReportingPeriodRow } from '../../src/features/shared/portal.types';
import {
  reportingPeriodMatchesBrazilMonth,
  resolveDefaultReportingPeriod,
} from '../../src/utils/reportingPeriodResolve';

function period(
  overrides: Partial<ReportingPeriodRow> & Pick<ReportingPeriodRow, 'id' | 'year' | 'month' | 'status'>,
): ReportingPeriodRow {
  return {
    label: `${overrides.year}-${String(overrides.month).padStart(2, '0')}`,
    submission_deadline_at: null,
    adjustment_deadline_at: null,
    ...overrides,
  };
}

describe('reportingPeriodResolve', () => {
  it('prioriza período open que coincide com BRT em relação a outro open mais recente', () => {
    const ref = new Date('2026-03-10T14:00:00.000Z');
    expect(
      reportingPeriodMatchesBrazilMonth(
        period({ id: 'a', year: 2026, month: 3, status: 'open' }),
        ref,
      ),
    ).toBe(true);

    const list = [
      period({ id: 'apr', year: 2026, month: 4, status: 'open' }),
      period({ id: 'mar', year: 2026, month: 3, status: 'open' }),
      period({ id: 'feb', year: 2026, month: 2, status: 'open' }),
    ];
    const resolved = resolveDefaultReportingPeriod(list, { referenceDate: ref });
    expect(resolved?.id).toBe('mar');
  });

  it('ignora match civil quando status não é operacional (ex.: só closed)', () => {
    const ref = new Date('2026-03-10T12:00:00.000Z');
    const list = [
      period({ id: 'm-closed', year: 2026, month: 3, status: 'closed' }),
      period({ id: 'feb', year: 2026, month: 2, status: 'open' }),
    ];
    expect(resolveDefaultReportingPeriod(list, { referenceDate: ref })?.id).toBe('feb');
  });

  it('fallback para primeiro período da lista quando nenhum open/reopened existe', () => {
    const list = [
      period({ id: 'a', year: 2026, month: 3, status: 'closed' }),
      period({ id: 'b', year: 2026, month: 2, status: 'closed' }),
    ];
    expect(resolveDefaultReportingPeriod(list, { referenceDate: new Date('2026-06-01T12:00:00Z') })?.id).toBe(
      'a',
    );
  });
});

describe('reportingPeriodResolve + fakeTimers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('combo com BRT em Agosto no limite antes de Setembro BRT', () => {
    vi.setSystemTime(new Date('2026-09-01T02:59:00.000Z'));
    const list = [
      period({ id: 'aug', year: 2026, month: 8, status: 'open' }),
      period({ id: 'sep', year: 2026, month: 9, status: 'open' }),
    ];
    const resolved = resolveDefaultReportingPeriod(list);
    expect(resolved?.id).toBe('aug');
  });
});
