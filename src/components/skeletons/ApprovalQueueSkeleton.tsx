import '../../features/workflow/WorkflowPage.css';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/Skeleton';
import { KpiCardSkeleton } from './KpiCardSkeleton';
import { TableRowSkeleton } from './TableRowSkeleton';
import './skeleton-shared.css';

const WORKFLOW_COL_WIDTHS = ['52%', '44%', '36%', '48%', '48%', '32%', '56%'] as const;

/** Inbox density: KPI strip + 8-row queue + decision sidebar (matches `WorkflowPage`). */
export function ApprovalQueueSkeleton() {
  return (
    <div className="page-stack" aria-busy="true">
      <div className="page-container__title-bar">
        <div>
          <Skeleton style={{ width: 220, height: '1.75rem', marginBottom: 'var(--space-3)' }} />
          <Skeleton style={{ width: 'min(520px, 92vw)', height: '0.95rem' }} />
        </div>
      </div>

      <div className="kpi-grid" data-testid="approval-queue-skeleton-kpis">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      <div className="workflow-layout workflow-approval-queue">
        <Card variant="inline">
          <div className="card__header">
            <div>
              <Skeleton style={{ width: 200, height: '1.05rem', marginBottom: 'var(--space-2)' }} />
              <Skeleton style={{ width: 'min(420px, 88vw)', height: '0.8rem' }} />
            </div>
          </div>
          <div className="card__body card__body--compact">
            <div className="table-shell">
              <table className="data-table data-table--inbox">
                <thead>
                  <tr>
                    {['Franquia', 'Regional', 'Competência', 'Receita', 'EBITDA 2', 'Pontos abertos', 'Enviada em'].map(
                      (label) => (
                        <th key={label}>{label}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton columns={7} lineCount={8} barWidths={WORKFLOW_COL_WIDTHS} />
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <aside className="workflow-sidebar">
          <Card variant="inline">
            <div className="card__header">
              <Skeleton style={{ width: 160, height: '1rem' }} />
            </div>
            <div className="card__body">
              <div className="detail-list">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="detail-list__item">
                    <Skeleton style={{ width: '36%', height: '0.75rem' }} />
                    <Skeleton style={{ width: '52%', height: '0.75rem' }} />
                  </div>
                ))}
              </div>
              <Skeleton
                className="workflow-sidebar__notes"
                style={{ width: '100%', height: 140, borderRadius: 'var(--radius-md)', marginTop: 'var(--space-5)' }}
              />
              <div className="workflow-sidebar__actions">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)' }} />
                ))}
              </div>
            </div>
          </Card>

          <Card variant="default">
            <div className="card__header">
              <div>
                <Skeleton style={{ width: '70%', height: '1rem', marginBottom: 'var(--space-2)' }} />
                <Skeleton style={{ width: '90%', height: '0.8rem' }} />
              </div>
            </div>
            <div className="card__body">
              <div className="workflow-validation-skeleton">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="workflow-validation-skeleton__row">
                    <Skeleton className="workflow-validation-skeleton__icon" />
                    <div className="workflow-validation-skeleton__text">
                      <Skeleton style={{ width: '75%', height: '0.8rem' }} />
                      <Skeleton style={{ width: '92%', height: '0.75rem' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
