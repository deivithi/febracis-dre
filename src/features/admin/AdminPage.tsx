import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { fetchAdminSnapshot } from '../shared/portal.api';
import { formatDateTime, formatInteger, formatStatusLabel } from '../../utils/formatters';

export function AdminPage() {
  const adminQuery = useQuery({
    queryKey: ['admin-snapshot'],
    queryFn: fetchAdminSnapshot,
  });

  if (adminQuery.isLoading) {
    return <div className="skeleton skeleton--card" />;
  }

  if (adminQuery.error || !adminQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar o snapshot administrativo.
      </div>
    );
  }

  const snapshot = adminQuery.data;

  return (
    <div className="page-stack">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Configurações</h1>
          <p className="page-container__subtitle">
            Leitura administrativa da base para apoiar governança e operação.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Franquias</span>
            <div className="kpi-card__icon">
              <Settings />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(snapshot.franchises.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Unidades cadastradas</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Regionais</span>
          </div>
          <div className="kpi-card__value">{formatInteger(snapshot.regionals.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Estrutura territorial ativa</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Usuários</span>
          </div>
          <div className="kpi-card__value">{formatInteger(snapshot.userCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Perfis registrados</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Papéis</span>
          </div>
          <div className="kpi-card__value">{formatInteger(snapshot.roles.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Catálogo de permissões</span>
          </div>
        </div>
      </div>

      <div className="page-grid page-grid--wide">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Competências abertas</h3>
          </div>
          <div className="card__body card__body--compact">
            {snapshot.openPeriods.length === 0 ? (
              <div className="inline-message">Nenhuma competência aberta ou reaberta neste momento.</div>
            ) : (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Competência</th>
                      <th>Status</th>
                      <th>Prazo de envio</th>
                      <th>Prazo de ajuste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.openPeriods.map((period) => (
                      <tr key={period.id}>
                        <td>{period.label}</td>
                        <td>{formatStatusLabel(period.status)}</td>
                        <td>{formatDateTime(period.submission_deadline_at)}</td>
                        <td>{formatDateTime(period.adjustment_deadline_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Papéis configurados</h3>
          </div>
          <div className="card__body">
            <div className="list-stack">
              {snapshot.roles.map((role) => (
                <div key={role.id} className="list-row">
                  <div>
                    <div className="list-row__title">{role.name}</div>
                    <div className="list-row__meta">{role.code}</div>
                  </div>
                  <div className="list-row__value text-right">
                    <div className="list-row__meta">{role.description ?? 'Sem descrição'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
