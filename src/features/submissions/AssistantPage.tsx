import { useSearchParams } from 'react-router-dom';
import { AssistantDock } from './components/AssistantDock';
import { useSubmissionsWorkspace } from './useSubmissionsWorkspace';
import type { AssistantProductTab } from './agentPermissions';
import './SubmissionsPage.css';
import './AssistantPage.css';

function parseProductTab(searchParams: URLSearchParams): AssistantProductTab {
  return searchParams.get('tab') === 'duvidas' ? 'duvidas' : 'preencher';
}

export function AssistantPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const submissionFromUrl = searchParams.get('submission');
  const productTab = parseProductTab(searchParams);

  const setProductTab = (next: AssistantProductTab) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'preencher') {
          p.delete('tab');
        } else {
          p.set('tab', 'duvidas');
        }
        return p;
      },
      { replace: true },
    );
  };

  const w = useSubmissionsWorkspace({
    routeSubmissionId: submissionFromUrl,
    assistantProductTab: productTab,
  });

  if (
    w.accessProfileQuery.isLoading ||
    w.franchisesQuery.isLoading ||
    w.periodsQuery.isLoading ||
    w.submissionsQuery.isLoading
  ) {
    return <div className="skeleton skeleton--card" />;
  }

  if (
    w.accessProfileQuery.error ||
    w.franchisesQuery.error ||
    w.periodsQuery.error ||
    w.submissionsQuery.error ||
    !w.access ||
    !w.franchisesQuery.data ||
    !w.periodsQuery.data ||
    !w.submissionsQuery.data
  ) {
    return (
      <div className="page-stack">
        <div className="inline-message inline-message--danger">
          Não foi possível carregar o assistente. Verifique a conexão e tente atualizar a página.
        </div>
      </div>
    );
  }

  if (w.franchisesQuery.data.length === 0) {
    return (
      <div className="page-stack submissions-page-root assistant-hub-page assistant-hub-page--minimal">
        <div className="inline-message" role="status">
          Nenhuma franquia disponível no seu escopo para o assistente.
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-stack submissions-page-root assistant-hub-page assistant-hub-page--minimal"
      data-testid="assistant-page"
    >
      <div className="assistant-hub-segment" role="group" aria-label="Modo do assistente">
        <button
          type="button"
          data-active={productTab === 'duvidas' ? 'true' : 'false'}
          className={`assistant-hub-segment__btn${productTab === 'duvidas' ? ' assistant-hub-segment__btn--active' : ''}`}
          onClick={() => setProductTab('duvidas')}
        >
          Dúvidas
        </button>
        <button
          type="button"
          data-active={productTab === 'preencher' ? 'true' : 'false'}
          className={`assistant-hub-segment__btn${productTab === 'preencher' ? ' assistant-hub-segment__btn--active' : ''}`}
          onClick={() => setProductTab('preencher')}
        >
          Começar a DRE
        </button>
      </div>

      {w.currentErrorMessage ? (
        <div className="inline-message inline-message--danger">{w.currentErrorMessage}</div>
      ) : null}

      {w.assistantErrorMessage ? (
        <div className="inline-message inline-message--danger">{w.assistantErrorMessage}</div>
      ) : null}

      <div className="assistant-hub-workbench-minimal" data-testid="assistant-hub-workbench">
        <AssistantDock
          hubMinimalLayout
          mobileWorkspaceTab="chat"
          activeSubmissionId={w.activeSubmissionId}
          canEdit={w.canEdit}
          submissionStatus={w.workspaceQuery.data?.submission?.status}
          activeSubmissionLocked={w.activeSubmissionLocked}
          canEditActiveSubmission={w.canEditActiveSubmission}
          submissionLockMessage={w.submissionLockMessage}
          workspaceLoading={w.workspaceQuery.isLoading}
          hasWorkspaceData={Boolean(w.workspaceQuery.data)}
          panel={{
            enabled: w.assistantEnabled,
            loading: w.agentSessionQuery.isLoading || w.agentMessagesQuery.isLoading,
            pending: w.assistantMutation.isPending,
            workspaceBootstrapPending: Boolean(
              w.activeSubmissionId && w.workspaceQuery.isLoading && !w.workspaceQuery.data,
            ),
            focusLabel: w.assistantFocusLabel,
            focusLine: w.assistantFocusLine,
            catalogLines: w.workspaceQuery.data?.inputLines ?? [],
            lineValueMap: w.effectiveLineValues,
            drePhaseId: w.assistantDrePhaseId,
            proposedValue: w.assistantProposedValue,
            skippedLineCodes: w.assistantSkippedCodes,
            canEditActiveSubmission: w.canEditActiveSubmission,
            nextPrompt: w.assistantNextPrompt,
            flowPhaseLabel: w.assistantFlowPhaseLabel,
            realignHint: w.assistantRealignHint,
            messages: w.assistantMessages,
            draftValue: w.assistantDraft,
            lastCitations: w.lastAssistantCitations,
            lineCodes: w.inputLineCodes,
            filledSteps: w.filledInputCount,
            totalSteps: w.workspaceQuery.data?.inputLines.length ?? 0,
            agentMode: w.assistantAgentMode,
            interactionMode: w.assistantInteractionMode,
            onDraftChange: w.setAssistantDraft,
            onSend: () => w.sendAssistantPrompt(w.assistantDraft),
            onCommand: w.sendAssistantCommand,
            onSaveDraft: () => w.saveDraftMutation.mutate(),
            onSubmitReview: () => w.submitMutation.mutate(),
            savePending: w.saveDraftMutation.isPending,
            submitPending: w.submitMutation.isPending,
            workspaceLocked: w.activeSubmissionLocked,
          }}
        />
      </div>
    </div>
  );
}
