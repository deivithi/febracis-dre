import { useEffect, useRef, useState } from 'react';

type LazyWidgetProps = {
  children: React.ReactNode;
  className?: string;
  rootMargin?: string;
};

/** Só monta filhos quando o cartão entra na janela (ou quase). */
export function LazyWidget({
  children,
  className,
  rootMargin = '120px',
}: LazyWidgetProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : <div className="lazy-widget-placeholder" aria-hidden />}
    </div>
  );
}
