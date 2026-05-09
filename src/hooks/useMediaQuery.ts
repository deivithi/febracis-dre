import { useEffect, useState } from 'react';

const MOBILE_MAX_WIDTH = '(max-width: 767px)';
const NAV_DRAWER_MAX_WIDTH = '(max-width: 1023px)';

/**
 * `true` quando o viewport é estreito (≤767px).
 * SSR / primeiro paint: sempre `false` até montar no cliente e subscrever `matchMedia`.
 */
export function useIsMobileMax767(): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia(MOBILE_MAX_WIDTH);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return matches;
}

/** `true` quando largura ≤1023px — ex.: TOC do Guia em gaveta. */
export function useIsNarrowMax1023(): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia(NAV_DRAWER_MAX_WIDTH);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return matches;
}
