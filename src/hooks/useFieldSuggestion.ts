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

const FIELD_SUGGEST_TIMEOUT_MS = 15_000;

function mergeAbortWithTimeout(parent: AbortSignal, ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([parent, AbortSignal.timeout(ms)]);
  }
  const c = new AbortController();
  const t = window.setTimeout(() => c.abort(), ms);
  parent.addEventListener(
    'abort',
    () => {
      window.clearTimeout(t);
      c.abort();
    },
    { once: true },
  );
  return c.signal;
}

async function fetchFieldSuggestion(
  params: {
    accessToken: string;
    submissionId: string;
    lineCode: string;
    currentValue: number | null;
  },
  mergedSignal: AbortSignal,
): Promise<FieldSuggestApiResponse> {
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
    signal: mergedSignal,
  });
  const rawText = await res.text();
  let body: FieldSuggestApiResponse & { error?: string; code?: string };
  try {
    body = rawText
      ? (JSON.parse(rawText) as FieldSuggestApiResponse & { error?: string; code?: string })
      : ({} as FieldSuggestApiResponse & { error?: string; code?: string });
  } catch {
    const snippet = rawText.replace(/\s+/g, ' ').trim().slice(0, 180);
    throw new Error(
      snippet.length > 0
        ? `Assistente (${res.status}). Resposta não-JSON. Trecho: ${snippet}`
        : `Assistente (${res.status}). Corpo vazio ou ilegível.`,
    );
  }
  if (!res.ok) {
    const ref = typeof body.code === 'string' && body.code.trim() ? ` (${body.code.trim()})` : '';
    throw new Error(`${body.error ?? 'Falha ao sugerir campo.'}${ref}`);
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
    queryFn: ({ signal }) =>
      fetchFieldSuggestion(
        {
          accessToken: opts.accessToken!,
          submissionId: opts.submissionId!,
          lineCode: opts.lineCode,
          currentValue: opts.currentNumeric,
        },
        mergeAbortWithTimeout(signal, FIELD_SUGGEST_TIMEOUT_MS),
      ),
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
