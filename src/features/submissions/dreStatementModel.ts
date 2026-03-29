import type { DreInputCatalogLine, DreStatementRow } from '../shared/portal.types';

/** Classificação visual alinhada a income statement (input / agregados / indicadores). */
export type StatementLineKind = 'detail' | 'subtotal' | 'calculated' | 'indicator';

export interface StatementSectionGroup {
  sectionCode: string;
  sectionName: string;
  sectionOrder: number;
  lines: DreStatementRow[];
}

export function statementLineKind(lineType: string): StatementLineKind {
  if (lineType === 'subtotal') return 'subtotal';
  if (lineType === 'indicator') return 'indicator';
  if (lineType === 'calculated') return 'calculated';
  return 'detail';
}

export function groupStatementBySection(rows: DreStatementRow[]): StatementSectionGroup[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.section_order !== b.section_order) return a.section_order - b.section_order;
    return a.line_order - b.line_order;
  });

  const map = new Map<string, StatementSectionGroup>();
  for (const row of sorted) {
    const key = row.section_code || row.section_name;
    const existing = map.get(key);
    if (existing) {
      existing.lines.push(row);
    } else {
      map.set(key, {
        sectionCode: row.section_code,
        sectionName: row.section_name,
        sectionOrder: row.section_order,
        lines: [row],
      });
    }
  }

  return [...map.values()].sort((a, b) => a.sectionOrder - b.sectionOrder);
}

/**
 * Constrói linhas no mesmo formato que a view SQL, a partir do catálogo + rascunho local.
 * Usado quando ainda não há `dreStatement` oficial — uma única forma de renderizar a tabela.
 */
export function buildDraftStatementRows(
  inputLines: DreInputCatalogLine[],
  valueMap: Record<string, string>,
  parseCurrency: (raw: string) => number | null,
): DreStatementRow[] {
  const sorted = [...inputLines].sort((a, b) => {
    if (a.section_order !== b.section_order) return a.section_order - b.section_order;
    return a.line_order - b.line_order;
  });

  const parsedGross = parseCurrency(valueMap.gross_revenue?.trim() ?? '');
  const gross = parsedGross ?? 0;

  return sorted.map((line) => {
    const raw = valueMap[line.line_code]?.trim() ?? '';
    const value = parseCurrency(raw);
    const num = value ?? 0;
    const pct = gross > 0 && Number.isFinite(num) ? (num / gross) * 100 : null;

    return {
      submission_id: '',
      franchise_id: '',
      reporting_period_id: '',
      section_code: line.section_code,
      section_name: line.section_name,
      section_order: line.section_order,
      line_code: line.line_code,
      line_name: line.line_name,
      line_type: 'input',
      line_order: line.line_order,
      value_currency: num,
      percent_of_gross_revenue: pct,
    };
  });
}

export function resolveStatementRows(
  official: DreStatementRow[] | undefined,
  draftFallback: DreStatementRow[],
): { rows: DreStatementRow[]; source: 'official' | 'draft' } {
  if (official && official.length > 0) {
    return { rows: official, source: 'official' };
  }
  if (draftFallback.length > 0) {
    return { rows: draftFallback, source: 'draft' };
  }
  return { rows: [], source: 'official' };
}
