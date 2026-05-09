import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type PullToRefreshHostProps = {
  children: ReactNode;
};

/** Gestos pull-down perto do topo da página invalidam queries da rota atual (≤767px). */
export function PullToRefreshHost({ children }: PullToRefreshHostProps) {
  const qc = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 767px)')
        : null;
    if (!mq) {
      return;
    }

    let startY: number | null = null;
    let armed = false;

    const scrollTop = () => {
      const root = document.scrollingElement;
      return root ? root.scrollTop : 0;
    };

    const invalidateForPath = () => {
      const p = location.pathname;
      if (p.includes('/dashboard')) {
        void qc.invalidateQueries({ queryKey: ['dashboard'] });
        return;
      }
      if (p.includes('/submissions') || p.includes('/assistant')) {
        void qc.invalidateQueries({ queryKey: ['submissions'] });
        void qc.invalidateQueries({ queryKey: ['submission-workspace'] });
        void qc.invalidateQueries({ queryKey: ['reporting-periods'] });
        return;
      }
      if (p.includes('/workflow')) {
        void qc.invalidateQueries({ queryKey: ['workflow'] });
        return;
      }
      if (p.includes('/audit')) {
        void qc.invalidateQueries({ queryKey: ['audit'] });
        return;
      }
    };

    const onStart = (e: TouchEvent) => {
      if (!mq.matches || scrollTop() > 8) {
        return;
      }
      startY = e.touches[0]?.clientY ?? null;
      armed = false;
    };

    const onMove = (e: TouchEvent) => {
      if (startY == null || !mq.matches || scrollTop() > 8) {
        return;
      }
      const y = e.touches[0]?.clientY ?? startY;
      if (y - startY > 80) {
        armed = true;
      }
    };

    const onEnd = () => {
      if (armed) {
        invalidateForPath();
      }
      armed = false;
      startY = null;
    };

    const onMq = () => {
      if (!mq.matches) {
        startY = null;
        armed = false;
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    mq.addEventListener('change', onMq);

    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      mq.removeEventListener('change', onMq);
    };
  }, [qc, location.pathname]);

  return <>{children}</>;
}
