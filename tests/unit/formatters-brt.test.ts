import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '../../src/utils/formatters';

describe('formatters BRT', () => {
  it('formata datas instantâneas UTC segundo calendário em America/Sao_Paulo', () => {
    const isoEveningUtcStillPrevDayInBrt = '2026-06-15T02:59:00.000Z';
    expect(formatDate(isoEveningUtcStillPrevDayInBrt)).toBe('14/06/2026');
    expect(formatDateTime(isoEveningUtcStillPrevDayInBrt)).toMatch(/^14\/06\/2026/);

    const isoMorningBrt = '2026-06-15T03:30:00.000Z';
    expect(formatDate(isoMorningBrt)).toBe('15/06/2026');
    expect(formatDateTime(isoMorningBrt)).toMatch(/^15\/06\/2026/);
    expect(formatDateTime(isoMorningBrt).includes(':')).toBe(true);
  });

  it('usa data civil BRT já no mesmo dia UTC quando o instante está à tarde BRT', () => {
    expect(formatDate('2026-06-15T18:30:00.000Z')).toBe('15/06/2026');
    expect(formatDateTime('2026-06-15T18:30:00.000Z')).toMatch(/^15\/06\/2026,/);
  });
});
