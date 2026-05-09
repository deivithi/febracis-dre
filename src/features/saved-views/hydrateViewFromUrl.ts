import { useEffect, useRef } from 'react';
import type { SavedViewFiltersV1 } from './savedViewFilters';
import { parseSavedFilters } from './savedViewFilters';
import type { SavedViewRow } from './savedView.types';
import { applyFiltersToSearchParams, readFiltersFromSearchParams } from './savedViewUrl';

/** Quando `?view=` aponta para uma linha válida, funde filtros na URL (fallback integrado). */
export function useHydrateViewFromUrl(
  page: 'submissions' | 'approvals' | 'audit',
  viewIdParam: string | null,
  savedRow: SavedViewRow | null | undefined,
  setSearchParams: (fn: (prev: URLSearchParams) => URLSearchParams, opts?: { replace?: boolean }) => void,
) {
  const ref = useRef<string | null>(null);

  useEffect(() => {
    if (!viewIdParam) {
      ref.current = null;
    }
  }, [viewIdParam]);

  useEffect(() => {
    if (!savedRow || savedRow.page !== page) {
      return;
    }
    if (ref.current === savedRow.id) {
      return;
    }
    ref.current = savedRow.id;
    const f = parseSavedFilters(page, savedRow.filters) as SavedViewFiltersV1;
    setSearchParams((prev) => applyFiltersToSearchParams(page, prev, f, { viewId: savedRow.id }), {
      replace: true,
    });
  }, [page, savedRow, setSearchParams]);
}

export function applyWorkspaceToUrl(
  page: 'submissions',
  prev: URLSearchParams,
  typed: SavedViewFiltersV1,
): URLSearchParams {
  return applyFiltersToSearchParams(page, prev, typed, { viewId: null });
}

export function readSubmissionsFiltersFromUrl(searchParams: URLSearchParams): SavedViewFiltersV1 {
  return readFiltersFromSearchParams('submissions', searchParams);
}
