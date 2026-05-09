import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_IO: IntersectionObserverInit = {
  threshold: 0.01,
  rootMargin: '0px 0px 64px 0px',
};

/**
 * Observa intersecção de um elemento com o viewport.
 * `inView` passa a true na primeira vez que o elemento entra na área observada.
 */
export function useElementInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  const optsRef = useRef(options);

  useEffect(() => {
    optsRef.current = options;
  });

  const setRef = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node || inView) {
      return;
    }
    const merged = { ...DEFAULT_IO, ...optsRef.current };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true);
      }
    }, merged);

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, inView]);

  return { ref: setRef, inView };
}
