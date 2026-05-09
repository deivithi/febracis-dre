import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import type { DashboardWidgetRuntimeProps } from '../dashboard-widget.types';
import { formatCurrency, formatInteger, formatPeriodLabel } from '../../../../utils/formatters';
import { ExpandableAnalyticsCard } from '../../components/ExpandableAnalyticsCard';

export default function PendingQueueWidget({
  config,
  onPropsPatch,
  snapshot,
  holdingDerived,
  editMode,
}: DashboardWidgetRuntimeProps) {
  const limitRaw = config.props.limit;
  const limit =
    typeof limitRaw === 'number' ? Math.min(Math.max(limitRaw, 3), 30) : 5;

  const rows = holdingDerived?.filteredPendingReviews ?? snapshot.pendingReviews;

  const renderTable = (sliceLimit: number) => {
    const slice = rows.slice(0, sliceLimit);
    if (slice.length === 0) {
      return (
        <div className="inline-message inline-message--success">
          Nenhuma DRE aguardando aprovação neste recorte.
        </div>
      );
    }
    return (
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
    );
  };

  const headerExtra = (
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
  );

  return (
    <ExpandableAnalyticsCard
      title="Fila de revisão"
      subtitle="DREs aguardando tratamento ou aprovação"
      headerExtra={headerExtra}
      cardProps={{ className: 'dashboard-widget-shell' }}
      compactContent={
        <div className="card__body">
          {renderTable(limit)}
        </div>
      }
      expandedContent={
        <div>
          {renderTable(15)}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/app/workflow" className="btn btn--secondary no-drag">
              <ClipboardList size={18} style={{ marginRight: '8px' }} />
              Abrir fila completa no workflow
            </Link>
          </div>
        </div>
      }
    />
  );
}
