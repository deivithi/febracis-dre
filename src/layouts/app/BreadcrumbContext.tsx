import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BreadcrumbSegment } from '../../components/layout/Breadcrumb';

const DEFAULT_FALLBACK: BreadcrumbSegment[] = [{ label: 'Portal', href: '/app/dashboard' }];

type BreadcrumbContextValue = {
  segments: BreadcrumbSegment[];
  setSegments: (next: BreadcrumbSegment[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [segments, setSegmentsState] = useState<BreadcrumbSegment[]>([]);

  const setSegments = useCallback((next: BreadcrumbSegment[]) => {
    setSegmentsState(next);
  }, []);

  const value = useMemo(
    () => ({
      segments,
      setSegments,
    }),
    [segments, setSegments],
  );

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error('useBreadcrumbContext must be used within BreadcrumbProvider');
  }
  return ctx;
}

/** Segmentos efetivos para o header (fallback quando nenhuma página definiu breadcrumb). */
export function useHeaderBreadcrumbSegments(): BreadcrumbSegment[] {
  const { segments } = useBreadcrumbContext();
  return segments.length > 0 ? segments : DEFAULT_FALLBACK;
}

/**
 * Define o breadcrumb da rota atual; limpa no unmount.
 */
export function useBreadcrumb(segments: BreadcrumbSegment[]) {
  const { setSegments } = useBreadcrumbContext();
  const sig = useMemo(() => JSON.stringify(segments), [segments]);

  useEffect(() => {
    const parsed = JSON.parse(sig) as BreadcrumbSegment[];
    setSegments(parsed);
    return () => setSegments([]);
  }, [sig, setSegments]);
}
