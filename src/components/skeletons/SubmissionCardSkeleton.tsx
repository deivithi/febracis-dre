import '../../features/submissions/SubmissionsPage.css';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/Skeleton';
import './skeleton-shared.css';

function CardPanelSkeleton({
  titleWidth,
  subtitleLines = 2,
}: {
  titleWidth: string;
  subtitleLines?: number;
}) {
  return (
    <Card variant="kpi">
      <div className="card__header">
        <div style={{ flex: 1 }}>
          <Skeleton style={{ width: titleWidth, height: '1rem', marginBottom: 'var(--space-2)' }} />
          {Array.from({ length: subtitleLines }).map((_, index) => (
            <Skeleton
              key={index}
              style={{
                width: index === 0 ? '92%' : '76%',
                height: '0.8rem',
                marginTop: index ? 'var(--space-2)' : 0,
              }}
            />
          ))}
        </div>
        <Skeleton style={{ width: 72, height: 28, borderRadius: 999 }} />
      </div>
      <div className="card__body">
        <div className="detail-list">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="detail-list__item">
              <Skeleton style={{ width: '38%', height: '0.75rem' }} />
              <Skeleton style={{ width: '48%', height: '0.75rem' }} />
            </div>
          ))}
        </div>
        <Skeleton
          style={{ width: '100%', height: 112, borderRadius: 'var(--radius-md)', marginTop: 'var(--space-5)' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <Skeleton style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)' }} />
          <Skeleton style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    </Card>
  );
}

/** Mirrors `SubmissionWorkbenchRail` tri-column grid: situação | prévia | verificações. */
export function SubmissionCardSkeleton() {
  return (
    <aside
      className="submission-workbench__rail submission-workbench__rail--grid submission-sidebar submission-workbench__panel submission-workbench__panel--active-sm"
      aria-busy="true"
      aria-label="A carregar painel da submissão"
    >
      <div className="submission-workbench__rail-col">
        <CardPanelSkeleton titleWidth="62%" subtitleLines={2} />
      </div>

      <div className="submission-workbench__rail-col">
        <Card variant="kpi">
          <div className="card__header">
            <div style={{ flex: 1 }}>
              <Skeleton style={{ width: '58%', height: '1rem', marginBottom: 'var(--space-2)' }} />
              <Skeleton style={{ width: '88%', height: '0.8rem' }} />
            </div>
            <Skeleton style={{ width: 96, height: 32, borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="card__body">
            <Skeleton style={{ width: '55%', height: '0.75rem', marginBottom: 'var(--space-4)' }} />
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-3) 0',
                  borderTop: index ? '1px solid var(--border-subtle)' : undefined,
                }}
              >
                <Skeleton style={{ width: '52%', height: '0.85rem' }} />
                <Skeleton style={{ width: '28%', height: '0.9rem' }} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="submission-workbench__rail-col">
        <Card variant="kpi">
          <div className="card__header">
            <div style={{ flex: 1 }}>
              <Skeleton style={{ width: '72%', height: '1rem', marginBottom: 'var(--space-2)' }} />
              <Skeleton style={{ width: '90%', height: '0.8rem' }} />
            </div>
            <Skeleton style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="card__body">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="validation-checklist__item"
                style={{ pointerEvents: 'none', opacity: 0.85 }}
              >
                <span className="validation-checklist__icon">
                  <Skeleton style={{ width: 22, height: 22, borderRadius: 'var(--radius-full)' }} />
                </span>
                <div className="validation-checklist__body" style={{ flex: 1 }}>
                  <Skeleton style={{ width: '70%', height: '0.8rem', marginBottom: 'var(--space-2)' }} />
                  <Skeleton style={{ width: '92%', height: '0.75rem' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </aside>
  );
}
