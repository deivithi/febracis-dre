import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  ShieldCheck,
  Undo2,
  XCircle,
} from 'lucide-react';
import {
  fetchPendingReviews,
  fetchSubmissionWorkspace,
  formatApiError,
  reviewSubmission,
} from '../shared/portal.api';
import {
  formatCurrency,
  formatDateTime,
  formatInteger,
  formatPeriodLabel,
  formatStatusLabel,
  formatValidationStatusLabel,
  getValidationSeverity,
  type ValidationSeverity,
} from '../../utils/formatters';
import './WorkflowPage.css';

function ValidationIcon({ severity }: { severity: ValidationSeverity }) {
  if (severity === 'pass') {
    return <CheckCircle2 size={18} aria-hidden />;
  }
  if (severity === 'fail') {
    return <XCircle size={18} aria-hidden />;
  }
  return <AlertTriangle size={18} aria-hidden />;
}

export function WorkflowPage() {
  const queryClient = useQueryClient();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  const workflowQuery = useQuery({
    queryKey: ['workflow', 'pending-reviews'],
    queryFn: fetchPendingReviews,
  });

  const effectiveSubmissionId = selectedSubmissionId ?? workflowQuery.data?.[0]?.submission_id ?? null;
  const workspaceQuery = useQuery({
    queryKey: ['workflow', 'submission-workspace', effectiveSubmissionId],
    queryFn: () => fetchSubmissionWorkspace(effectiveSubmissionId!),
    enabled: Boolean(effectiveSubmissionId),
  });

  const refreshWorkflowData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workflow'] }),
      queryClient.invalidateQueries({ queryKey: ['submissions'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['submission-workspace'] }),
    ]);
  };

  const reviewMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'start_review' | 'approve' | 'request_adjustment'; reason?: string }) =>
      reviewSubmission(effectiveSubmissionId!, action, reason ?? null),
    onSuccess: async () => {
      setReviewReason('');
      await refreshWorkflowData();
    },
  });

  const currentError = reviewMutation.error
    ? formatApiError(reviewMutation.error, 'Não conseguimos concluir a ação. Tente novamente em instantes.')
    : null;

  if (workflowQuery.isLoading) {
    return <div className="skeleton skeleton--card" />;
  }

  if (workflowQuery.error || !workflowQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar a fila de aprovações. Tente novamente em instantes.
      </div>
    );
  }

  const rows = workflowQuery.data;
  const issueCount = rows.reduce((total, row) => total + Number(row.open_issues_count ?? 0), 0);
  const selectedRow = rows.find((row) => row.submission_id === effectiveSubmissionId) ?? rows[0] ?? null;

  return (
    <div className="page-stack">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Aprovações</h1>
          <p className="page-container__subtitle">
            Mesa de trabalho da controladoria: assuma a revisão, aprove ou devolva DREs para ajuste.
          </p>
        </div>
      </div>

      {currentError && <div className="inline-message inline-message--danger">{currentError}</div>}
      {reviewMutation.data?.message && (
        <div className="inline-message inline-message--success">{reviewMutation.data.message}</div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Aguardando ação</span>
            <div className="kpi-card__icon">
              <ClipboardCheck />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(rows.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">DREs prontas para revisão da controladoria</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Pontos abertos</span>
            <div className="kpi-card__icon">
              <AlertTriangle />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(issueCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Itens marcados para ajuste pelas franquias</span>
          </div>
        </div>
      </div>

      <div className="workflow-layout">
        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Fila de aprovações</h3>
              <p className="card__subtitle">Toque numa linha para abrir o painel de decisão à direita.</p>
            </div>
          </div>
          <div className="card__body card__body--compact">
            {rows.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <div className="empty-state__icon">
                  <ClipboardCheck />
                </div>
                <h3 className="empty-state__title">Tudo em dia</h3>
                <p className="empty-state__description">
                  Nenhuma DRE aguardando aprovação neste momento. Quando uma franquia enviar uma versão para revisão,
                  ela aparece aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Franquia</th>
                      <th>Regional</th>
                      <th>Competência</th>
                      <th className="align-right">Receita</th>
                      <th className="align-right">EBITDA 2</th>
                      <th className="align-right">Pontos abertos</th>
                      <th>Enviada em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.submission_id}
                        className={row.submission_id === effectiveSubmissionId ? 'data-row--active' : ''}
                        onClick={() => setSelectedSubmissionId(row.submission_id)}
                      >
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

        <aside className="workflow-sidebar">
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Painel de decisão</h3>
            </div>
            <div className="card__body">
              {selectedRow ? (
                <>
                  <div className="detail-list">
                    <div className="detail-list__item">
                      <span className="detail-list__label">Franquia</span>
                      <span className="detail-list__value">{selectedRow.franchise_name}</span>
                    </div>
                    <div className="detail-list__item">
                      <span className="detail-list__label">Competência</span>
                      <span className="detail-list__value">{formatPeriodLabel(selectedRow.period_label)}</span>
                    </div>
                    <div className="detail-list__item">
                      <span className="detail-list__label">Status atual</span>
                      <span className="detail-list__value">{formatStatusLabel(selectedRow.submission_status)}</span>
                    </div>
                  </div>

                  <div className="form-group workflow-sidebar__notes">
                    <label className="form-label" htmlFor="review-reason">Parecer da controladoria</label>
                    <textarea
                      id="review-reason"
                      data-testid="workflow-review-reason"
                      className="form-input workflow-sidebar__textarea"
                      value={reviewReason}
                      onChange={(event) => setReviewReason(event.target.value)}
                      placeholder="Registre o parecer da revisão ou explique por que a DRE volta para ajuste."
                    />
                  </div>

                  <div className="workflow-sidebar__actions">
                    <button
                      type="button"
                      data-testid="workflow-start-review"
                      className="btn btn--secondary btn--full"
                      onClick={() => reviewMutation.mutate({ action: 'start_review', reason: reviewReason })}
                      disabled={reviewMutation.isPending}
                    >
                      <Eye size={18} />
                      Assumir a revisão
                    </button>
                    <button
                      type="button"
                      data-testid="workflow-approve"
                      className="btn btn--success btn--full"
                      onClick={() => reviewMutation.mutate({ action: 'approve', reason: reviewReason })}
                      disabled={reviewMutation.isPending}
                    >
                      <ShieldCheck size={18} />
                      Aprovar a DRE
                    </button>
                    <button
                      type="button"
                      data-testid="workflow-request-adjustment"
                      className="btn btn--danger btn--full"
                      onClick={() => reviewMutation.mutate({ action: 'request_adjustment', reason: reviewReason })}
                      disabled={reviewMutation.isPending || !reviewReason.trim()}
                    >
                      <Undo2 size={18} />
                      Devolver para ajuste
                    </button>
                  </div>
                </>
              ) : (
                <div className="inline-message">Escolha uma DRE da fila para abrir o painel de decisão.</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="card__title">O que precisa de atenção</h3>
                <p className="card__subtitle">
                  Verificações automáticas que comparam a DRE com o histórico e os limites da rede.
                </p>
              </div>
            </div>
            <div className="card__body">
              {workspaceQuery.isLoading ? (
                <div className="skeleton skeleton--card" />
              ) : workspaceQuery.data ? (
                <>
                  <div className="detail-list">
                    <div className="detail-list__item">
                      <span className="detail-list__label">Verificações executadas</span>
                      <span className="detail-list__value">{formatInteger(workspaceQuery.data.validationResults.length)}</span>
                    </div>
                    <div className="detail-list__item">
                      <span className="detail-list__label">Pontos em aberto</span>
                      <span className="detail-list__value">{formatInteger(workspaceQuery.data.issues.length)}</span>
                    </div>
                    <div className="detail-list__item">
                      <span className="detail-list__label">Eventos no histórico</span>
                      <span className="detail-list__value">{formatInteger(workspaceQuery.data.history.length)}</span>
                    </div>
                  </div>

                  {workspaceQuery.data.validationResults.length ? (
                    <div className="validation-checklist" role="list">
                      {workspaceQuery.data.validationResults.map((result) => {
                        const severity = getValidationSeverity(result.status);
                        return (
                          <div
                            key={result.id}
                            className={`validation-checklist__item validation-checklist__item--${severity}`}
                            role="listitem"
                          >
                            <span className={`validation-checklist__icon validation-checklist__icon--${severity}`}>
                              <ValidationIcon severity={severity} />
                            </span>
                            <div className="validation-checklist__body">
                              <span className="validation-checklist__title">{result.rule_name}</span>
                              <span className="validation-checklist__message">
                                {result.message?.trim().length
                                  ? result.message
                                  : `Resultado: ${formatValidationStatusLabel(result.status)}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="inline-message">
                      Ainda não há verificações registradas para esta DRE — elas rodam após a controladoria iniciar a
                      revisão.
                    </div>
                  )}
                </>
              ) : (
                <div className="inline-message">Escolha uma DRE da fila para ver o detalhe.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
