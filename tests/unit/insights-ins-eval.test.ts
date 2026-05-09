import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { linearRegression, stableInsightId } from '../../api/lib/insightsEngine';

const YAML_REL = join(__dirname, '../evals/insights-ins.yaml');

describe('insights-ins.yaml (INS-001..INS-010)', () => {
  it('ficheiro existe e referencia os artefactos principais', () => {
    const raw = readFileSync(YAML_REL, 'utf8');
    expect(raw).toContain('INS-001');
    expect(raw).toContain('INS-010');
    expect(raw).toContain('api/dre-insights.ts');
    expect(raw).toContain('dre_insight_cache');
    expect(raw).toContain('get_kpi_history');
  });

  it('INS-004: regressão linear local sem libs externas pesadas', () => {
    const xs = [0, 1, 2, 3, 4, 5];
    const ys = [10, 11, 12, 13, 14, 15];
    const { slope, intercept } = linearRegression(xs, ys);
    expect(slope).toBeCloseTo(1, 5);
    expect(intercept).toBeCloseTo(10, 5);
  });

  it('ids estáveis derivam de hash curto', () => {
    const a = stableInsightId(['t', '1']);
    const b = stableInsightId(['t', '1']);
    const c = stableInsightId(['t', '2']);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.length).toBeLessThanOrEqual(18);
  });
});
