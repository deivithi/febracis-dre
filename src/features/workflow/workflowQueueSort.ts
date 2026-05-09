import type { SortingState } from '@tanstack/react-table';
import type { PendingReviewRow } from '../shared/portal.types';
import { WORKFLOW_INITIAL_SORT, WORKFLOW_URL_SORT } from './workflowTableConfig';

/** Espelha o parse de ordenação por URL em `DataTable` para navegação j/k na fila. */
export function parseWorkflowSortFromSearchParams(searchParams: URLSearchParams): SortingState {
  const sortP = searchParams.get('sort');
  const dirP = searchParams.get('dir');
  if (!sortP || (dirP !== 'asc' && dirP !== 'desc')) {
    return WORKFLOW_INITIAL_SORT;
  }
  const colId = Object.entries(WORKFLOW_URL_SORT.columnIdToSortParam).find(([, v]) => v === sortP)?.[0];
  if (!colId) {
    return WORKFLOW_INITIAL_SORT;
  }
  return [{ id: colId, desc: dirP === 'desc' }];
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function compareNumbers(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
): number {
  const na = typeof a === 'number' ? a : Number(a ?? 0);
  const nb = typeof b === 'number' ? b : Number(b ?? 0);
  return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0);
}

function compareIsoDates(a: string | null | undefined, b: string | null | undefined): number {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  const va = Number.isFinite(ta) ? ta : 0;
  const vb = Number.isFinite(tb) ? tb : 0;
  return va - vb;
}

export function comparePendingReviews(
  a: PendingReviewRow,
  b: PendingReviewRow,
  columnId: string,
): number {
  switch (columnId) {
    case 'franchise_name':
      return compareStrings(a.franchise_name, b.franchise_name);
    case 'regional_name':
      return compareStrings(a.regional_name, b.regional_name);
    case 'period_label':
      return compareStrings(a.period_label, b.period_label);
    case 'gross_revenue':
      return compareNumbers(a.gross_revenue, b.gross_revenue);
    case 'ebitda_2':
      return compareNumbers(a.ebitda_2, b.ebitda_2);
    case 'open_issues_count':
      return compareNumbers(a.open_issues_count, b.open_issues_count);
    case 'submission_status':
      return compareStrings(a.submission_status, b.submission_status);
    case 'submitted_at':
      return compareIsoDates(a.submitted_at, b.submitted_at);
    default:
      return 0;
  }
}

/** Ordem visível da fila (filtrada + mesma ordenação da tabela). */
export function sortPendingReviewsForNavigation(
  rows: PendingReviewRow[],
  sorting: SortingState,
): PendingReviewRow[] {
  const effective = sorting.length > 0 ? sorting : WORKFLOW_INITIAL_SORT;
  const { id: columnId, desc } = effective[0];
  const mult = desc ? -1 : 1;
  const next = [...rows];
  next.sort((a, b) => comparePendingReviews(a, b, columnId) * mult);
  return next;
}
