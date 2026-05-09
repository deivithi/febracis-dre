import { FileSpreadsheet, History as HistoryIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import { useAuth } from '../auth/useAuth';
import { SaveViewDialog } from '../saved-views/SaveViewDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { SavedViewsBar } from '../saved-views/SavedViewsBar';
import {
  emptyFiltersForPage,
  parseSavedFilters,
  stableFiltersFingerprint,
  type SavedViewFiltersV1,
} from '../saved-views/savedViewFilters';
import {
  applyFiltersToSearchParams,
  clearFilterParams,
} from '../saved-views/savedViewUrl';
import { useHydrateViewFromUrl } from '../saved-views/hydrateViewFromUrl';
import { useSaveViewSuggestion } from '../saved-views/useSaveViewSuggestion';
import { useIsMobileMax767 } from '../../hooks/useMediaQuery';
import { useSavedViewById, useSavedViewsList, useSavedViewsMutations } from '../../hooks/useSavedViews';
import { KpiCardSkeleton, SubmissionCardSkeleton, TableRowSkeleton } from '../../components/skeletons';
import { Skeleton } from '../../components/ui/Skeleton';
import { fetchSubmissionScopeMeta } from '../shared/portal.api';
import { DreStatementSection } from './components/DreStatementSection';
import { SubmissionKpiSection } from './components/SubmissionKpiSection';
import { SubmissionToolbar } from './components/SubmissionToolbar';
import { SubmissionWorkbenchRail } from './components/SubmissionWorkbenchRail';
import { SubmissionCatalogInputList } from './components/SubmissionCatalogInputList';
import { SubmissionsScopeTable } from './components/SubmissionsScopeTable';
import { VersionHistoryDrawer } from './VersionHistory';
import { Card } from '../../components/ui/card';
import { useSubmissionsWorkspace } from './useSubmissionsWorkspace';
import './SubmissionsPage.css';
import { formatPeriodLabel, formatStatusLabel } from '../../utils/formatters';
import { submissionStatusToBreadcrumbBadgeTone } from '../../utils/breadcrumbFormat';

export function SubmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const submissionFromUrl = searchParams.get('submission');
  const versaoParam = searchParams.get('versao')?.trim() ?? '';
  const isNarrowMobile = useIsMobileMax767();
  const w = useSubmissionsWorkspace({
    routeSubmissionId: submissionFromUrl,
  });

  const inlineAssistantFeatureOn =
    import.meta.env.VITE_INLINE_ASSISTANT === '1' || import.meta.env.VITE_INLINE_ASSISTANT === 'true';

  const submissionsBreadcrumbSegments = useMemo(() => {
    if (!w.access || !w.franchisesQuery.data?.length || !w.periodsQuery.data?.length || !w.submissionsQuery.data) {
      return [];
    }
    const franchise = w.selectedFranchise;
    const period = w.selectedPeriod;
    const tail =
      franchise && period ? `${franchise.trade_name} · ${formatPeriodLabel(period.label)}` : 'Workspace';
    const sub = w.workspaceQuery.data?.submission;
    const badge = sub ? `v${sub.version_number} · ${formatStatusLabel(sub.status)}` : undefined;
    const badgeTone = submissionStatusToBreadcrumbBadgeTone(sub?.status);
    return [
      { label: 'Portal', href: '/app/dashboard' },
      { label: 'Submissões', href: '/app/submissions' },
      { label: tail, badge, badgeTone },
    ];
  }, [
    w.access,
    w.franchisesQuery.data,
    w.periodsQuery.data,
    w.submissionsQuery.data,
    w.selectedFranchise,
    w.selectedPeriod,
    w.workspaceQuery.data?.submission,
  ]);

  useBreadcrumb(submissionsBreadcrumbSegments);

  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const { user, session } = useAuth();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const viewIdParam = searchParams.get('view');
  const savedViewRowQuery = useSavedViewById(user?.id, viewIdParam);
  useHydrateViewFromUrl('submissions', viewIdParam, savedViewRowQuery.data ?? null, setSearchParams);

  const savedViewsList = useSavedViewsList(user?.id, 'submissions');
  const savedViewsMut = useSavedViewsMutations(user?.id);

  const submissionsFiltersTyped: SavedViewFiltersV1 = useMemo(
    () => ({
      page: 'submissions',
      v: 1,
      franchiseId: w.selectedFranchiseId || undefined,
      periodId: w.selectedPeriodId || undefined,
      eventId: w.selectedEventId || undefined,
      focusSubmissionId: w.submissionFocusId,
    }),
    [w.selectedFranchiseId, w.selectedPeriodId, w.selectedEventId, w.submissionFocusId],
  );

  const defaultSubFp = stableFiltersFingerprint(emptyFiltersForPage('submissions'));
  const suggestion = useSaveViewSuggestion('submissions', stableFiltersFingerprint(submissionsFiltersTyped), {
    disabled: false,
    isDefaultFingerprint: stableFiltersFingerprint(submissionsFiltersTyped) === defaultSubFp,
  });

  const urlApplySkip = useRef(false);

  useEffect(() => {
    if (versaoParam) {
      return;
    }
    const fid = searchParams.get('franchise');
    const pid = searchParams.get('period');
    const ev = searchParams.get('event');
    const sub = searchParams.get('submission');
    if (!w.franchisesQuery.data?.length) {
      return;
    }
    urlApplySkip.current = true;
    if (fid && w.franchisesQuery.data.some((x) => x.id === fid)) {
      w.setSelectedFranchiseId(fid);
    }
    if (pid && w.periodsQuery.data?.some((x) => x.id === pid)) {
      w.setSelectedPeriodId(pid);
    }
    if (ev) {
      w.setSelectedEventId(ev);
    }
    if (sub) {
      w.setSubmissionFocusId(sub);
    }
    queueMicrotask(() => {
      urlApplySkip.current = false;
    });
  }, [searchParams, versaoParam, w.franchisesQuery.data, w.periodsQuery.data]);

  useEffect(() => {
    if (versaoParam || urlApplySkip.current) {
      return;
    }
    setSearchParams(
      (prev) => {
        const next = applyFiltersToSearchParams('submissions', prev, submissionsFiltersTyped, { viewId: null });
        if (next.toString() === prev.toString()) {
          return prev;
        }
        return next;
      },
      { replace: true },
    );
  }, [
    submissionsFiltersTyped.franchiseId,
    submissionsFiltersTyped.periodId,
    submissionsFiltersTyped.eventId,
    submissionsFiltersTyped.focusSubmissionId,
    versaoParam,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!versaoParam) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const meta = await fetchSubmissionScopeMeta(versaoParam);
        if (cancelled || !meta) {
          return;
        }
        w.setSelectedFranchiseId(meta.franchise_id);
        w.setSelectedPeriodId(meta.reporting_period_id);
        w.setSubmissionFocusId(meta.id);
        w.setEditingSubmissionId(null);
        setVersionHistoryOpen(true);
      } catch {
        /* RLS ou id inválido: ignorar */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [versaoParam]);

  if (
    w.accessProfileQuery.isLoading ||
    w.franchisesQuery.isLoading ||
    w.periodsQuery.isLoading ||
    w.submissionsQuery.isLoading
  ) {
    return (
      <div className="page-stack submissions-page-root" data-testid="submissions-page" aria-busy="true">
        <div className="page-container__title-bar">
          <div>
            <Skeleton style={{ width: 200, height: '2rem', marginBottom: 'var(--space-2)' }} />
            <Skeleton style={{ width: 'min(640px, 94vw)', height: '1rem' }} />
          </div>
          <div className="page-container__actions">
            <Skeleton style={{ width: 140, height: 40, borderRadius: 'var(--radius-md)' }} />
          </div>
        </div>

        <section className="submission-hero submission-hero--compact card card--gold">
          <div className="submission-hero__compact-top">
            <Skeleton style={{ width: 56, height: 28, borderRadius: 999 }} />
            <Skeleton style={{ flex: '1 1 220px', minWidth: 180, height: '0.9rem' }} />
          </div>
          <div className="submission-hero__toolbar glass submissions-skeleton__toolbar">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="form-group">
                <Skeleton style={{ width: '46%', height: '0.75rem', marginBottom: 'var(--space-2)' }} />
                <Skeleton style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)' }} />
              </div>
            ))}
          </div>
        </section>

        {isNarrowMobile ? (
          <div className="submission-workbench-narrow-tabs submission-workbench-narrow-tabs--skeleton" aria-hidden>
            <div className="submission-workbench-narrow-tabs__list">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} style={{ flex: 1, height: 44, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="submission-mobile-tabs" role="presentation">
            <Skeleton style={{ flex: 1, height: 44, borderRadius: 'var(--radius-md)' }} />
            <Skeleton style={{ flex: 1, height: 44, borderRadius: 'var(--radius-md)' }} />
          </div>
        )}

        <div className="submissions-kpi-wrap">
          <div className="kpi-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <KpiCardSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="submission-workbench" data-testid="submission-workbench">
          <SubmissionCardSkeleton />
        </div>

        <Card variant="kpi">
          <div className="card__header">
            <Skeleton style={{ width: '48%', height: '1rem' }} />
          </div>
          <div className="card__body card__body--compact">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th className="align-right">Valor</th>
                    <th className="align-right">% receita</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton columns={3} lineCount={6} />
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <details
          className="submission-details submissions-skeleton__scope-table"
          open
          data-testid="submissions-scope-skeleton"
        >
          <summary className="submission-details__summary" style={{ pointerEvents: 'none' }}>
            <Skeleton style={{ width: '72%', height: '1.1rem' }} />
          </summary>
          <p className="submission-details__meta">
            <Skeleton style={{ width: '90%', height: '0.85rem' }} />
          </p>
          <div className="submission-details__body submission-details__body--flush">
            <div className="card__body card__body--compact">
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Franquia</th>
                      <th>Competência</th>
                      <th>Regional</th>
                      <th className="align-center">Versão</th>
                      <th>Status</th>
                      <th>Enviada em</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRowSkeleton columns={6} lineCount={5} />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </details>
      </div>
    );
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
      <div className="page-stack submissions-page-root" data-testid="submissions-page">
        <div className="page-container__title-bar">
          <div>
            <h1 className="page-container__title">Submissões</h1>
            <p className="page-container__subtitle">
              A unidade escolhe a competência, preenche a DRE e envia a versão oficial para revisão.
            </p>
          </div>
        </div>
        <Card variant="default">
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
        </Card>
      </div>
    );
  }

  const currentRows = w.submissionsQuery.data;
  const approvedCount = currentRows.filter((row) => row.status === 'approved').length;
  const pendingCount = currentRows.filter((row) =>
    ['submitted', 'under_review', 'pending_adjustment'].includes(row.status),
  ).length;

  return (
    <div className="page-stack submissions-page-root u-content-reveal" data-testid="submissions-page">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Submissões</h1>
          <p className="page-container__subtitle">
            Escolha franquia e competência, preencha a DRE e envie para revisão. Use o <strong>Assistente DRE</strong>{' '}
            (entrada na barra lateral) para orientação guiada.
          </p>
        </div>
        <div className="page-container__actions">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!w.resolvedFranchiseId || !w.resolvedPeriodId}
            onClick={() => setVersionHistoryOpen(true)}
          >
            <HistoryIcon size={18} aria-hidden style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
            Histórico
          </button>
          <Link
            className="btn btn--secondary"
            to={w.activeSubmissionId ? `/app/assistant?submission=${w.activeSubmissionId}` : '/app/assistant'}
          >
            Assistente DRE
          </Link>
        </div>
      </div>

      <SavedViewsBar
        page="submissions"
        views={savedViewsList.data ?? []}
        activeViewId={viewIdParam}
        currentFilters={submissionsFiltersTyped}
        shareBasePath="/app/submissions"
        onApplyView={(row) => {
          const f = parseSavedFilters('submissions', row.filters);
          setSearchParams(
            (prev) => applyFiltersToSearchParams('submissions', prev, f, { viewId: row.id }),
            { replace: true },
          );
        }}
        onClearDefault={() => {
          setSearchParams((prev) => clearFilterParams('submissions', prev), { replace: true });
        }}
        onOpenSaveDialog={() => setSaveDialogOpen(true)}
        onRename={(row, newName) => savedViewsMut.updateMutation.mutate({ id: row.id, name: newName })}
        onTogglePin={(row, pinned) => savedViewsMut.updateMutation.mutate({ id: row.id, is_pinned: pinned })}
        onDelete={(row) => savedViewsMut.deleteMutation.mutate(row.id)}
        suggestionBanner={
          suggestion.showBanner
            ? {
                show: true,
                onOpenDialog: () => setSaveDialogOpen(true),
                onDismiss: suggestion.dismissBanner,
              }
            : null
        }
      />

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
        previewSource={w.previewSource}
        previewReconciling={w.previewReconciling}
        draftSummary={w.draftValidation}
      />

      {isNarrowMobile ? (
        <Tabs
          value={w.narrowWorkbenchTab}
          onValueChange={(v: string) => {
            if (v === 'situation' || v === 'preview' || v === 'checks') {
              w.setNarrowWorkbenchTab(v);
            }
          }}
          className="submission-workbench-narrow-tabs"
          data-testid="submission-workbench-narrow-tabs"
        >
          <TabsList className="submission-workbench-narrow-tabs__list" aria-label="Secções do painel de submissão">
            <TabsTrigger value="situation" className="submission-workbench-narrow-tabs__trigger">
              Situação
            </TabsTrigger>
            <TabsTrigger value="preview" className="submission-workbench-narrow-tabs__trigger">
              Prévia
            </TabsTrigger>
            <TabsTrigger value="checks" className="submission-workbench-narrow-tabs__trigger">
              Verificações
            </TabsTrigger>
          </TabsList>
          <TabsContent value="situation" className="submission-workbench-narrow-tabs__sr-content">
            <span className="sr-only">Conteúdo em «Situação» mostrado no painel abaixo.</span>
          </TabsContent>
          <TabsContent value="preview" className="submission-workbench-narrow-tabs__sr-content">
            <span className="sr-only">Conteúdo em «Prévia» mostrado no painel abaixo.</span>
          </TabsContent>
          <TabsContent value="checks" className="submission-workbench-narrow-tabs__sr-content">
            <span className="sr-only">Conteúdo em «Verificações» mostrado no painel abaixo.</span>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="submission-mobile-tabs" role="tablist" aria-label="Secções do workspace de submissão">
          <button
            type="button"
            role="tab"
            id="tab-panel"
            aria-controls="panel-view"
            aria-selected={w.mobileWorkspaceTab === 'panel'}
            className="submission-mobile-tabs__btn"
            onClick={() => w.setMobileWorkspaceTab('panel')}
          >
            Painel
          </button>
          <button
            type="button"
            role="tab"
            id="tab-dre"
            aria-controls="dre-view"
            aria-selected={w.mobileWorkspaceTab === 'dre'}
            className="submission-mobile-tabs__btn"
            onClick={() => w.setMobileWorkspaceTab('dre')}
          >
            DRE
          </button>
        </div>
      )}

      <div
        className="submission-workbench"
        id="panel-view"
        role="tabpanel"
        {...(!isNarrowMobile ? { 'aria-labelledby': 'tab-panel' } : {})}
        data-tour-id="dre-input-grid"
        data-testid="submission-workbench"
      >
        <SubmissionWorkbenchRail
          narrowRadixTabs={isNarrowMobile}
          narrowWorkbenchTab={w.narrowWorkbenchTab}
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
          previewSource={w.previewSource}
          previewReconciling={w.previewReconciling}
          activeSubmissionLocked={w.activeSubmissionLocked}
          submissionLockMessage={w.submissionLockMessage}
          canEdit={w.canEdit}
        />
      </div>

      <SubmissionCatalogInputList
        submissionId={w.activeSubmissionId}
        lines={w.workspaceQuery.data?.inputLines ?? []}
        lineValueMap={w.effectiveLineValues}
        isFinanceController={w.isFinanceController}
        currentUserId={w.currentUserId}
        workspaceLoading={w.workspaceQuery.isLoading}
        canEditActiveSubmission={w.canEditActiveSubmission}
        inlineAssistantEnabled={inlineAssistantFeatureOn && w.assistantEnabled}
        accessToken={session?.access_token ?? null}
        onPatchLineValue={w.patchDraftLineValue}
      />

      <DreStatementSection
        rows={w.resolvedStatementRows}
        source={w.statementSource}
        drePanelActive={isNarrowMobile ? true : w.mobileWorkspaceTab === 'dre'}
        workspaceLocked={w.activeSubmissionLocked}
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

      <VersionHistoryDrawer
        open={versionHistoryOpen}
        onClose={() => {
          setVersionHistoryOpen(false);
          if (searchParams.get('versao')) {
            const next = new URLSearchParams(searchParams);
            next.delete('versao');
            setSearchParams(next, { replace: true });
          }
        }}
        franchiseId={w.resolvedFranchiseId}
        periodId={w.resolvedPeriodId}
        baselineSubmissionId={w.currentSubmission?.submission_id ?? null}
        initialCompareSubmissionId={versaoParam || null}
        activeAgentSessionId={w.agentSessionQuery.data?.id ?? null}
      />
      <SaveViewDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        page="submissions"
        draftFilters={submissionsFiltersTyped}
        defaultPinned
        isSaving={savedViewsMut.insertMutation.isPending}
        onSave={({ name, isPinned }) => {
          savedViewsMut.insertMutation.mutate(
            { page: 'submissions', name, filters: submissionsFiltersTyped, isPinned },
            {
              onSuccess: (row) => {
                setSaveDialogOpen(false);
                setSearchParams(
                  (prev) =>
                    applyFiltersToSearchParams('submissions', prev, submissionsFiltersTyped, {
                      viewId: row.id,
                    }),
                  { replace: true },
                );
              },
              onError: (e) =>
                window.alert(e instanceof Error ? e.message : 'Não foi possível guardar a vista.'),
            },
          );
        }}
      />
    </div>
  );
}
