import { useEffect, useState } from 'react';
import './ReadingProgress.css';

type ReadingProgressProps = {
  enabled?: boolean;
};

export function ReadingProgress({ enabled = true }: ReadingProgressProps) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onScroll = () => {
      const root = document.scrollingElement ?? document.documentElement;
      const scrollRange = root.scrollHeight - root.clientHeight;
      const next = scrollRange > 0 ? Math.min(100, Math.max(0, (root.scrollTop / scrollRange) * 100)) : 0;
      setPct(next);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="reading-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-hidden="true">
      <div className="reading-progress__bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
