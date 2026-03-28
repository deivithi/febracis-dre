import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { fetchAuditEntries } from '../shared/portal.api';
import { formatDateTime, formatStatusLabel } from '../../utils/formatters';

export function AuditPage() {
  const auditQuery = useQuery({
    queryKey: ['audit-log', 50],
    queryFn: () => fetchAuditEntries(50),
  });

  if (auditQuery.isLoading) {
    return <div className="skeleton skeleton--card" />;
  }

  if (auditQuery.error || !auditQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar o log de auditoria.
      </div>
    );
  }

  const rows = auditQuery.data;

  return (
    <div className="page-stack">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Auditoria</h1>
          <p className="page-container__subtitle">
            Últimos eventos registrados no trilho de auditoria do sistema.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Últimas alterações</h3>
        </div>
        <div className="card__body card__body--compact">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <History />
              </div>
              <h3 className="empty-state__title">Sem eventos registrados</h3>
              <p className="empty-state__description">
                O log passará a aparecer assim que o sistema registrar eventos auditáveis.
              </p>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tabela</th>
                    <th>Ação</th>
                    <th>Origem</th>
                    <th>Registro</th>
                    <th>Executado em</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.table_name}</td>
                      <td>{formatStatusLabel(row.action)}</td>
                      <td>{row.origin}</td>
                      <td className="font-mono">{row.record_id.slice(0, 8)}</td>
                      <td>{formatDateTime(row.performed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
