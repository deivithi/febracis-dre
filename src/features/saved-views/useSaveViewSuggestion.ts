import { useEffect, useRef, useState } from 'react';
import type { SavedViewPage } from './savedView.types';

const STORAGE_KEY = 'febracis.saved-views.suggest.v1';
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type PageTimestamps = Record<string, number[]>;

function load(): PageTimestamps {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const p = JSON.parse(raw) as PageTimestamps;
    return typeof p === 'object' && p ? p : {};
  } catch {
    return {};
  }
}

function save(data: PageTimestamps) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Heurística local: conta alterações de “impressão digital” de filtros na página (janela 7 dias).
 * A partir de 3 eventos, sugere guardar vista (sem ML).
 */
export function useSaveViewSuggestion(
  page: SavedViewPage,
  fingerprint: string,
  opts?: { disabled?: boolean; isDefaultFingerprint?: boolean },
) {
  const [showBanner, setShowBanner] = useState(false);
  const prevFp = useRef<string | null>(null);

  useEffect(() => {
    if (opts?.disabled || opts?.isDefaultFingerprint || !fingerprint) {
      setShowBanner(false);
      return;
    }
    if (prevFp.current === fingerprint) {
      return;
    }
    prevFp.current = fingerprint;

    const now = Date.now();
    const store = load();
    const key = page;
    const list = (store[key] ?? []).filter((t) => now - t <= WINDOW_MS);
    list.push(now);
    store[key] = list;
    save(store);

    setShowBanner(list.length >= 3);
  }, [page, fingerprint, opts?.disabled, opts?.isDefaultFingerprint]);

  const dismissBanner = () => setShowBanner(false);

  return { showBanner, dismissBanner };
}
