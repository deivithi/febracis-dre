import { FolderSync, Send } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { FranchiseListRow, ReportingPeriodRow } from '../../shared/portal.types';
import type { SubmissionDraftValidation } from '../submissionValidation';
import {
  formatCurrency,
  formatDateTime,
  formatPeriodLabel,
  formatStatusLabel,
  getStatusVariant,
} from '../../../utils/formatters';
import type { DrePreviewValues } from '../drePreview';

type MobileTab = 'chat' | 'panel' | 'dre';

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

/**
 * Coluna lateral: controles da submissão, preview e validações.
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
  return (
    <aside
      className={`submission-workbench__rail submission-sidebar submission-workbench__panel ${
        mobileWorkspaceTab === 'panel'
          ? 'submission-workbench__panel--active-sm'
          : 'submission-workbench__panel--hidden-sm'
      }`}
    >
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="card__title">Controle da submissão</h3>
            <p className="card__subtitle">Status atual, narrativa do período e ações operacionais.</p>
          </div>
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
                  ? 'Preencha todas as linhas da DRE antes de enviar para revisão.'
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
              Este perfil está em leitura. Apenas usuários de franquia e administradores podem alterar a DRE.
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Preview financeiro</h3>
        </div>
        <div className="card__body">
          <div className="detail-list">
            <div className="detail-list__item">
              <span className="detail-list__label">RBV</span>
              <span className="detail-list__value font-mono">{formatCurrency(preview.grossRevenue)}</span>
            </div>
            <div className="detail-list__item">
              <span className="detail-list__label">MC1</span>
              <span className="detail-list__value font-mono">{formatCurrency(preview.mc1)}</span>
            </div>
            <div className="detail-list__item">
              <span className="detail-list__label">MC2</span>
              <span className="detail-list__value font-mono">{formatCurrency(preview.mc2)}</span>
            </div>
            <div className="detail-list__item">
              <span className="detail-list__label">EBITDA 1</span>
              <span className="detail-list__value font-mono">{formatCurrency(preview.ebitda1)}</span>
            </div>
            <div className="detail-list__item">
              <span className="detail-list__label">EBITDA 2</span>
              <span className="detail-list__value font-mono">{formatCurrency(preview.ebitda2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Validações</h3>
        </div>
        <div className="card__body">
          {!draftValidation.ok && canEditActiveSubmission ? (
            <div className="inline-message inline-message--warning submission-validation-draft">
              <strong>Campos obrigatórios:</strong> faltam {draftValidation.missingRequired.length} linha(s) com valor
              válido antes do envio.
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
            <div className="list-stack">
              {workspaceBody.validationResults.map((result) => (
                <div key={result.id} className="list-row">
                  <div>
                    <div className="list-row__title">{result.rule_name}</div>
                    <div className="list-row__meta">{result.message ?? 'Sem observações.'}</div>
                  </div>
                  <div className="list-row__value">
                    <span className={`status-badge status-badge--${getStatusVariant(result.status)}`}>
                      <span className="status-badge__dot" />
                      {formatStatusLabel(result.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="inline-message">As validações do motor aparecerão após salvar o rascunho.</div>
          )}
        </div>
      </div>
    </aside>
  );
}
