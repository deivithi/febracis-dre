import { Maximize2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Card, type CardProps } from '../../../components/ui/card';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  headerExtra?: ReactNode;
  compactContent: ReactNode;
  expandedContent: ReactNode;
  cardProps?: Omit<CardProps, 'children'>;
};

export function ExpandableAnalyticsCard({
  title,
  subtitle,
  headerExtra,
  compactContent,
  expandedContent,
  cardProps,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [overlayReady, setOverlayReady] = useState(false);

  useEffect(() => {
    if (!isExpanded) {
      setOverlayReady(false);
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Recharts ResponsiveContainer needs a settled DOM to measure;
    // defer content render until the overlay animation settles.
    const timer = setTimeout(() => setOverlayReady(true), 80);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [isExpanded]);

  return (
    <>
      <Card {...cardProps} className={`expandable-card ${cardProps?.className || ''}`}>
        <div className="card__header card__header--dense expandable-card__header">
          <div className="expandable-card__title-group">
            <h3 className="card__title">{title}</h3>
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          <div className="expandable-card__header-actions">
            {headerExtra}
            <button
              type="button"
              className="btn btn--icon btn--ghost btn--small"
              onClick={() => setIsExpanded(true)}
              aria-label="Expandir para tela cheia"
              title="Expandir para tela cheia"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
        {compactContent}
      </Card>

      {isExpanded && (
        <div className="expandable-overlay" role="dialog" aria-modal="true" aria-labelledby="expandable-title">
          <div className="expandable-overlay__backdrop" onClick={() => setIsExpanded(false)} />
          <div className="expandable-overlay__content">
            <div className="expandable-overlay__header">
              <div>
                <h2 id="expandable-title" className="expandable-overlay__title">
                  {title}
                </h2>
                {subtitle && <p className="expandable-overlay__subtitle">{subtitle}</p>}
              </div>
              <div className="expandable-overlay__actions">
                {headerExtra}
                <button
                  type="button"
                  className="btn btn--icon btn--ghost"
                  onClick={() => setIsExpanded(false)}
                  aria-label="Fechar"
                  title="Fechar"
                  autoFocus
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="expandable-overlay__body">
              {overlayReady ? expandedContent : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                  <p className="text-secondary">A carregar…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
