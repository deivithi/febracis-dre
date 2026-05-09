import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, FolderSync, Lock, Send, ShieldCheck, XCircle } from 'lucide-react';
import { SubmissionLockTooltip } from '../../../components/ui/tooltip';
import {
  SUBMISSION_WORKSPACE_BODY_TRANSITION,
  SUBMISSION_WORKSPACE_LOCKED_BODY_CLASSES,
} from '../submissionLockUi';
import type { UseMutationResult } from '@tanstack/react-query';
import type { FranchiseListRow, ReportingPeriodRow } from '../../shared/portal.types';
import type { SubmissionDraftValidation } from '../submissionValidation';
import {
  formatCurrency,
  formatDateTime,
  formatPeriodLabel,
  formatStatusLabel,
  formatValidationStatusLabel,
  getStatusVariant,
  getValidationSeverity,
} from '../../../utils/formatters';
import type { DrePreviewSource, DrePreviewValues } from '../drePreview';
import { Card } from '../../../components/ui/card';

type NarrowWorkbenchTab = 'situation' | 'preview' | 'checks';

type TabletWorkspaceTab = 'panel' | 'dre';

type ValidationResultRow = {
  id: string;
  rule_name: string;
  message: string | null;
  status: string;
};

type SubmissionWorkspaceBody = {
  submission: {
    version_number: number;
    submitted_at: string | null;
    status?: string | null;
  } | null;
  validationResults: ValidationResultRow[];
};

export type SubmissionWorkbenchRailProps = {
  narrowRadixTabs?: boolean;
  narrowWorkbenchTab?: NarrowWorkbenchTab;
  mobileWorkspaceTab: TabletWorkspaceTab;
  selectedFranchise: FranchiseListRow | null;
  selectedPeriod: ReportingPeriodRow | null;
  workspaceBody: SubmissionWorkspaceBody | undefined;
  effectiveNotes: string;
  onNotesChange: (value: string) => void;
  beginEditing: () => void;
  canEditActiveSubmission: boolean;
  activeSubmissionId: string | null;
  saveDraftMutation: UseMutationResult<unknown, Error, void, unknown>;
  submitMutation: UseMutationResult<unknown, Error, void, unknown>;
  saveActionLabel: string;
  submitActionLabel: string;
  draftValidation: SubmissionDraftValidation;
  preview: DrePreviewValues;
  previewSource: DrePreviewSource;
  previewReconciling: boolean;
  activeSubmissionLocked: boolean;
  submissionLockMessage: string;
  canEdit: boolean;
};

type SummaryRowKind = 'figure' | 'negative' | 'margin' | 'ebitda';

type SummaryRow = {
  key: string;
  name: string;
  hint?: string;
  value: number;
  kind: SummaryRowKind;
};

function buildSummaryRows(preview: DrePreviewValues): SummaryRow[] {
  return [
    {
      key: 'rbv',
      name: 'Receita Bruta de Vendas',
      hint: 'RBV — total faturado pela unidade no período',
      value: preview.grossRevenue,
      kind: 'figure',
    },
    {
      key: 'deductions',
      name: 'Deduções e descontos',
      hint: 'Impostos, royalties e estornos sobre a RBV',
      value: -Math.abs(preview.deductionsTotal),
      kind: 'negative',
    },
    {
      key: 'mc1',
      name: 'Margem de contribuição 1',
      hint: 'MC1 = RBV − deduções',
      value: preview.mc1,
      kind: 'margin',
    },
    {
      key: 'mc2',
      name: 'Margem de contribuição 2',
      hint: 'MC2 = MC1 − despesas variáveis e marketing',
      value: preview.mc2,
      kind: 'margin',
    },
    {
      key: 'ebitda1',
      name: 'EBITDA 1',
      hint: 'Resultado operacional antes de impostos',
      value: preview.ebitda1,
      kind: 'figure',
    },
    {
      key: 'ebitda2',
      name: 'EBITDA 2',
      hint: 'Resultado final pós-impostos do período',
      value: preview.ebitda2,
      kind: 'ebitda',
    },
  ];
}

function ValidationIcon({ severity }: { severity: 'pass' | 'warn' | 'fail' }) {
  if (severity === 'pass') {
    return <CheckCircle2 size={18} aria-hidden />;
  }
  if (severity === 'fail') {
    return <XCircle size={18} aria-hidden />;
  }
  return <AlertTriangle size={18} aria-hidden />;
}

/**
 * Painel da submissão: situação na esquerda, resultado e regras na direita.
 *
 * Linguagem evita siglas cruas e mostra a fonte dos números (rascunho local × gravado),
 * para que executivos da rede compreendam de relance o que está acontecendo.
 */
export function SubmissionWorkbenchRail({
  narrowRadixTabs = false,
  narrowWorkbenchTab = 'situation',
  mobileWorkspaceTab,
  selectedFranchise,
  selectedPeriod,
  workspaceBody,
  effectiveNotes,
  onNotesChange,
  beginEditing,
  canEditActiveSubmission,
  activeSubmissionId,
  saveDraftMutation,
  submitMutation,
  saveActionLabel,
  submitActionLabel,
  draftValidation,
  preview,
  previewSource,
  previewReconciling,
  activeSubmissionLocked,
  submissionLockMessage,
  canEdit,
}: SubmissionWorkbenchRailProps) {
  const summaryRows = buildSummaryRows(preview);

  const submissionStatus = workspaceBody?.submission?.status ?? null;
  const bodyLockClass = activeSubmissionLocked
    ? SUBMISSION_WORKSPACE_LOCKED_BODY_CLASSES
    : SUBMISSION_WORKSPACE_BODY_TRANSITION;
  const sourceLabel =
    previewSource === 'server_statement'
      ? 'Motor gravado • alinhado à DRE oficial'
      : 'Prévia local • atualiza enquanto você digita';
  const sourceVariant = previewSource === 'server_statement' ? 'official' : 'draft';

  const smPanelVisibility = narrowRadixTabs
    ? 'submission-workbench__panel--active-sm submission-workbench__rail--radix-mobile'
    : mobileWorkspaceTab === 'panel'
      ? 'submission-workbench__panel--active-sm'
      : 'submission-workbench__panel--hidden-sm';

  const railColHidden = (key: NarrowWorkbenchTab) =>
    narrowRadixTabs ? (narrowWorkbenchTab !== key ? 'submission-workbench__radix-pane--inactive' : '') : '';

  return (
    <aside
      className={`submission-workbench__rail submission-workbench__rail--grid submission-sidebar submission-workbench__panel ${smPanelVisibility}`}
      aria-label="Painel da submissão"
    >
      {/* Coluna 1: Situação + observações + ações */}
      <div className={`submission-workbench__rail-col ${railColHidden('situation')}`}>
        <Card variant="kpi">
          <div className="card__header">
            <div>
              <h3 className="card__title">Situação da DRE</h3>
              <p className="card__subtitle">
                Identificação da unidade, competência e estado atual da submissão.
              </p>
            </div>
            {submissionStatus ? (
              <div className="submission-workbench__status-cluster">
                <span className={`status-badge status-badge--${getStatusVariant(submissionStatus)}`}>
                  <span className="status-badge__dot" />
                  {formatStatusLabel(submissionStatus)}
                </span>
                {activeSubmissionLocked ? (
                  <SubmissionLockTooltip>
                    <button
                      type="button"
                      className="submission-workbench__lock-trigger"
                      aria-label="Submissão bloqueada — devolução exige ação da controladoria"
                    >
                      <Lock size={14} className="text-warning" aria-hidden />
                    </button>
                  </SubmissionLockTooltip>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={`card__body ${bodyLockClass}`}>
            <div className="detail-list">
              <div className="detail-list__item">
                <span className="detail-list__label">Franquia</span>
                <span className="detail-list__value">{selectedFranchise?.trade_name ?? '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Competência</span>
                <span className="detail-list__value competence-etiquette">
                  {formatPeriodLabel(selectedPeriod?.label ?? null)}
                </span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Versão ativa</span>
                <span className="detail-list__value">
                  {workspaceBody?.submission ? `v${workspaceBody.submission.version_number}` : '—'}
                </span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Último envio</span>
                <span className="detail-list__value">
                  {formatDateTime(workspaceBody?.submission?.submitted_at ?? null)}
                </span>
              </div>
            </div>

            <div className="form-group submission-sidebar__notes">
              <label className="form-label" htmlFor="submission-notes">
                Observações da unidade
              </label>
              <textarea
                id="submission-notes"
                data-testid="submission-notes"
                className="form-input submission-sidebar__textarea"
                value={effectiveNotes}
                onChange={(event) => {
                  beginEditing();
                  onNotesChange(event.target.value);
                }}
                disabled={!canEditActiveSubmission}
                placeholder="Adicione observações para a controladoria…"
              />
            </div>

            <div className="submission-sidebar__actions">
              <button
                type="button"
                data-testid="submission-save-draft"
                className="btn btn--secondary btn--full"
                onClick={() => saveDraftMutation.mutate()}
                disabled={!canEditActiveSubmission || !activeSubmissionId || saveDraftMutation.isPending}
              >
                <FolderSync size={18} aria-hidden />
                {saveActionLabel}
              </button>

              <button
                type="button"
                data-testid="submission-send-review"
                data-tour-id="submit-review-cta"
                className="btn btn--gold btn--full"
                onClick={() => submitMutation.mutate()}
                disabled={
                  !canEditActiveSubmission || !activeSubmissionId || submitMutation.isPending || !draftValidation.ok
                }
                title={
                  !draftValidation.ok && canEditActiveSubmission
                    ? 'Preencha todas as linhas obrigatórias antes de enviar para revisão.'
                    : undefined
                }
              >
                <Send size={18} aria-hidden />
                {submitActionLabel}
              </button>
            </div>

            {activeSubmissionLocked ? <div className="inline-message">{submissionLockMessage}</div> : null}

            {!canEdit ? (
              <div className="inline-message">
                Este perfil está em leitura. Apenas usuários da franquia e administradores podem alterar a DRE.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Coluna 2: Resumo financeiro (preenchimento da grelha está na faixa KPI no topo) */}
      <div className={`submission-workbench__rail-col ${railColHidden('preview')}`}>
        <Card variant="kpi">
          <div className="card__header">
            <div>
              <h3 className="card__title">Resumo da DRE (prévia)</h3>
              <p className="card__subtitle">
                Linhas-chave do resultado em ordem da planilha oficial: receita, margens e EBITDA.
              </p>
            </div>
            <Link
              to="/app/guide"
              className="card__header-link"
              title="Abrir o glossário e o passo a passo da DRE"
            >
              <BookOpen size={16} aria-hidden />
              <span>Como ler</span>
            </Link>
          </div>
          <div className={`card__body card__body--flush ${bodyLockClass}`}>
              <span
                className={`dre-summary__source dre-summary__source--${sourceVariant}`}
                aria-label={`Fonte dos números: ${sourceLabel}`}
              >
                <span className="dre-summary__source-dot" aria-hidden />
                {previewReconciling ? 'Sincronizando com o motor...' : sourceLabel}
              </span>

              {summaryRows.map((row, index) => (
                <Fragment key={row.key}>
                  {row.kind === 'ebitda' && index > 0 ? (
                    <div className="dre-summary__divider" aria-hidden />
                  ) : null}
                  <div
                    className={`dre-summary__row dre-summary__row--${row.kind}`}
                    data-testid={`dre-summary-${row.key}`}
                  >
                    <div className="dre-summary__row-label">
                      <span className="dre-summary__row-name">{row.name}</span>
                      {row.hint ? <span className="dre-summary__row-hint">{row.hint}</span> : null}
                    </div>
                    <span className="dre-summary__row-value num-tabular">{formatCurrency(row.value)}</span>
                  </div>
                </Fragment>
              ))}
          </div>
        </Card>
      </div>

      {/* Coluna 3: Validações */}
      <div className={`submission-workbench__rail-col ${railColHidden('checks')}`}>
        <Card variant="kpi">
          <div className="card__header">
            <div>
              <h3 className="card__title">Verificações da controladoria</h3>
              <p className="card__subtitle">
                Regras automáticas que rodam após gravar — comparam a DRE com o histórico e os limites da rede.
              </p>
            </div>
            <span className="card__header-icon" aria-hidden>
              <ShieldCheck size={20} />
            </span>
          </div>
          <div className={`card__body ${bodyLockClass}`}>
            {!draftValidation.ok && canEditActiveSubmission ? (
              <div className="inline-message inline-message--warning submission-validation-draft">
                <strong>Antes de enviar:</strong> faltam {draftValidation.missingRequired.length} linha(s) com valor
                válido.
                <ul className="submission-validation-draft__list">
                  {draftValidation.missingRequired.slice(0, 6).map((item) => (
                    <li key={item.lineCode}>
                      {item.sectionName} — {item.lineName}
                    </li>
                  ))}
                </ul>
                {draftValidation.missingRequired.length > 6 ? (
                  <p className="submission-validation-draft__more">
                    +{draftValidation.missingRequired.length - 6} outras linhas
                  </p>
                ) : null}
              </div>
            ) : null}

            {workspaceBody?.validationResults.length ? (
              <div className="validation-checklist" role="list">
                {workspaceBody.validationResults.map((result) => {
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
                As verificações aparecem após gravar o rascunho — comparamos sua DRE com a base oficial.
              </div>
            )}
          </div>
        </Card>
      </div>
    </aside>
  );
}
