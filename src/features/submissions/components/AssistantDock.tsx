import { FileSpreadsheet, Lock } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { DreAssistantPanel, type DreAssistantPanelProps } from '../DreAssistantPanel';
import { formatStatusLabel, getStatusVariant } from '../../../utils/formatters';
import { SubmissionLockTooltip } from '../../../components/ui/tooltip';
import {
  SUBMISSION_WORKSPACE_BODY_TRANSITION,
  SUBMISSION_WORKSPACE_LOCKED_BODY_CLASSES,
} from '../submissionLockUi';

type MobileWorkspaceTab = 'chat' | 'panel' | 'dre';

export type AssistantDockProps = {
  mobileWorkspaceTab: MobileWorkspaceTab;
  activeSubmissionId: string | null;
  canEdit: boolean;
  submissionStatus: string | null | undefined;
  activeSubmissionLocked: boolean;
  canEditActiveSubmission: boolean;
  submissionLockMessage: string;
  workspaceLoading: boolean;
  hasWorkspaceData: boolean;
  panel: DreAssistantPanelProps;
};

/**
 * Coluna principal do workbench: assistente DRE + cartão de contexto da submissão.
 */
export function AssistantDock({
  mobileWorkspaceTab,
  activeSubmissionId,
  canEdit,
  submissionStatus,
  activeSubmissionLocked,
  canEditActiveSubmission,
  submissionLockMessage,
  workspaceLoading,
  hasWorkspaceData,
  panel,
}: AssistantDockProps) {
  const mainColumnClass =
    mobileWorkspaceTab === 'chat'
      ? 'submission-workbench__panel--active-sm'
      : 'submission-workbench__panel--hidden-sm';

  const agentCardBodyLockClass = activeSubmissionLocked
    ? SUBMISSION_WORKSPACE_LOCKED_BODY_CLASSES
    : SUBMISSION_WORKSPACE_BODY_TRANSITION;

  return (
    <div
      className={`submission-workbench__main submission-workbench__panel ${mainColumnClass}`}
      data-testid="assistant-dock"
    >
      <DreAssistantPanel {...panel} />

      {!activeSubmissionId ? (
        <Card variant="default">
          <div className="card__body">
            <div className="empty-state">
              <div className="empty-state__icon">
                <FileSpreadsheet />
              </div>
              <h3 className="empty-state__title">Nenhuma submissão ativa neste recorte</h3>
              <p className="empty-state__description">
                {canEdit
                  ? 'Selecione a franquia e a competência desejada e clique em "Criar rascunho" para iniciar a DRE.'
                  : 'O seu perfil está em modo leitura. Escolha uma franquia e uma competência para acompanhar a versão corrente, quando existir.'}
              </p>
            </div>
          </div>
        </Card>
      ) : workspaceLoading || !hasWorkspaceData ? (
        <div className="skeleton skeleton--card" />
      ) : (
        <>
          <Card variant="kpi" className="submission-agent-only-card">
            <div className="card__header">
              <div>
                <h3 className="card__title">Sua DRE neste período</h3>
                <p className="card__subtitle">
                  Pode preencher por esta conversa (ordem guiada da planilha) ou pela grelha em Submissões. Use “Salvar
                  rascunho” nas ações quando quiser gravar; a DRE calculada aparece após guardar.
                </p>
              </div>
              <div className="submission-workbench__status-cluster">
                <span className={`status-badge status-badge--${getStatusVariant(submissionStatus ?? 'draft')}`}>
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
            </div>
            <div className={`card__body ${agentCardBodyLockClass}`}>
              {activeSubmissionLocked ? (
                <div className="inline-message">{submissionLockMessage}</div>
              ) : canEditActiveSubmission ? (
                <p className="submission-agent-only-card__text">
                  Toque em <strong>Olá</strong> no assistente e responda com valores em reais. O resumo MC1 / MC2 /
                  EBITDA ao lado acompanha os números após cada gravação.
                </p>
              ) : (
                <p className="submission-agent-only-card__text">
                  Modo leitura: acompanhe o preview à direita e a tabela de DRE oficial quando disponível.
                </p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
