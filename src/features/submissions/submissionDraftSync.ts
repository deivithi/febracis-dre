import type { DreInputCatalogLine } from '../shared/portal.types';

/** Compara valores monetários dos inputs em centavos para evitar deriva de float entre rascunho e último snapshot do servidor. */
export function areDraftInputsInSync(
  inputLines: DreInputCatalogLine[],
  draft: Record<string, string>,
  baseline: Record<string, string>,
  parseCurrency: (raw: string) => number | null,
): boolean {
  for (const line of inputLines) {
    const a = parseCurrency(draft[line.line_code]?.trim() ?? '') ?? 0;
    const b = parseCurrency(baseline[line.line_code]?.trim() ?? '') ?? 0;
    if (Math.round(a * 100) !== Math.round(b * 100)) {
      return false;
    }
  }
  return true;
}
