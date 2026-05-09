import type { AuditDatePreset, SavedViewFiltersV1 } from './savedViewFilters';
import { emptyFiltersForPage, parseSavedFilters, SAVED_FILTERS_VERSION } from './savedViewFilters';
import type { SavedViewPage } from './savedView.types';
import { FILTER_PARAM_KEYS } from './savedViewRoutes';

export function readFiltersFromSearchParams(
  page: 'dashboard',
  searchParams: URLSearchParams,
): Extract<SavedViewFiltersV1, { page: 'dashboard' }>;
export function readFiltersFromSearchParams(
  page: 'submissions',
  searchParams: URLSearchParams,
): Extract<SavedViewFiltersV1, { page: 'submissions' }>;
export function readFiltersFromSearchParams(
  page: 'approvals',
  searchParams: URLSearchParams,
): Extract<SavedViewFiltersV1, { page: 'approvals' }>;
export function readFiltersFromSearchParams(
  page: 'audit',
  searchParams: URLSearchParams,
): Extract<SavedViewFiltersV1, { page: 'audit' }>;
export function readFiltersFromSearchParams(
  page: SavedViewPage,
  searchParams: URLSearchParams,
): SavedViewFiltersV1;
export function readFiltersFromSearchParams(
  page: SavedViewPage,
  searchParams: URLSearchParams,
): SavedViewFiltersV1 {
  switch (page) {
    case 'dashboard': {
      const periodLabel = searchParams.get('periodLabel') ?? '';
      const regional = searchParams.get('regional') ?? 'all';
      const franchise = searchParams.get('franchise') ?? 'all';
      const base = emptyFiltersForPage('dashboard') as Extract<SavedViewFiltersV1, { page: 'dashboard' }>;
      if (periodLabel || regional !== 'all' || franchise !== 'all') {
        base.holding = {
          selectedPeriodLabel: periodLabel,
          selectedRegionalId: regional,
          selectedFranchiseId: franchise,
        };
      }
      return base;
    }
    case 'submissions': {
      const base = emptyFiltersForPage('submissions') as Extract<SavedViewFiltersV1, { page: 'submissions' }>;
      const franchise = searchParams.get('franchise');
      const period = searchParams.get('period');
      const event = searchParams.get('event');
      const submission = searchParams.get('submission');
      if (franchise) {
        base.franchiseId = franchise;
      }
      if (period) {
        base.periodId = period;
      }
      if (event) {
        base.eventId = event;
      }
      if (submission) {
        base.focusSubmissionId = submission;
      }
      return base;
    }
    case 'approvals': {
      const base = emptyFiltersForPage('approvals') as Extract<SavedViewFiltersV1, { page: 'approvals' }>;
      const submission = searchParams.get('submission');
      if (submission) {
        base.submissionId = submission;
      }
      return base;
    }
    case 'audit': {
      const base = emptyFiltersForPage('audit') as Extract<SavedViewFiltersV1, { page: 'audit' }>;
      const lim = searchParams.get('limit');
      if (lim) {
        const n = Number.parseInt(lim, 10);
        if (Number.isFinite(n)) {
          base.limit = Math.min(1000, Math.max(1, n));
        }
      }
      const presetRaw = searchParams.get('auditPreset');
      if (
        presetRaw === 'all' ||
        presetRaw === '24h' ||
        presetRaw === '7d' ||
        presetRaw === 'month' ||
        presetRaw === 'custom'
      ) {
        base.datePreset = presetRaw as AuditDatePreset;
      }
      const ast = searchParams.get('auditStart');
      const aen = searchParams.get('auditEnd');
      if (ast) {
        base.customStart = ast;
      }
      if (aen) {
        base.customEnd = aen;
      }
      if (!base.datePreset && (base.customStart || base.customEnd)) {
        base.datePreset = 'custom';
      }
      const at = searchParams.get('auditTables');
      if (at) {
        const names = at
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
        if (names.length > 0) {
          base.tableNames = names;
        }
      }
      const sort = searchParams.get('sort');
      const dir = searchParams.get('dir');
      if (sort) {
        base.sortColumn = sort;
      }
      if (dir === 'asc' || dir === 'desc') {
        base.sortDir = dir;
      }
      return base;
    }
    default: {
      const _p: never = page;
      return _p;
    }
  }
}

/** Aplica filtros ao URLSearchParams; preserva chaves não relacionadas. */
export function applyFiltersToSearchParams(
  page: SavedViewPage,
  prev: URLSearchParams,
  filters: SavedViewFiltersV1,
  options?: { viewId?: string | null },
): URLSearchParams {
  const next = new URLSearchParams(prev);
  const keys = FILTER_PARAM_KEYS[page];
  for (const k of keys) {
    if (k === 'view') {
      continue;
    }
    next.delete(k);
  }

  switch (filters.page) {
    case 'dashboard': {
      if (filters.holding) {
        const { selectedPeriodLabel, selectedRegionalId, selectedFranchiseId } = filters.holding;
        if (selectedPeriodLabel) {
          next.set('periodLabel', selectedPeriodLabel);
        }
        if (selectedRegionalId && selectedRegionalId !== 'all') {
          next.set('regional', selectedRegionalId);
        }
        if (selectedFranchiseId && selectedFranchiseId !== 'all') {
          next.set('franchise', selectedFranchiseId);
        }
      }
      break;
    }
    case 'submissions': {
      if (filters.franchiseId) {
        next.set('franchise', filters.franchiseId);
      }
      if (filters.periodId) {
        next.set('period', filters.periodId);
      }
      if (filters.eventId) {
        next.set('event', filters.eventId);
      }
      if (filters.focusSubmissionId) {
        next.set('submission', filters.focusSubmissionId);
      }
      break;
    }
    case 'approvals': {
      if (filters.submissionId) {
        next.set('submission', filters.submissionId);
      }
      break;
    }
    case 'audit': {
      if (filters.limit != null) {
        next.set('limit', String(filters.limit));
      }
      if (filters.datePreset && filters.datePreset !== 'all') {
        next.set('auditPreset', filters.datePreset);
      }
      if (filters.datePreset === 'custom') {
        if (filters.customStart) {
          next.set('auditStart', filters.customStart);
        }
        if (filters.customEnd) {
          next.set('auditEnd', filters.customEnd);
        }
      }
      if (filters.tableNames && filters.tableNames.length > 0) {
        next.set('auditTables', filters.tableNames.map((t) => t.trim()).filter(Boolean).sort().join('|'));
      }
      if (filters.sortColumn) {
        next.set('sort', filters.sortColumn);
      }
      if (filters.sortDir) {
        next.set('dir', filters.sortDir);
      }
      break;
    }
    default: {
      const _e: never = filters;
      return _e;
    }
  }

  if (options?.viewId) {
    next.set('view', options.viewId);
  } else {
    next.delete('view');
  }

  return next;
}

export function clearFilterParams(page: SavedViewPage, prev: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(prev);
  for (const k of FILTER_PARAM_KEYS[page]) {
    next.delete(k);
  }
  return next;
}

export function buildShareSearchParams(page: SavedViewPage, filters: SavedViewFiltersV1): URLSearchParams {
  return applyFiltersToSearchParams(page, new URLSearchParams(), filters);
}

/** Constrói objeto de filtros a partir da linha gravada + validação `page`. */
export function rowFiltersToTyped(page: SavedViewPage, filtersJson: unknown): SavedViewFiltersV1 {
  const parsed = parseSavedFilters(page, filtersJson);
  if (parsed.v !== SAVED_FILTERS_VERSION) {
    return emptyFiltersForPage(page);
  }
  return parsed;
}
