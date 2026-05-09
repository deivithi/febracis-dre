import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DISMISS_TTL_MS = 3600_000;
const PREFIX = 'febracis.inlineDismiss.';

export function inlineDismissStorageKey(submissionId: string, lineCode: string) {
  return `${PREFIX}${submissionId}.${lineCode}`;
}

export function isInlineSuggestionDismissed(submissionId: string, lineCode: string): boolean {
  try {
    const raw = localStorage.getItem(inlineDismissStorageKey(submissionId, lineCode));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function dismissInlineSuggestion(submissionId: string, lineCode: string) {
  try {
    localStorage.setItem(inlineDismissStorageKey(submissionId, lineCode), String(Date.now()));
  } catch {
    /* quota / modo privado */
  }
}

export type FieldSuggestApiResponse = {
  ok?: boolean;
  mode?: string;
  suggestedValue: number | null;
  reasoning: string;
  editable: boolean;
};

async function fetchFieldSuggestion(params: {
  accessToken: string;
  submissionId: string;
  lineCode: string;
  currentValue: number | null;
}): Promise<FieldSuggestApiResponse> {
  const res = await fetch('/api/dre-agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      mode: 'suggest_field',
      submissionId: params.submissionId,
      lineCode: params.lineCode,
      currentValue: params.currentValue,
      assistantProductTab: 'preencher',
      context: {},
    }),
  });
  const body = (await res.json()) as FieldSuggestApiResponse & { error?: string; code?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Assistente (${res.status})`);
  }
  return body;
}

export function useFieldSuggestion(opts: {
  submissionId: string | null;
  lineCode: string;
  accessToken: string | null;
  currentNumeric: number | null;
}) {
  const [focusArmed, setFocusArmed] = useState(false);
  const [debouncedActive, setDebouncedActive] = useState(false);

  useEffect(() => {
    if (!focusArmed) {
      setDebouncedActive(false);
      return;
    }
    const t = window.setTimeout(() => setDebouncedActive(true), 800);
    return () => window.clearTimeout(t);
  }, [focusArmed]);

  const dismissed = useMemo(
    () =>
      Boolean(opts.submissionId && opts.lineCode && isInlineSuggestionDismissed(opts.submissionId, opts.lineCode)),
    [opts.submissionId, opts.lineCode],
  );

  const query = useQuery({
    queryKey: ['field-suggestion', opts.submissionId, opts.lineCode],
    queryFn: () =>
      fetchFieldSuggestion({
        accessToken: opts.accessToken!,
        submissionId: opts.submissionId!,
        lineCode: opts.lineCode,
        currentValue: opts.currentNumeric,
      }),
    enabled: Boolean(
      opts.submissionId &&
        opts.lineCode &&
        opts.accessToken &&
        focusArmed &&
        debouncedActive &&
        !dismissed,
    ),
    staleTime: 5 * 60 * 1000,
  });

  const prefetchOnFocus = useCallback(() => {
    setFocusArmed(true);
  }, []);

  const cancelPrefetch = useCallback(() => {
    setFocusArmed(false);
    setDebouncedActive(false);
  }, []);

  return { ...query, prefetchOnFocus, cancelPrefetch, dismissed };
}
