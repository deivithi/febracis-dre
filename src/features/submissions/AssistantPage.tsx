import { Bot } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AssistantDock } from './components/AssistantDock';
import { SubmissionKpiSection } from './components/SubmissionKpiSection';
import { SubmissionToolbar } from './components/SubmissionToolbar';
import { SubmissionsScopeTable } from './components/SubmissionsScopeTable';
import { useSubmissionsWorkspace } from './useSubmissionsWorkspace';
import type { AssistantProductTab } from './agentPermissions';
import { formatPeriodLabel } from '../../utils/formatters';
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

  const clearSubmissionParam = () => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('submission');
        return p;
      },
      { replace: true },
    );
  };

  const setSubmissionParam = (submissionId: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('submission', submissionId);
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
      <div className="page-stack submissions-page-root">
        <div className="page-container__title-bar">
          <div>
            <h1 className="page-container__title">Assistente DRE</h1>
            <p className="page-container__subtitle">Nenhuma franquia disponível no seu escopo.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentRows = w.submissionsQuery.data;
  const approvedCount = currentRows.filter((row) => row.status === 'approved').length;
  const pendingCount = currentRows.filter((row) =>
    ['submitted', 'under_review', 'pending_adjustment'].includes(row.status),
  ).length;

  const franchiseLabel = w.selectedFranchise?.trade_name ?? 'Franquia';
  const periodLabel = w.selectedPeriod ? formatPeriodLabel(w.selectedPeriod.label) : 'Período';

  return (
    <div className="page-stack submissions-page-root assistant-hub-page">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">
            <Bot className="assistant-hub-page__title-icon" size={28} aria-hidden />
            Assistente DRE
          </h1>
          <p className="page-container__subtitle">
            Converse com o assistente para entender cada linha da DRE ou preencher passo a passo. Os números aqui
            são os mesmos que aparecem em <strong>Submissões</strong> — escolha onde é mais confortável trabalhar.
          </p>
        </div>
      </div>

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

      <p className="assistant-hub-context" role="status">
        <strong>Você está em:</strong> {franchiseLabel} · competência {periodLabel}
        {productTab === 'duvidas'
          ? ' — modo orientação. O assistente explica cada linha da DRE; nada é gravado por aqui.'
          : ' — modo preenchimento guiado. O assistente sugere valores; você confirma e grava o rascunho como na grelha de Submissões.'}
      </p>

      <SubmissionToolbar
        resolvedFranchiseId={w.resolvedFranchiseId}
        resolvedPeriodId={w.resolvedPeriodId}
        effectiveEventId={w.effectiveEventId}
        franchiseRows={w.franchisesQuery.data}
        periodRows={w.periodsQuery.data}
        eventRows={w.eventsQuery.data}
        currentSubmissionLocked={w.currentSubmissionLocked}
        canPrepareDraft={w.canPrepareDraft}
        draftActionLabel={w.draftActionLabel}
        onFranchiseChange={(id) => {
          w.setSelectedFranchiseId(id);
          w.setSubmissionFocusId(null);
          w.setEditingSubmissionId(null);
          w.setSelectedEventId('');
          clearSubmissionParam();
        }}
        onPeriodChange={(id) => {
          w.setSelectedPeriodId(id);
          w.setSubmissionFocusId(null);
          w.setEditingSubmissionId(null);
          w.setSelectedEventId('');
          clearSubmissionParam();
        }}
        onEventChange={w.setSelectedEventId}
        onCreateDraft={() => w.createDraftMutation.mutate()}
        isCreatingDraft={w.createDraftMutation.isPending}
      />

      {w.currentErrorMessage ? (
        <div className="inline-message inline-message--danger">{w.currentErrorMessage}</div>
      ) : null}

      <SubmissionKpiSection
        totalCount={currentRows.length}
        approvedCount={approvedCount}
        pendingCount={pendingCount}
        preview={w.preview}
        draftSummary={w.draftValidation}
      />

      {w.assistantErrorMessage ? (
        <div className="inline-message inline-message--danger">{w.assistantErrorMessage}</div>
      ) : null}

      <div className="submission-workbench" data-testid="assistant-hub-workbench">
        <AssistantDock
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
          }}
        />
      </div>

      <SubmissionsScopeTable
        rows={currentRows}
        activeSubmissionId={w.activeSubmissionId}
        getAssistantHref={(row) => {
          const p = new URLSearchParams();
          p.set('submission', row.submission_id);
          if (productTab === 'duvidas') {
            p.set('tab', 'duvidas');
          }
          return `/app/assistant?${p.toString()}`;
        }}
        onSelectRow={(row) => {
          w.setSelectedFranchiseId(row.franchise_id);
          w.setSelectedPeriodId(row.reporting_period_id);
          w.setSubmissionFocusId(row.submission_id);
          w.setEditingSubmissionId(null);
          w.setSelectedEventId('');
          setSubmissionParam(row.submission_id);
        }}
      />

      <p className="assistant-hub-footer-hint">
        Os valores e o rascunho desta submissão são os mesmos em <strong>Submissões</strong> (grelha) e aqui —
        uma única fonte na API; o chat guiado ficou neste hub.
      </p>
    </div>
  );
}
