import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useAccessProfile } from '../auth/useAccessProfile';
import { fetchAccessibleFranchises, fetchCurrentSubmissions } from '../shared/portal.api';
import { formatInteger, formatPeriodLabel, formatStatusLabel, getStatusVariant } from '../../utils/formatters';

export function FranchisesPage() {
  const accessProfileQuery = useAccessProfile();
  const franchisesQuery = useQuery({
    queryKey: [
      'franchises',
      accessProfileQuery.data?.franchiseIds.join(',') ?? 'all-franchises',
      accessProfileQuery.data?.regionalIds.join(',') ?? 'all-regionals',
    ],
    queryFn: async () => {
      const access = accessProfileQuery.data!;
      const [franchises, submissions] = await Promise.all([
        fetchAccessibleFranchises(access),
        fetchCurrentSubmissions(access),
      ]);

      const currentSubmissionMap = new Map(
        submissions.map((submission) => [submission.franchise_id, submission]),
      );

      return franchises.map((franchise) => ({
        ...franchise,
        currentSubmission: currentSubmissionMap.get(franchise.id) ?? null,
      }));
    },
    enabled: Boolean(accessProfileQuery.data),
  });

  if (accessProfileQuery.isLoading || franchisesQuery.isLoading) {
    return <div className="skeleton skeleton--card" />;
  }

  if (accessProfileQuery.error || franchisesQuery.error || !franchisesQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar a carteira de franquias disponível.
      </div>
    );
  }

  const rows = franchisesQuery.data;
  const activeCount = rows.filter((row) => row.status === 'active').length;

  return (
    <div className="page-stack">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Franquias</h1>
          <p className="page-container__subtitle">
            Visão cadastral e operacional das unidades dentro do seu escopo.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Unidades visíveis</span>
            <div className="kpi-card__icon">
              <Building2 />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(rows.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Carteira retornada pelo RLS</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Ativas</span>
          </div>
          <div className="kpi-card__value kpi-card__value--success">{formatInteger(activeCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Status operacional ativo</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Carteira atual</h3>
        </div>
        <div className="card__body card__body--compact">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Building2 />
              </div>
              <h3 className="empty-state__title">Nenhuma franquia encontrada</h3>
              <p className="empty-state__description">
                Revise os escopos do usuário para liberar a visualização das unidades.
              </p>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Franquia</th>
                    <th>Cidade/UF</th>
                    <th>Status cadastro</th>
                    <th>Período corrente</th>
                    <th>Status da submissão</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="list-row__title">{row.trade_name}</div>
                        <div className="list-row__meta">{row.code}</div>
                      </td>
                      <td>{[row.city, row.state].filter(Boolean).join('/') || '—'}</td>
                      <td>{formatStatusLabel(row.status)}</td>
                      <td>{formatPeriodLabel(row.currentSubmission?.period_label ?? null)}</td>
                      <td>
                        {row.currentSubmission ? (
                          <span
                            className={`status-badge status-badge--${getStatusVariant(row.currentSubmission.status)}`}
                          >
                            <span className="status-badge__dot" />
                            {formatStatusLabel(row.currentSubmission.status)}
                          </span>
                        ) : (
                          <span className="badge badge--default">Sem submissão</span>
                        )}
                      </td>
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
