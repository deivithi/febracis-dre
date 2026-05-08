import { FileSpreadsheet } from 'lucide-react';
import { AssistantDock } from './components/AssistantDock';
import { DreStatementSection } from './components/DreStatementSection';
import { SubmissionKpiSection } from './components/SubmissionKpiSection';
import { SubmissionToolbar } from './components/SubmissionToolbar';
import { SubmissionWorkbenchRail } from './components/SubmissionWorkbenchRail';
import { SubmissionsScopeTable } from './components/SubmissionsScopeTable';
import { useSubmissionsWorkspace } from './useSubmissionsWorkspace';
import './SubmissionsPage.css';

export function SubmissionsPage() {
  const w = useSubmissionsWorkspace();

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
          Não foi possível carregar o workspace de submissões. Verifique a conexão e tente atualizar a página.
        </div>
      </div>
    );
  }

  if (w.franchisesQuery.data.length === 0) {
    return (
      <div className="page-stack submissions-page-root">
        <div className="page-container__title-bar">
          <div>
            <h1 className="page-container__title">Submissões</h1>
            <p className="page-container__subtitle">
              A unidade escolhe a competência, preenche a DRE e envia a versão oficial para revisão.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <div className="empty-state">
              <div className="empty-state__icon">
                <FileSpreadsheet />
              </div>
              <h3 className="empty-state__title">Nenhuma franquia disponível no seu escopo</h3>
              <p className="empty-state__description">
                O seu utilizador não tem franquias associadas ou o acesso ainda não foi configurado. Peça ao
                administrador para validar o vínculo da coligada ou da regional no painel de configurações.
              </p>
            </div>
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

  return (
    <div className="page-stack submissions-page-root">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Submissões</h1>
          <p className="page-container__subtitle">
            Escolha franquia e competência, preencha com o assistente e envie para revisão — o painel à direita mostra o
            preview e as ações.
          </p>
        </div>
      </div>

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
        }}
        onPeriodChange={(id) => {
          w.setSelectedPeriodId(id);
          w.setSubmissionFocusId(null);
          w.setEditingSubmissionId(null);
          w.setSelectedEventId('');
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
      />

      {w.assistantErrorMessage ? (
        <div className="inline-message inline-message--danger">{w.assistantErrorMessage}</div>
      ) : null}

      <div className="submission-mobile-tabs" role="tablist" aria-label="Secções do workspace de submissão">
        <button
          type="button"
          role="tab"
          aria-selected={w.mobileWorkspaceTab === 'chat'}
          className="submission-mobile-tabs__btn"
          onClick={() => w.setMobileWorkspaceTab('chat')}
        >
          Conversa
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={w.mobileWorkspaceTab === 'panel'}
          className="submission-mobile-tabs__btn"
          onClick={() => w.setMobileWorkspaceTab('panel')}
        >
          Painel
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={w.mobileWorkspaceTab === 'dre'}
          className="submission-mobile-tabs__btn"
          onClick={() => w.setMobileWorkspaceTab('dre')}
        >
          DRE
        </button>
      </div>

      <div className="submission-workbench" data-testid="submission-workbench">
        <AssistantDock
          mobileWorkspaceTab={w.mobileWorkspaceTab}
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

        <SubmissionWorkbenchRail
          mobileWorkspaceTab={w.mobileWorkspaceTab}
          selectedFranchise={w.selectedFranchise}
          selectedPeriod={w.selectedPeriod}
          workspaceBody={w.workspaceQuery.data}
          effectiveNotes={w.effectiveNotes}
          onNotesChange={w.setSubmissionNotes}
          beginEditing={w.beginEditing}
          canEditActiveSubmission={w.canEditActiveSubmission}
          activeSubmissionId={w.activeSubmissionId}
          saveDraftMutation={w.saveDraftMutation}
          submitMutation={w.submitMutation}
          saveActionLabel={w.saveActionLabel}
          submitActionLabel={w.submitActionLabel}
          draftValidation={w.draftValidation}
          preview={w.preview}
          activeSubmissionLocked={w.activeSubmissionLocked}
          submissionLockMessage={w.submissionLockMessage}
          canEdit={w.canEdit}
        />
      </div>

      <DreStatementSection
        rows={w.resolvedStatementRows}
        source={w.statementSource}
        mobileWorkspaceTab={w.mobileWorkspaceTab}
      />

      <SubmissionsScopeTable
        rows={currentRows}
        activeSubmissionId={w.activeSubmissionId}
        onSelectRow={(row) => {
          w.setSelectedFranchiseId(row.franchise_id);
          w.setSelectedPeriodId(row.reporting_period_id);
          w.setSubmissionFocusId(row.submission_id);
          w.setEditingSubmissionId(null);
          w.setSelectedEventId('');
        }}
      />
    </div>
  );
}
