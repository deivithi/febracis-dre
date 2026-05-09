import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import type { DashboardWidgetRuntimeProps } from '../dashboard-widget.types';
import { formatCurrency, formatInteger, formatPeriodLabel } from '../../../../utils/formatters';

export default function PendingQueueWidget({
  config,
  onPropsPatch,
  snapshot,
  holdingDerived,
  editMode,
}: DashboardWidgetRuntimeProps) {
  const limitRaw = config.props.limit;
  const limit =
    typeof limitRaw === 'number' ? Math.min(Math.max(limitRaw, 3), 30) : 10;

  const rows = holdingDerived?.filteredPendingReviews ?? snapshot.pendingReviews;
  const slice = rows.slice(0, limit);

  return (
    <div className="card dashboard-widget-shell">
      <div className="card__header card__header--widget">
        <div>
          <h3 className="card__title">Fila de revisão</h3>
          <p className="card__subtitle">DREs aguardando tratamento ou aprovação</p>
        </div>
        <div className="dashboard-widget-inline-controls">
          <span className="badge badge--warning">{formatInteger(rows.length)}</span>
          {editMode ? (
            <input
              type="number"
              min={3}
              max={30}
              className="form-input form-input--dense"
              aria-label="Limite de linhas"
              value={limit}
              onChange={(e) =>
                onPropsPatch(config.id, {
                  ...config.props,
                  limit: Number.parseInt(e.target.value, 10) || limit,
                })
              }
            />
          ) : null}
        </div>
      </div>
      <div className="card__body">
        {slice.length === 0 ? (
          <div className="inline-message inline-message--success">
            Nenhuma DRE aguardando aprovação neste recorte.
          </div>
        ) : (
          <div className="table-shell table-shell--scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Franquia</th>
                  <th>Período</th>
                  <th className="align-right">EBITDA 2</th>
                  <th className="align-right">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => (
                  <tr key={row.submission_id}>
                    <td>
                      <div className="list-row__title">{row.franchise_name}</div>
                      <div className="list-row__meta">{row.regional_name}</div>
                    </td>
                    <td>{formatPeriodLabel(row.period_label)}</td>
                    <td className="align-right font-mono">{formatCurrency(row.ebitda_2)}</td>
                    <td className="align-right">{formatInteger(row.open_issues_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Link to="/app/workflow" className="btn btn--secondary btn--small no-drag">
            <ClipboardList size={16} />
            Abrir fila completa
          </Link>
        </div>
      </div>
    </div>
  );
}
