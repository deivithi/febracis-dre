import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { fetchAuditEntries } from '../../../shared/portal.api';
import type { DashboardWidgetRuntimeProps } from '../dashboard-widget.types';
import { formatDateTime } from '../../../../utils/formatters';
import { ExpandableAnalyticsCard } from '../../components/ExpandableAnalyticsCard';
import { useState, useMemo } from 'react';

export default function AuditFeedWidget({
  config,
  onPropsPatch,
  editMode,
}: DashboardWidgetRuntimeProps) {
  const limitRaw = config.props.limit;
  const limit =
    typeof limitRaw === 'number' ? Math.min(Math.max(limitRaw, 3), 25) : 5;

  const [range, setRange] = useState<'hoje' | '7d' | '30d'>('7d');

  const auditQuery = useQuery({
    queryKey: ['dashboard-audit-feed', 50], // fetch more for client-side filter
    queryFn: () => fetchAuditEntries(50),
    staleTime: 60_000,
  });

  const rows = auditQuery.data ?? [];

  const filteredRows = useMemo(() => {
    const now = new Date().getTime();
    return rows.filter((row) => {
      const rowTime = new Date(row.performed_at).getTime();
      const diffDays = (now - rowTime) / (1000 * 3600 * 24);
      if (range === 'hoje') return diffDays <= 1;
      if (range === '7d') return diffDays <= 7;
      return diffDays <= 30;
    });
  }, [rows, range]);

  const renderList = (sliceLimit: number) => {
    const slice = filteredRows.slice(0, sliceLimit);

    if (auditQuery.isLoading) {
      return <p className="text-secondary">A carregar auditoria…</p>;
    }
    if (auditQuery.isError) {
      return <p className="text-secondary">Não foi possível carregar eventos.</p>;
    }
    if (slice.length === 0) {
      return <p className="text-secondary">Sem eventos neste período.</p>;
    }

    return (
      <div className="list-stack">
        {slice.map((row) => (
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
    );
  };

  const headerExtra = (
    <div className="dashboard-widget-inline-controls" style={{ display: 'flex', gap: '8px' }}>
      <select
        className="form-select form-select--dense"
        value={range}
        onChange={(e) => setRange(e.target.value as 'hoje' | '7d' | '30d')}
      >
        <option value="hoje">Hoje</option>
        <option value="7d">Últimos 7 dias</option>
        <option value="30d">Últimos 30 dias</option>
      </select>

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
  );

  return (
    <ExpandableAnalyticsCard
      title="Trilho de auditoria"
      subtitle="Últimos eventos registados"
      headerExtra={headerExtra}
      cardProps={{ className: 'dashboard-widget-shell' }}
      compactContent={
        <div className="card__body">
          {renderList(limit)}
        </div>
      }
      expandedContent={
        <div>
          <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="text-secondary">A exibir eventos de auditoria filtrados.</p>
            <input type="text" placeholder="Buscar evento..." className="form-input form-input--dense" disabled />
          </div>
          {renderList(25)}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/app/audit" className="btn btn--secondary no-drag">
              <Shield size={18} style={{ marginRight: '8px' }} />
              Explorar auditoria completa
            </Link>
          </div>
        </div>
      }
    />
  );
}
