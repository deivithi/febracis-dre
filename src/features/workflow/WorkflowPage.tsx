import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
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
  reviewSubmission,
} from '../shared/portal.api';
import type { PendingReviewRow } from '../shared/portal.types';
import {
  formatSubmissionMutationError,
  isConcurrentModificationError,
} from '../submissions/submissionConcurrency';
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
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/card';
import { ApprovalQueueSkeleton } from '../../components/skeletons';
import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import { useOpenLineCommentsPanel } from '../../hooks/useLineComments';
import { WorkflowOpenLinePointsPanel } from './WorkflowOpenLinePointsPanel';
import '../submissions/SubmissionsPage.css';
import { showAppToast } from '../../lib/appToast';
import { useAccessProfile } from '../auth/useAccessProfile';
import { useAuth } from '../auth/useAuth';
import { ExportButton } from '../export/ExportButton';
import { SaveViewDialog } from '../saved-views/SaveViewDialog';
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
import { useSavedViewById, useSavedViewsList, useSavedViewsMutations } from '../../hooks/useSavedViews';
import { ApprovalKbdHintBanner } from './ApprovalKbdHintBanner';
import { ApprovalQueueTruncatedCell } from './ApprovalQueueTruncatedCell';
import { ApprovalShortcutsDialog } from './ApprovalShortcutsDialog';
import { useApprovalQueueHotkeys } from './useApprovalQueueHotkeys';
import { parseWorkflowSortFromSearchParams, sortPendingReviewsForNavigation } from './workflowQueueSort';
import { WORKFLOW_INITIAL_SORT, WORKFLOW_URL_SORT } from './workflowTableConfig';
import './WorkflowPage.css';
import '../../components/skeletons/skeleton-shared.css';

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
  const accessProfileQuery = useAccessProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramSubmissionId = searchParams.get('submission')?.trim() ?? '';
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const approvalQueueSearchRef = useRef<HTMLInputElement>(null);

  const workflowQuery = useQuery({
    queryKey: ['workflow', 'pending-reviews'],
    queryFn: fetchPendingReviews,
  });

  const rowsForMemo = workflowQuery.data ?? [];

  useEffect(() => {
    if (!paramSubmissionId || !workflowQuery.data?.length) {
      return;
    }
    const inQueue = workflowQuery.data.some((row) => row.submission_id === paramSubmissionId);
    if (inQueue) {
      setSelectedSubmissionId(paramSubmissionId);
    }
  }, [paramSubmissionId, workflowQuery.data]);

  const filteredRows = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    if (!q) {
      return rowsForMemo;
    }
    return rowsForMemo.filter((row) => {
      const blob = [
        row.franchise_name,
        row.regional_name,
        row.period_label,
        row.submission_status,
        formatPeriodLabel(row.period_label),
        String(row.gross_revenue ?? ''),
        String(row.ebitda_2 ?? ''),
        String(row.open_issues_count ?? ''),
        row.submitted_at ?? '',
        formatDateTime(row.submitted_at),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rowsForMemo, queueSearch]);

  const urlSorting = useMemo(() => parseWorkflowSortFromSearchParams(searchParams), [searchParams]);
  const navigationOrder = useMemo(
    () => sortPendingReviewsForNavigation(filteredRows, urlSorting),
    [filteredRows, urlSorting],
  );

  const effectiveSubmissionId = useMemo(() => {
    if (!workflowQuery.data) {
      return null;
    }
    if (selectedSubmissionId && filteredRows.some((r) => r.submission_id === selectedSubmissionId)) {
      return selectedSubmissionId;
    }
    return navigationOrder[0]?.submission_id ?? null;
  }, [workflowQuery.data, selectedSubmissionId, filteredRows, navigationOrder]);

  const workflowBreadcrumbSegments = useMemo(() => {
    if (workflowQuery.isLoading || workflowQuery.error || !workflowQuery.data?.length) {
      return [];
    }
    const rows = workflowQuery.data;
    const selectedRow =
      rows.find((row) => row.submission_id === effectiveSubmissionId) ?? rows[0] ?? null;
    const tail = selectedRow
      ? `${selectedRow.franchise_name} · ${formatPeriodLabel(selectedRow.period_label)}`
      : 'Fila de aprovações';
    return [
      { label: 'Portal', href: '/app/dashboard' },
      { label: 'Aprovações', href: '/app/workflow' },
      { label: tail },
    ];
  }, [workflowQuery.isLoading, workflowQuery.error, workflowQuery.data, effectiveSubmissionId]);

  useBreadcrumb(workflowBreadcrumbSegments);

  const { user } = useAuth();
  const viewIdParam = searchParams.get('view');
  const savedViewRowQuery = useSavedViewById(user?.id, viewIdParam);
  useHydrateViewFromUrl('approvals', viewIdParam, savedViewRowQuery.data ?? null, setSearchParams);
  const savedViewsList = useSavedViewsList(user?.id, 'approvals');
  const savedViewsMut = useSavedViewsMutations(user?.id);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const approvalsFiltersTyped: SavedViewFiltersV1 = useMemo(
    () => ({
      page: 'approvals',
      v: 1,
      submissionId: effectiveSubmissionId ?? undefined,
    }),
    [effectiveSubmissionId],
  );

  const defaultAppFp = stableFiltersFingerprint(emptyFiltersForPage('approvals'));
  const suggestion = useSaveViewSuggestion('approvals', stableFiltersFingerprint(approvalsFiltersTyped), {
    isDefaultFingerprint: stableFiltersFingerprint(approvalsFiltersTyped) === defaultAppFp,
  });

  const approvalsFiltersRef = useRef(approvalsFiltersTyped);
  useLayoutEffect(() => {
    approvalsFiltersRef.current = approvalsFiltersTyped;
  }, [approvalsFiltersTyped]);
  const approvalsFp = stableFiltersFingerprint(approvalsFiltersTyped);

  useEffect(() => {
    if (!workflowQuery.data?.length) {
      return;
    }
    setSearchParams(
      (prev) => {
        const next = applyFiltersToSearchParams('approvals', prev, approvalsFiltersRef.current, {
          viewId: null,
        });
        return next.toString() === prev.toString() ? prev : next;
      },
      { replace: true },
    );
  }, [approvalsFp, workflowQuery.data?.length, setSearchParams]);

  const workspaceQuery = useQuery({
    queryKey: ['workflow', 'submission-workspace', effectiveSubmissionId],
    queryFn: () => fetchSubmissionWorkspace(effectiveSubmissionId!),
    enabled: Boolean(effectiveSubmissionId),
  });

  const lineOpenCommentsQuery = useOpenLineCommentsPanel(effectiveSubmissionId);

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
      reviewSubmission(
        effectiveSubmissionId!,
        action,
        reason ?? null,
        workspaceQuery.data?.submission?.revision ?? 0,
      ),
    onSuccess: async (_data, variables) => {
      setReviewReason('');
      await refreshWorkflowData();
      if (variables.action === 'approve') {
        showAppToast({ title: 'DRE aprovada com sucesso.', variant: 'success' });
      }
    },
    onError: async (error) => {
      if (isConcurrentModificationError(error)) {
        await refreshWorkflowData();
      }
    },
  });

  const handleHotkeyApprove = useCallback(() => {
    reviewMutation.mutate({ action: 'approve', reason: reviewReason });
  }, [reviewMutation, reviewReason]);

  const handleHotkeyReturn = useCallback(() => {
    reviewMutation.mutate({ action: 'request_adjustment', reason: reviewReason });
  }, [reviewMutation, reviewReason]);

  useApprovalQueueHotkeys({
    enabled: Boolean(workflowQuery.data?.length && !workflowQuery.isLoading && !workflowQuery.error),
    activeSubmissionId: effectiveSubmissionId,
    sortedVisibleRows: navigationOrder,
    selectedSubmissionId,
    setSelectedSubmissionId,
    searchInputRef: approvalQueueSearchRef,
    reviewReason,
    onApprove: handleHotkeyApprove,
    onRequestAdjustment: handleHotkeyReturn,
    isMutationPending: reviewMutation.isPending,
    onOpenShortcuts: () => setShortcutsOpen(true),
  });

  const approvalColumns = useMemo<ColumnDef<PendingReviewRow, unknown>[]>(
    () => [
      {
        accessorKey: 'franchise_name',
        header: 'Franquia',
        cell: ({ getValue }) => <ApprovalQueueTruncatedCell text={String(getValue() ?? '')} />,
        meta: {
          tdClassName: 'approval-queue-col-franchise',
          thClassName: 'approval-queue-col-franchise',
        },
      },
      {
        accessorKey: 'regional_name',
        header: 'Regional',
        cell: ({ getValue }) => <ApprovalQueueTruncatedCell text={String(getValue() ?? '')} />,
        meta: {
          tdClassName: 'approval-queue-col-regional',
          thClassName: 'approval-queue-col-regional',
        },
      },
      {
        accessorKey: 'period_label',
        header: 'Competência',
        cell: ({ getValue }) => (
          <span className="competence-etiquette">{formatPeriodLabel(getValue() as string)}</span>
        ),
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'gross_revenue',
        id: 'gross_revenue',
        header: 'Receita',
        cell: ({ getValue }) => formatCurrency(getValue() as PendingReviewRow['gross_revenue']),
        meta: { tdClassName: 'align-right num-tabular', thClassName: 'align-right' },
      },
      {
        accessorKey: 'ebitda_2',
        header: 'EBITDA 2',
        cell: ({ getValue }) => formatCurrency(getValue() as PendingReviewRow['ebitda_2']),
        meta: { tdClassName: 'align-right num-tabular', thClassName: 'align-right' },
      },
      {
        accessorKey: 'open_issues_count',
        header: 'Pontos abertos',
        cell: ({ getValue }) => formatInteger(getValue() as number),
        meta: { tdClassName: 'align-right num-tabular', thClassName: 'align-right' },
      },
      {
        accessorKey: 'submission_status',
        id: 'submission_status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'submitted_at',
        id: 'submitted_at',
        header: 'Enviada em',
        cell: ({ getValue }) => formatDateTime(getValue() as string | null),
      },
    ],
    [],
  );

  const currentError = reviewMutation.error
    ? formatSubmissionMutationError(
        reviewMutation.error,
        'Não conseguimos concluir a ação. Tente novamente em instantes.',
      )
    : null;

  if (workflowQuery.isLoading) {
    return <ApprovalQueueSkeleton />;
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
  const selectedRow =
    navigationOrder.find((row) => row.submission_id === effectiveSubmissionId) ?? navigationOrder[0] ?? null;

  const approvalsGeneratorLabel = accessProfileQuery.data?.profile
    ? `${accessProfileQuery.data.profile.full_name} · ${accessProfileQuery.data.profile.email}`
    : 'Usuário';

  return (
    <div className="page-stack u-content-reveal workflow-approval-page">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Aprovações</h1>
          <p className="page-container__subtitle">
            Mesa de trabalho da controladoria: assuma a revisão, aprove ou devolva DREs para ajuste. Em telas de
            trabalho inferiores a 1366px o painel pode empilhar (STOP: confira nome longo nas colunas com reticências).
          </p>
        </div>
        <div className="page-container__actions">
          <ExportButton variant="approvals" rows={rows} generatorLabel={approvalsGeneratorLabel} />
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <SavedViewsBar
            page="approvals"
            views={savedViewsList.data ?? []}
            activeViewId={viewIdParam}
            currentFilters={approvalsFiltersTyped}
            shareBasePath="/app/workflow"
            onApplyView={(row) => {
              const f = parseSavedFilters('approvals', row.filters);
              setSearchParams(
                (prev) => applyFiltersToSearchParams('approvals', prev, f, { viewId: row.id }),
                { replace: true },
              );
            }}
            onClearDefault={() => {
              setSearchParams((prev) => clearFilterParams('approvals', prev), { replace: true });
              setSelectedSubmissionId(null);
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
          <SaveViewDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            page="approvals"
            draftFilters={approvalsFiltersTyped}
            defaultPinned
            isSaving={savedViewsMut.insertMutation.isPending}
            onSave={({ name, isPinned }) => {
              savedViewsMut.insertMutation.mutate(
                { page: 'approvals', name, filters: approvalsFiltersTyped, isPinned },
                {
                  onSuccess: (row) => {
                    setSaveDialogOpen(false);
                    setSearchParams(
                      (prev) =>
                        applyFiltersToSearchParams('approvals', prev, approvalsFiltersTyped, {
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
        </>
      ) : null}

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
          <div className="kpi-card__value num-tabular">{formatInteger(rows.length)}</div>
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
          <div className="kpi-card__value num-tabular">{formatInteger(issueCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Itens marcados para ajuste pelas franquias</span>
          </div>
        </div>
      </div>

      <div className="workflow-layout workflow-approval-queue">
        <Card variant="inline" data-tour-id="workflow-queue">
          <div className="card__header approval-queue-card-header">
            <div className="approval-queue-card-header__intro">
              <h3 className="card__title">Fila de aprovações</h3>
              <p className="card__subtitle">Toque numa linha ou use j/k para selecionar; Enter foca o parecer à direita.</p>
            </div>
            <div className="approval-queue-card-header__search">
              <label className="sr-only" htmlFor="approval-queue-search">
                Buscar na fila de aprovações
              </label>
              <input
                id="approval-queue-search"
                ref={approvalQueueSearchRef}
                type="search"
                autoComplete="off"
                spellCheck={false}
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="form-input approval-queue-search-input"
                placeholder="Buscar franquia, regional, competência..."
                aria-label="Buscar na fila de aprovações"
              />
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
            ) : filteredRows.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <div className="empty-state__icon">
                  <ClipboardCheck />
                </div>
                <h3 className="empty-state__title">Nenhum resultado nesta vista</h3>
                <p className="empty-state__description">
                  Nenhuma linha corresponde a «{queueSearch.trim()}». Limpe ou ajuste a busca da fila.
                </p>
              </div>
            ) : (
              <DataTable<PendingReviewRow>
                columns={approvalColumns}
                data={filteredRows}
                tableClassName="data-table--inbox"
                getRowId={(row) => row.submission_id}
                onRowClick={(row) => setSelectedSubmissionId(row.submission_id)}
                activeRowId={effectiveSubmissionId}
                initialSort={WORKFLOW_INITIAL_SORT}
                urlSort={WORKFLOW_URL_SORT}
                getRowAriaLabel={(row) =>
                  `Abrir revisão: ${row.franchise_name}, competência ${formatPeriodLabel(row.period_label)}`
                }
              />
            )}
          </div>
        </Card>

        <aside className="workflow-sidebar">
          <div className="card card--v-inline" data-tour-id="workflow-decision-panel">
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
                      <span className="detail-list__value competence-etiquette">
                        {formatPeriodLabel(selectedRow.period_label)}
                      </span>
                    </div>
                    <div className="detail-list__item">
                      <span className="detail-list__label">Status atual</span>
                      <span className="detail-list__value">{formatStatusLabel(selectedRow.submission_status)}</span>
                    </div>
                  </div>

                  <div className="form-group workflow-sidebar__notes">
                    <label className="form-label" htmlFor="review-reason">
                      Parecer da controladoria
                    </label>
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
                      <Eye size={18} aria-hidden />
                      Assumir a revisão
                    </button>
                    <button
                      type="button"
                      data-testid="workflow-approve"
                      className="btn btn--success btn--full"
                      onClick={() => reviewMutation.mutate({ action: 'approve', reason: reviewReason })}
                      disabled={reviewMutation.isPending}
                    >
                      <ShieldCheck size={18} aria-hidden />
                      Aprovar a DRE
                    </button>
                    <button
                      type="button"
                      data-testid="workflow-request-adjustment"
                      className="btn btn--danger btn--full"
                      onClick={() => reviewMutation.mutate({ action: 'request_adjustment', reason: reviewReason })}
                      disabled={reviewMutation.isPending || !reviewReason.trim()}
                    >
                      <Undo2 size={18} aria-hidden />
                      Devolver para ajuste
                    </button>
                  </div>
                </>
              ) : (
                <div className="inline-message">Escolha uma DRE da fila para abrir o painel de decisão.</div>
              )}
            </div>
          </div>

          <Card variant="default" data-tour-id="workflow-validation-panel">
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
                <div className="workflow-validation-skeleton" aria-busy="true">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="workflow-validation-skeleton__row">
                      <Skeleton className="workflow-validation-skeleton__icon" />
                      <div className="workflow-validation-skeleton__text">
                        <Skeleton style={{ width: '78%', height: '0.8rem' }} />
                        <Skeleton style={{ width: '92%', height: '0.75rem' }} />
                      </div>
                    </div>
                  ))}
                </div>
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
          </Card>

          <Card variant="default">
            <div className="card__header">
              <div>
                <h3 className="card__title">Pontos abertos (por linha)</h3>
                <p className="card__subtitle">
                  Comentários inline (U28): tópicos não resolvidos na revisão da DRE seleccionada. Pré‑requisito U07 —
                  disparo de push ainda não ligado à fila <code className="dre-assistant__code-snippet">notification_outbox</code>.
                </p>
              </div>
            </div>
            <div className="card__body">
              {!effectiveSubmissionId ? (
                <div className="inline-message">Escolha uma DRE para ver pontos por linha.</div>
              ) : (
                <WorkflowOpenLinePointsPanel
                  inputLines={workspaceQuery.data?.inputLines ?? []}
                  openThreads={lineOpenCommentsQuery.data ?? []}
                  loading={workspaceQuery.isLoading || lineOpenCommentsQuery.isLoading}
                />
              )}
            </div>
          </Card>
        </aside>
      </div>

      <ApprovalShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ApprovalKbdHintBanner onOpenShortcuts={() => setShortcutsOpen(true)} />
    </div>
  );
}
