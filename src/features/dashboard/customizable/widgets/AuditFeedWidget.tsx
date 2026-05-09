import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { fetchAuditEntries } from '../../../shared/portal.api';
import type { DashboardWidgetRuntimeProps } from '../dashboard-widget.types';
import { formatDateTime } from '../../../../utils/formatters';

export default function AuditFeedWidget({
  config,
  onPropsPatch,
  editMode,
}: DashboardWidgetRuntimeProps) {
  const limitRaw = config.props.limit;
  const limit =
    typeof limitRaw === 'number' ? Math.min(Math.max(limitRaw, 3), 25) : 8;

  const auditQuery = useQuery({
    queryKey: ['dashboard-audit-feed', limit],
    queryFn: () => fetchAuditEntries(limit),
    staleTime: 60_000,
  });

  const rows = auditQuery.data ?? [];

  return (
    <div className="card dashboard-widget-shell">
      <div className="card__header card__header--widget">
        <div>
          <h3 className="card__title">Trilho de auditoria</h3>
          <p className="card__subtitle">Últimos eventos registados</p>
        </div>
        {editMode ? (
          <input
            type="number"
            min={3}
            max={25}
            className="form-input form-input--dense"
            aria-label="Limite de eventos"
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
      <div className="card__body">
        {auditQuery.isLoading ? (
          <p className="text-secondary">A carregar auditoria…</p>
        ) : auditQuery.isError ? (
          <p className="text-secondary">Não foi possível carregar eventos.</p>
        ) : rows.length === 0 ? (
          <p className="text-secondary">Sem eventos recentes.</p>
        ) : (
          <div className="list-stack">
            {rows.map((row) => (
              <div key={row.id} className="list-row">
                <div>
                  <div className="list-row__title">{row.table_name}</div>
                  <div className="list-row__meta">
                    {row.action} • {row.origin}
                  </div>
                </div>
                <div className="list-row__value font-mono text-secondary">
                  {formatDateTime(row.performed_at)}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Link to="/app/audit" className="btn btn--secondary btn--small no-drag">
            <Shield size={16} />
            Abrir auditoria
          </Link>
        </div>
      </div>
    </div>
  );
}
