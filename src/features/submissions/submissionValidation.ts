import type { DreInputCatalogLine } from '../shared/portal.types';

export interface SubmissionDraftValidation {
  ok: boolean;
  missingRequired: Array<{ lineCode: string; lineName: string; sectionName: string }>;
  filledCount: number;
  totalInputs: number;
}

/**
 * Validação em camada cliente antes de enviar: todos os campos editáveis do catálogo devem ter valor numérico.
 * Regras duras adicionais permanecem no servidor.
 */
export function validateDraftInputs(
  inputLines: DreInputCatalogLine[],
  valueMap: Record<string, string>,
  parseCurrency: (raw: string) => number | null,
): SubmissionDraftValidation {
  const missingRequired: SubmissionDraftValidation['missingRequired'] = [];
  let filledCount = 0;

  for (const line of inputLines) {
    const raw = valueMap[line.line_code]?.trim() ?? '';
    if (!raw.length) {
      missingRequired.push({
        lineCode: line.line_code,
        lineName: line.line_name,
        sectionName: line.section_name,
      });
      continue;
    }
    const n = parseCurrency(raw);
    if (n === null) {
      missingRequired.push({
        lineCode: line.line_code,
        lineName: line.line_name,
        sectionName: line.section_name,
      });
      continue;
    }
    filledCount += 1;
  }

  const totalInputs = inputLines.length;
  const ok = totalInputs > 0 && missingRequired.length === 0;
  return {
    ok,
    missingRequired,
    filledCount,
    totalInputs,
  };
}
