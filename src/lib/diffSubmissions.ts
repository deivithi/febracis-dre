import { diffWords, type Change } from 'diff';
import type { DreInputCatalogLine, SubmissionKpiRow } from '../features/shared/portal.types';
import { formatCurrency } from '../utils/formatters';

export type LineDiffKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface SubmissionLineDiff {
  line_code: string;
  line_name: string;
  section_code: string;
  section_name: string;
  section_order: number;
  line_order: number;
  kind: LineDiffKind;
  before_currency: number | null;
  after_currency: number | null;
  delta_currency: number | null;
  before_label: string;
  after_label: string;
  /** Trechos de diff para notas da linha (opcional). */
  noteParts?: Array<{ value: string; kind: 'equal' | 'insert' | 'delete' }>
}

export interface SubmissionSectionDiffGroup {
  section_code: string;
  section_name: string;
  section_order: number;
  lines: SubmissionLineDiff[];
  /** Soma dos deltas numéricos das linhas de entrada na seção. */
  section_delta_sum: number;
}

export interface KpiFieldDelta {
  key: keyof Pick<
    SubmissionKpiRow,
    'gross_revenue' | 'mc1' | 'mc2' | 'ebitda_1' | 'ebitda_2'
  >;
  label: string;
  before: number | null;
  after: number | null;
  delta: number | null;
}

export interface SubmissionSnapshotDiff {
  sections: SubmissionSectionDiffGroup[];
  kpiDeltas: KpiFieldDelta[];
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function classifyCurrencyDelta(
  before: number | null,
  after: number | null,
): { kind: LineDiffKind; delta: number | null } {
  const b = before;
  const a = after;
  if (b === null && a === null) return { kind: 'unchanged', delta: null };
  if (b === null && a !== null) return { kind: 'added', delta: a };
  if (b !== null && a === null) return { kind: 'removed', delta: -b };
  if (b !== null && a !== null) {
    if (b === a) return { kind: 'unchanged', delta: 0 };
    return { kind: 'changed', delta: a - b };
  }
  return { kind: 'unchanged', delta: null };
}

function diffNotes(before: string | null, after: string | null): SubmissionLineDiff['noteParts'] | undefined {
  const b = before?.trim() ?? '';
  const a = after?.trim() ?? '';
  if (!b && !a) return undefined;
  if (b === a) return [{ value: a || b, kind: 'equal' }];
  const parts = diffWords(b, a).map((part: Change) => ({
    value: part.value,
    kind: part.added ? ('insert' as const) : part.removed ? ('delete' as const) : ('equal' as const),
  }));
  return parts.length ? parts : undefined;
}

const KPI_LABELS: KpiFieldDelta['key'][] = ['gross_revenue', 'mc1', 'mc2', 'ebitda_1', 'ebitda_2'];
const KPI_TITLES: Record<KpiFieldDelta['key'], string> = {
  gross_revenue: 'Receita bruta',
  mc1: 'MC1',
  mc2: 'MC2',
  ebitda_1: 'EBITDA 1',
  ebitda_2: 'EBITDA 2',
};

/**
 * Diff entre dois conjuntos de linhas de entrada da DRE (tipicamente duas linhas `submissions` distintas).
 */
export function diffSubmissionInputLines(
  beforeLines: DreInputCatalogLine[],
  afterLines: DreInputCatalogLine[],
): SubmissionSectionDiffGroup[] {
  const byCode = new Map<string, DreInputCatalogLine>();
  for (const line of beforeLines) {
    byCode.set(line.line_code, line);
  }
  const afterByCode = new Map<string, DreInputCatalogLine>();
  for (const line of afterLines) {
    afterByCode.set(line.line_code, line);
  }

  const codes = new Set<string>([...byCode.keys(), ...afterByCode.keys()]);
  const flat: SubmissionLineDiff[] = [];

  for (const code of codes) {
    const left = byCode.get(code);
    const right = afterByCode.get(code);
    if (!left && !right) continue;

    const section_code = left?.section_code ?? right?.section_code ?? '';
    const section_name = left?.section_name ?? right?.section_name ?? 'Seção';
    const section_order = left?.section_order ?? right?.section_order ?? 999;
    const line_order = left?.line_order ?? right?.line_order ?? 999;
    const line_name = left?.line_name ?? right?.line_name ?? code;

    const before_currency = toFiniteNumber(left?.value_currency ?? null);
    const after_currency = toFiniteNumber(right?.value_currency ?? null);
    const { kind, delta } = classifyCurrencyDelta(before_currency, after_currency);

    flat.push({
      line_code: code,
      line_name,
      section_code,
      section_name,
      section_order,
      line_order,
      kind,
      before_currency,
      after_currency,
      delta_currency: delta,
      before_label:
        before_currency === null ? '—' : typeof before_currency === 'number' ? formatCurrency(before_currency) : '—',
      after_label:
        after_currency === null ? '—' : typeof after_currency === 'number' ? formatCurrency(after_currency) : '—',
      noteParts: diffNotes(left?.notes ?? null, right?.notes ?? null),
    });
  }

  flat.sort((x, y) => {
    if (x.section_order !== y.section_order) return x.section_order - y.section_order;
    if (x.line_order !== y.line_order) return x.line_order - y.line_order;
    return x.line_code.localeCompare(y.line_code);
  });

  const sectionMap = new Map<string, SubmissionSectionDiffGroup>();
  for (const line of flat) {
    const key = line.section_code || line.section_name;
    const existing = sectionMap.get(key);
    const delta = line.delta_currency ?? 0;
    if (!existing) {
      sectionMap.set(key, {
        section_code: line.section_code,
        section_name: line.section_name,
        section_order: line.section_order,
        lines: [line],
        section_delta_sum: Number.isFinite(delta) ? delta : 0,
      });
    } else {
      existing.lines.push(line);
      existing.section_delta_sum += Number.isFinite(delta) ? delta : 0;
    }
  }

  return [...sectionMap.values()].sort((a, b) => a.section_order - b.section_order);
}

export function diffSubmissionKpis(
  before: SubmissionKpiRow | null,
  after: SubmissionKpiRow | null,
): KpiFieldDelta[] {
  if (!before && !after) return [];
  return KPI_LABELS.map((key) => {
    const b = before ? toFiniteNumber(before[key]) : null;
    const a = after ? toFiniteNumber(after[key]) : null;
    let delta: number | null = null;
    if (b !== null && a !== null) delta = a - b;
    else if (b === null && a !== null) delta = a;
    else if (b !== null && a === null) delta = -b;
    return {
      key,
      label: KPI_TITLES[key],
      before: b,
      after: a,
      delta,
    };
  });
}

export function buildSubmissionSnapshotDiff(
  beforeLines: DreInputCatalogLine[],
  afterLines: DreInputCatalogLine[],
  beforeKpis?: SubmissionKpiRow | null,
  afterKpis?: SubmissionKpiRow | null,
): SubmissionSnapshotDiff {
  return {
    sections: diffSubmissionInputLines(beforeLines, afterLines),
    kpiDeltas: diffSubmissionKpis(beforeKpis ?? null, afterKpis ?? null),
  };
}
