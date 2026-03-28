import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { fetchPendingReviews } from '../shared/portal.api';
import {
  formatCurrency,
  formatDateTime,
  formatInteger,
  formatPeriodLabel,
} from '../../utils/formatters';

export function WorkflowPage() {
  const workflowQuery = useQuery({
    queryKey: ['workflow', 'pending-reviews'],
    queryFn: fetchPendingReviews,
  });

  if (workflowQuery.isLoading) {
    return <div className="skeleton skeleton--card" />;
  }

  if (workflowQuery.error || !workflowQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar a fila de revisão da controladoria.
      </div>
    );
  }

  const rows = workflowQuery.data;
  const issueCount = rows.reduce((total, row) => total + Number(row.open_issues_count ?? 0), 0);

  return (
    <div className="page-stack">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Aprovações</h1>
          <p className="page-container__subtitle">
            Fila operacional da controladoria para revisão das submissões pendentes.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Pendentes</span>
            <div className="kpi-card__icon">
              <ClipboardCheck />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(rows.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Submissões aguardando ação</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Pendências abertas</span>
            <div className="kpi-card__icon">
              <AlertTriangle />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(issueCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Itens sinalizados para ajuste</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Fila da controladoria</h3>
        </div>
        <div className="card__body card__body--compact">
          {rows.length === 0 ? (
            <div className="inline-message inline-message--success">
              Não há submissões em revisão neste momento.
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Franquia</th>
                    <th>Regional</th>
                    <th>Período</th>
                    <th className="align-right">RBV</th>
                    <th className="align-right">EBITDA 2</th>
                    <th className="align-right">Pendências</th>
                    <th>Enviado em</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.submission_id}>
                      <td>{row.franchise_name}</td>
                      <td>{row.regional_name}</td>
                      <td>{formatPeriodLabel(row.period_label)}</td>
                      <td className="align-right font-mono">{formatCurrency(row.gross_revenue)}</td>
                      <td className="align-right font-mono">{formatCurrency(row.ebitda_2)}</td>
                      <td className="align-right">{formatInteger(row.open_issues_count)}</td>
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
