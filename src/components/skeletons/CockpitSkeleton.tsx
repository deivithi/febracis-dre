import '../../features/dashboard/DashboardPage.css';
import { Skeleton } from '../ui/Skeleton';
import { TableRowSkeleton } from './TableRowSkeleton';
import './skeleton-shared.css';

/** Mirrors `HoldingCockpitView`: filters card + main radar table + sidebar stack. */
export function CockpitSkeleton() {
  return (
    <div className="dashboard__content page-stack" aria-busy="true" aria-label="A carregar cockpit executivo">
      <div className="card card--accent dashboard-filters">
        <div className="card__header">
          <div style={{ flex: 1 }}>
            <Skeleton style={{ width: '48%', maxWidth: 320, height: '1.1rem', marginBottom: 'var(--space-2)' }} />
            <Skeleton style={{ width: '85%', maxWidth: 520, height: '0.85rem' }} />
          </div>
          <Skeleton style={{ width: 96, height: 28, borderRadius: 999 }} data-testid="skeleton-cockpit-filters-badge" />
        </div>
        <div className="card__body dashboard-filters__body">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="form-group">
              <Skeleton style={{ width: '40%', height: '0.75rem', marginBottom: 'var(--space-2)' }} />
              <Skeleton style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="content-grid content-grid--sidebar">
        <div className="card card--accent">
          <div className="card__header">
            <div style={{ flex: 1 }}>
              <Skeleton style={{ width: '55%', maxWidth: 340, height: '1.05rem', marginBottom: 'var(--space-2)' }} />
              <Skeleton style={{ width: '78%', maxWidth: 480, height: '0.8rem' }} />
            </div>
            <Skeleton style={{ width: 110, height: 28, borderRadius: 999 }} />
          </div>
          <div className="card__body card__body--table-scroll">
            <div className="table-shell table-shell--scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {['Franquia', 'Regional', 'RBV', 'MC2', 'EBITDA 2', 'Margem', 'Status'].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton columns={7} lineCount={6} />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dashboard__side">
          {['Status do recorte', 'Top 5 EBITDA 2', 'Fila de revisão'].map((title) => (
            <div key={title} className="card">
              <div className="card__header">
                <Skeleton style={{ width: '70%', height: '1rem' }} />
              </div>
              <div className="card__body">
                <div className="detail-list">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="detail-list__item">
                      <Skeleton style={{ width: '42%', height: '0.8rem' }} />
                      <Skeleton style={{ width: '28%', height: '0.8rem' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
