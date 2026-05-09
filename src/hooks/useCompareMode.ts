import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReportingPeriodRow } from '../features/shared/portal.types';
import {
  findReportingPeriodByKey,
  parseReportingPeriodKey,
  previousPeriodKeyFromCatalog,
  reportingPeriodKey,
  sortReportingPeriodsDesc,
} from '../utils/reportingPeriodKeys';

const PARAM_COMPARE = 'compare';
const PARAM_PERIOD_A = 'periodA';
const PARAM_PERIOD_B = 'periodB';

export type UseCompareModeOptions = {
  /** Lista de competências (mesma fonte que o dashboard). */
  reportingPeriods: ReportingPeriodRow[] | null | undefined;
  /** Chave YYYY-MM do período “atual” da UX (ex.: seleção do holding ou competência mais recente com dados). */
  defaultPeriodAKey: string | null | undefined;
};

export type CompareModeState = {
  compareEnabled: boolean;
  periodAKey: string | null;
  periodBKey: string | null;
  setCompareEnabled: (value: boolean) => void;
  setPeriodAKey: (key: string | null) => void;
  setPeriodBKey: (key: string | null) => void;
};

/**
 * Estado de comparação de competências com sincronização na URL.
 * Preserva query params não relacionados. Chaves em ISO YYYY-MM.
 */
export function useCompareMode({ reportingPeriods, defaultPeriodAKey }: UseCompareModeOptions): CompareModeState {
  const [searchParams, setSearchParams] = useSearchParams();

  const sorted = useMemo(
    () => sortReportingPeriodsDesc(reportingPeriods ?? []),
    [reportingPeriods],
  );

  const compareEnabled = searchParams.get(PARAM_COMPARE) === 'true';

  const periodAKey = useMemo(() => {
    const raw = searchParams.get(PARAM_PERIOD_A);
    if (raw && parseReportingPeriodKey(raw)) {
      return raw;
    }
    if (defaultPeriodAKey && parseReportingPeriodKey(defaultPeriodAKey)) {
      return defaultPeriodAKey;
    }
    return sorted[0] ? reportingPeriodKey(sorted[0]) : null;
  }, [searchParams, defaultPeriodAKey, sorted]);

  const periodBKey = useMemo(() => {
    const raw = searchParams.get(PARAM_PERIOD_B);
    if (raw && parseReportingPeriodKey(raw)) {
      return raw;
    }
    if (periodAKey) {
      const fallback = previousPeriodKeyFromCatalog(sorted, periodAKey);
      if (fallback) {
        return fallback;
      }
    }
    return sorted[1] ? reportingPeriodKey(sorted[1]) : null;
  }, [searchParams, sorted, periodAKey]);

  const mergeParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setCompareEnabled = useCallback(
    (value: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) {
            next.set(PARAM_COMPARE, 'true');
            let a = next.get(PARAM_PERIOD_A);
            if (!a || !parseReportingPeriodKey(a)) {
              const fallbackA =
                defaultPeriodAKey && parseReportingPeriodKey(defaultPeriodAKey)
                  ? defaultPeriodAKey
                  : sorted[0]
                    ? reportingPeriodKey(sorted[0])
                    : null;
              if (fallbackA) {
                next.set(PARAM_PERIOD_A, fallbackA);
                a = fallbackA;
              }
            }
            const b = next.get(PARAM_PERIOD_B);
            if (!b || !parseReportingPeriodKey(b)) {
              const prevKey =
                a && sorted.length ? previousPeriodKeyFromCatalog(sorted, a) : null;
              const fallbackB =
                prevKey ?? (sorted[1] ? reportingPeriodKey(sorted[1]) : null);
              if (fallbackB) {
                next.set(PARAM_PERIOD_B, fallbackB);
              }
            }
          } else {
            next.delete(PARAM_COMPARE);
            next.delete(PARAM_PERIOD_A);
            next.delete(PARAM_PERIOD_B);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, sorted, defaultPeriodAKey],
  );

  const setPeriodAKey = useCallback(
    (key: string | null) => {
      mergeParams((next) => {
        if (!key) {
          next.delete(PARAM_PERIOD_A);
          return;
        }
        next.set(PARAM_PERIOD_A, key);
        if (compareEnabled) {
          next.set(PARAM_COMPARE, 'true');
        }
      });
    },
    [mergeParams, compareEnabled],
  );

  const setPeriodBKey = useCallback(
    (key: string | null) => {
      mergeParams((next) => {
        if (!key) {
          next.delete(PARAM_PERIOD_B);
          return;
        }
        next.set(PARAM_PERIOD_B, key);
        if (compareEnabled) {
          next.set(PARAM_COMPARE, 'true');
        }
      });
    },
    [mergeParams, compareEnabled],
  );

  return {
    compareEnabled,
    periodAKey,
    periodBKey,
    setCompareEnabled,
    setPeriodAKey,
    setPeriodBKey,
  };
}

export function periodsSelectOptions(periods: ReportingPeriodRow[] | null | undefined) {
  return sortReportingPeriodsDesc(periods ?? []).map((p) => ({
    key: reportingPeriodKey(p),
    row: p,
    label: `${String(p.month).padStart(2, '0')}/${p.year}`,
  }));
}

export { findReportingPeriodByKey, reportingPeriodKey };
