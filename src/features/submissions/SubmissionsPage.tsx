import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import { useAccessProfile } from '../auth/useAccessProfile';
import { fetchCurrentSubmissions } from '../shared/portal.api';
import {
  formatDateTime,
  formatInteger,
  formatPeriodLabel,
  formatStatusLabel,
  getStatusVariant,
} from '../../utils/formatters';

export function SubmissionsPage() {
  const accessProfileQuery = useAccessProfile();
  const submissionsQuery = useQuery({
    queryKey: [
      'submissions',
      accessProfileQuery.data?.franchiseIds.join(',') ?? 'all-franchises',
      accessProfileQuery.data?.regionalIds.join(',') ?? 'all-regionals',
    ],
    queryFn: () => fetchCurrentSubmissions(accessProfileQuery.data!),
    enabled: Boolean(accessProfileQuery.data),
  });

  if (accessProfileQuery.isLoading || submissionsQuery.isLoading) {
    return (
      <div className="page-stack">
        <div className="page-container__title-bar">
          <div>
            <h1 className="page-container__title">Submissões</h1>
            <p className="page-container__subtitle">Carregando submissões da sua área...</p>
          </div>
        </div>
        <div className="skeleton skeleton--card" />
      </div>
    );
  }

  if (accessProfileQuery.error || submissionsQuery.error || !submissionsQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar as submissões correntes.
      </div>
    );
  }

  const rows = submissionsQuery.data;
  const approvedCount = rows.filter((row) => row.status === 'approved').length;
  const pendingCount = rows.filter((row) => ['submitted', 'under_review', 'pending_adjustment'].includes(row.status)).length;

  return (
    <div className="page-stack">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Submissões</h1>
          <p className="page-container__subtitle">
            Acompanhe a versão corrente de cada competência dentro do seu escopo.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Submissões visíveis</span>
            <div className="kpi-card__icon">
              <FileSpreadsheet />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(rows.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Versões correntes listadas</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Aprovadas</span>
          </div>
          <div className="kpi-card__value kpi-card__value--success">{formatInteger(approvedCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Status finalizado</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Em tratamento</span>
          </div>
          <div className="kpi-card__value">{formatInteger(pendingCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Enviadas, em revisão ou ajuste</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="card__title">Submissões correntes</h3>
            <p className="card__subtitle">Cada linha representa a versão ativa do período para a franquia.</p>
          </div>
        </div>
        <div className="card__body card__body--compact">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <FileSpreadsheet />
              </div>
              <h3 className="empty-state__title">Nenhuma submissão encontrada</h3>
              <p className="empty-state__description">
                Quando houver uma submissão salva ou enviada dentro do seu escopo, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Franquia</th>
                    <th>Período</th>
                    <th>Regional</th>
                    <th className="align-center">Versão</th>
                    <th>Status</th>
                    <th>Submetido em</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.submission_id}>
                      <td>
                        <div className="list-row__title">{row.franchise_name}</div>
                        <div className="list-row__meta">{row.franchise_code}</div>
                      </td>
                      <td>{formatPeriodLabel(row.period_label)}</td>
                      <td>{row.regional_name}</td>
                      <td className="align-center font-mono">v{row.version_number}</td>
                      <td>
                        <span className={`status-badge status-badge--${getStatusVariant(row.status)}`}>
                          <span className="status-badge__dot" />
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(row.submitted_at)}</td>
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
