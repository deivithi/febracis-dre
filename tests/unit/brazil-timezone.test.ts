import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatBrazilYearMonthLabel,
  getBrazilCalendarDateParts,
  getBrazilCalendarYearMonth,
} from '../../src/utils/brazilTimezone';

describe('brazilTimezone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('usa mês civil BRT no limite antes da virada UTC→dia em SP', () => {
    vi.setSystemTime(new Date('2026-09-01T02:59:00.000Z'));
    expect(getBrazilCalendarDateParts()).toMatchObject({
      year: 2026,
      month: 8,
      day: 31,
    });
    expect(formatBrazilYearMonthLabel()).toBe('2026-08');
  });

  it('passa para o dia 01 após virada BRT', () => {
    vi.setSystemTime(new Date('2026-09-01T03:00:00.000Z'));
    expect(getBrazilCalendarYearMonth()).toEqual({ year: 2026, month: 9 });
    expect(formatBrazilYearMonthLabel()).toBe('2026-09');
  });

  it('reflete referência explicita mesmo com timers fake', () => {
    vi.setSystemTime(new Date('2020-01-01T12:00:00.000Z'));
    const ref = new Date('2026-12-05T06:00:00.000Z');
    expect(getBrazilCalendarYearMonth(ref)).toEqual({ year: 2026, month: 12 });
  });
});
