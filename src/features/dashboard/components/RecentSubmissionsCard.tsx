import { ClipboardList } from 'lucide-react';
import type { CurrentSubmissionRow } from '../../shared/portal.types';
import { formatPeriodLabel, formatStatusLabel, getStatusVariant } from '../../../utils/formatters';

type Props = { rows: CurrentSubmissionRow[] };

export function RecentSubmissionsCard({ rows }: Props) {
  if (!rows.length) {
    return (
      <div className="card card--v-kpi">
        <div className="card__header">
          <h3 className="card__title">Últimas DREs do período</h3>
        </div>
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__icon">
              <ClipboardList />
            </div>
            <p className="empty-state__description">Nenhuma DRE registada até ao momento.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card card--v-kpi">
      <div className="card__header">
        <h3 className="card__title">Últimas DREs do período</h3>
      </div>
      <div className="card__body">
        <div className="list-stack">
          {rows.slice(0, 4).map((row) => (
            <div key={row.submission_id} className="list-row">
              <div>
                <div className="list-row__title">{formatPeriodLabel(row.period_label)}</div>
                <div className="list-row__meta">
                  Versão {row.version_number} • {row.franchise_name}
                </div>
              </div>
              <div className="list-row__value">
                <span className={`status-badge status-badge--${getStatusVariant(row.status)}`}>
                  <span className="status-badge__dot" />
                  {formatStatusLabel(row.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
