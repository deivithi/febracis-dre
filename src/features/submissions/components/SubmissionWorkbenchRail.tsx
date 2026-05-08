import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, FolderSync, Send, ShieldCheck, XCircle } from 'lucide-react';
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
import type { DrePreviewValues } from '../drePreview';

type MobileTab = 'panel' | 'dre';

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
  mobileWorkspaceTab: MobileTab;
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
  activeSubmissionLocked,
  submissionLockMessage,
  canEdit,
}: SubmissionWorkbenchRailProps) {
  const summaryRows = buildSummaryRows(preview);

  const submissionStatus = workspaceBody?.submission?.status ?? null;
  const previewSourceIsDraft = canEditActiveSubmission;
  const sourceLabel = previewSourceIsDraft
    ? 'Prévia local • atualiza enquanto você digita'
    : workspaceBody?.submission
      ? 'Versão gravada • valores oficiais do motor'
      : 'Sem rascunho ativo';
  const sourceVariant = previewSourceIsDraft ? 'draft' : 'official';

  const totalInputs = draftValidation.totalInputs || 0;
  const filledCount = Math.min(draftValidation.filledCount, totalInputs);
  const percent = totalInputs > 0 ? Math.round((filledCount / totalInputs) * 100) : 0;
  const progressComplete = totalInputs > 0 && filledCount === totalInputs;

  return (
    <aside
      className={`submission-workbench__rail submission-workbench__rail--grid submission-sidebar submission-workbench__panel ${
        mobileWorkspaceTab === 'panel'
          ? 'submission-workbench__panel--active-sm'
          : 'submission-workbench__panel--hidden-sm'
      }`}
      aria-label="Painel da submissão"
    >
      {/* Coluna esquerda: situação + observações + ações */}
      <div className="submission-workbench__rail-col">
        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Situação da DRE</h3>
              <p className="card__subtitle">
                Identificação da unidade, competência e estado atual da submissão.
              </p>
            </div>
            {submissionStatus ? (
              <span className={`status-badge status-badge--${getStatusVariant(submissionStatus)}`}>
                <span className="status-badge__dot" />
                {formatStatusLabel(submissionStatus)}
              </span>
            ) : null}
          </div>

          <div className="card__body">
            <div className="detail-list">
              <div className="detail-list__item">
                <span className="detail-list__label">Franquia</span>
                <span className="detail-list__value">{selectedFranchise?.trade_name ?? '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Competência</span>
                <span className="detail-list__value">{formatPeriodLabel(selectedPeriod?.label ?? null)}</span>
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
                placeholder="Explique variações, premissas e fatos relevantes do período."
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
                <FolderSync size={18} />
                {saveActionLabel}
              </button>

              <button
                type="button"
                data-testid="submission-send-review"
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
                <Send size={18} />
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
        </div>
      </div>

      {/* Coluna direita: resumo financeiro + progresso + validações */}
      <div className="submission-workbench__rail-col">
        <div className="card">
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
          <div className="card__body">
            <div className="dre-summary">
              <span
                className={`dre-summary__source dre-summary__source--${sourceVariant}`}
                aria-label={`Fonte dos números: ${sourceLabel}`}
              >
                <span className="dre-summary__source-dot" aria-hidden />
                {sourceLabel}
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
                    <span className="dre-summary__row-value">{formatCurrency(row.value)}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        {totalInputs > 0 ? (
          <div className="draft-progress" data-testid="draft-progress">
            <div className="draft-progress__head">
              <span className="draft-progress__title">Preenchimento da grelha</span>
              <span className="draft-progress__counter">
                <strong>{filledCount}</strong> de <strong>{totalInputs}</strong> linhas obrigatórias
              </span>
            </div>
            <div className="draft-progress__track" aria-hidden>
              <div
                className={`draft-progress__fill${progressComplete ? ' draft-progress__fill--complete' : ''}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="draft-progress__hint">
              {progressComplete
                ? 'Tudo preenchido. Você pode enviar a DRE para revisão da controladoria.'
                : `Faltam ${totalInputs - filledCount} linha(s) com valor para liberar o envio.`}
            </p>
          </div>
        ) : null}

        <div className="card">
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
          <div className="card__body">
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
        </div>
      </div>
    </aside>
  );
}
