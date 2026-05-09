import { useEffect, useState } from 'react';

const DEFAULT_THRESHOLDS = [0, 0.15, 0.35, 0.5, 0.75, 1] as const;

export type UseActiveSectionOptions = {
  /** Elemento cujo subtree é observado para nós adicionados tardiamente (ex.: lazy sections). */
  observeSubtreeRoot?: HTMLElement | null;
  threshold?: number;
  rootMargin?: string;
};

/**
 * IntersectionObserver nas seções com `id` em `sectionIds`.
 * Retorna o id cuja razão de interseção é a maior entre as que atingem `threshold`.
 */
export function useActiveSection(
  sectionIds: readonly string[],
  {
    observeSubtreeRoot = null,
    threshold = 0.35,
    rootMargin = '-12% 0px -18% 0px',
  }: UseActiveSectionOptions = {},
): string | null {
  const [activeId, setActiveId] = useState<string | null>(() => sectionIds[0] ?? null);

  useEffect(() => {
    if (typeof window === 'undefined' || sectionIds.length === 0) {
      return;
    }

    const ratios = new Map<string, number>();
    let raf = 0;

    const pickActive = () => {
      let bestId: string | null = null;
      let bestRatio = -1;

      for (const id of sectionIds) {
        const r = ratios.get(id) ?? 0;
        if (r >= threshold && r > bestRatio) {
          bestRatio = r;
          bestId = id;
        }
      }

      if (bestId == null) {
        for (const id of sectionIds) {
          const r = ratios.get(id) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            bestId = id;
          }
        }
      }

      if (bestId != null && bestRatio > 0) {
        setActiveId((prev) => (prev === bestId ? prev : bestId));
      } else if (sectionIds[0]) {
        setActiveId((prev) => (prev === sectionIds[0] ? prev : sectionIds[0]));
      }
    };

    const flush = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(pickActive);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (id) {
            ratios.set(id, entry.intersectionRatio);
          }
        }
        flush();
      },
      { threshold: [...DEFAULT_THRESHOLDS], root: null, rootMargin },
    );

    const attach = () => {
      observer.disconnect();
      ratios.clear();
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          observer.observe(el);
        }
      }
    };

    attach();
    flush();

    let mutationObserver: MutationObserver | null = null;
    if (observeSubtreeRoot) {
      mutationObserver = new MutationObserver(() => {
        attach();
      });
      mutationObserver.observe(observeSubtreeRoot, { childList: true, subtree: true });
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      mutationObserver?.disconnect();
    };
  }, [sectionIds, observeSubtreeRoot, threshold, rootMargin]);

  return activeId;
}
