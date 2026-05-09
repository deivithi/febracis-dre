import type { DrePreviewValues } from './drePreview';

/** Linhas canónicas para contrato pós-gravação: motor (`fn_calculate_submission_dre`) vs UI. */
export const PREVIEW_TOLERANCE_KEYS = ['mc1', 'mc2', 'ebitda1', 'ebitda2'] as const;

export type PreviewToleranceKey = (typeof PREVIEW_TOLERANCE_KEYS)[number];

const KEY_TO_PREVIEW: Record<PreviewToleranceKey, keyof DrePreviewValues> = {
  mc1: 'mc1',
  mc2: 'mc2',
  ebitda1: 'ebitda1',
  ebitda2: 'ebitda2',
};

/**
 * Compara totais da prévia (ex.: local vs gravado/servidor).
 *
 * - Tolerância **relativa** `pct` quando o valor de referência (`saved`) tem |saved| >= `zeroEpsilon`.
 * - Para valores “zero” (|saved| < zeroEpsilon): usa tolerância **absoluta** `absTolWhenZero` (moeda, ex. 0,01).
 */
export function comparePreviewTolerance(
  actual: DrePreviewValues,
  saved: DrePreviewValues,
  pct = 0.02,
  absTolWhenZero = 0.01,
  zeroEpsilon = 1e-6,
): {
  ok: boolean;
  violations: Array<{ key: PreviewToleranceKey; actual: number; saved: number; relDelta: number | null }>;
} {
  const violations: Array<{ key: PreviewToleranceKey; actual: number; saved: number; relDelta: number | null }> =
    [];

  for (const key of PREVIEW_TOLERANCE_KEYS) {
    const prop = KEY_TO_PREVIEW[key];
    const a = actual[prop];
    const b = saved[prop];
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      violations.push({ key, actual: a, saved: b, relDelta: null });
      continue;
    }
    const diff = Math.abs(a - b);
    if (Math.abs(b) < zeroEpsilon) {
      if (diff > absTolWhenZero) {
        violations.push({ key, actual: a, saved: b, relDelta: null });
      }
      continue;
    }
    const relDelta = diff / Math.abs(b);
    if (relDelta > pct) {
      violations.push({ key, actual: a, saved: b, relDelta });
    }
  }

  return { ok: violations.length === 0, violations };
}
