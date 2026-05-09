import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSubmissionVersionsForPeriod,
  fetchSubmissionWorkspace,
  formatApiError,
  restoreSubmissionInputsFromVersion,
} from '../shared/portal.api';
import type { SubmissionVersionSummaryRow } from '../shared/portal.types';
import { formatDateTime, formatStatusLabel } from '../../utils/formatters';
import { buildSubmissionSnapshotDiff } from '../../lib/diffSubmissions';
import { EDITABLE_SUBMISSION_STATUSES } from './submissionStatus';
import { VersionDiff } from './VersionDiff';
import './VersionHistory.css';
import { invalidateSubmissionRelatedQueries } from './submissionQuerySync';

export type VersionHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  franchiseId: string;
  periodId: string;
  /** Submissão “atual” da competência (normalmente `vw_current_submissions.submission_id`). */
  baselineSubmissionId: string | null;
  /** Abrir já com uma versão selecionada (ex.: query `?versao=`). */
  initialCompareSubmissionId?: string | null;
  activeAgentSessionId?: string | null;
};

function versionTimelineLabel(row: SubmissionVersionSummaryRow): string {
  switch (row.status) {
    case 'approved':
      return 'Aprovada';
    case 'submitted':
    case 'under_review':
      return 'Enviada';
    case 'pending_adjustment':
      return 'Devolvida';
    case 'draft':
    case 'reopened':
      return row.version_number <= 1 ? 'Criada' : 'Rascunho';
    case 'superseded':
      return 'Substituída';
    case 'closed':
      return 'Fechada';
    default:
      return formatStatusLabel(row.status);
  }
}

function collectContextBlocksFromWorkspace(
  compareWorkspace: Awaited<ReturnType<typeof fetchSubmissionWorkspace>> | undefined,
): string[] {
  if (!compareWorkspace?.submission) return [];

  const blocks: string[] = [];

  const adjust = compareWorkspace.history.filter((h) => h.to_status === 'pending_adjustment' && h.reason);
  for (const h of adjust) {
    blocks.push(`Devolução / ajuste: ${h.reason}`);
  }

  const reviewIssues = compareWorkspace.issues.filter(
    (i) => i.issue_type === 'review_adjustment' && i.status !== 'dismissed',
  );
  for (const i of reviewIssues) {
    blocks.push(`Parecer: ${i.description}`);
  }

  return [...new Set(blocks)];
}

export function VersionHistoryDrawer({
  open,
  onClose,
  franchiseId,
  periodId,
  baselineSubmissionId,
  initialCompareSubmissionId,
  activeAgentSessionId = null,
}: VersionHistoryDrawerProps) {
  const queryClient = useQueryClient();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const versionsQuery = useQuery({
    queryKey: ['submission-versions', franchiseId, periodId],
    queryFn: () => fetchSubmissionVersionsForPeriod(franchiseId, periodId),
    enabled: open && Boolean(franchiseId && periodId),
  });

  useEffect(() => {
    if (!open) return;
    const rows = versionsQuery.data;
    if (!rows?.length) return;

    if (initialCompareSubmissionId && rows.some((r) => r.id === initialCompareSubmissionId)) {
      setSelectedSubmissionId(initialCompareSubmissionId);
      return;
    }

    if (baselineSubmissionId) {
      const older = rows.find((r) => r.id !== baselineSubmissionId);
      setSelectedSubmissionId(older?.id ?? rows[0]?.id ?? null);
      return;
    }

    setSelectedSubmissionId(rows[0]?.id ?? null);
  }, [open, versionsQuery.data, initialCompareSubmissionId, baselineSubmissionId]);

  const baselineWorkspace = useQuery({
    queryKey: ['submission-workspace', baselineSubmissionId],
    queryFn: () => fetchSubmissionWorkspace(baselineSubmissionId!),
    enabled: open && Boolean(baselineSubmissionId),
  });

  const compareWorkspace = useQuery({
    queryKey: ['submission-workspace', selectedSubmissionId],
    queryFn: () => fetchSubmissionWorkspace(selectedSubmissionId!),
    enabled: open && Boolean(selectedSubmissionId) && selectedSubmissionId !== baselineSubmissionId,
  });

  const snapshotDiff = useMemo(() => {
    if (!baselineSubmissionId || !selectedSubmissionId || selectedSubmissionId === baselineSubmissionId) {
      return null;
    }
    const left = compareWorkspace.data;
    const right = baselineWorkspace.data;
    if (!left?.submission || !right?.submission) return null;
    return buildSubmissionSnapshotDiff(left.inputLines, right.inputLines, left.kpis, right.kpis);
  }, [baselineSubmissionId, selectedSubmissionId, compareWorkspace.data, baselineWorkspace.data]);

  const contextBlocks = useMemo(
    () => collectContextBlocksFromWorkspace(compareWorkspace.data),
    [compareWorkspace.data],
  );

  const canRestore =
    Boolean(baselineSubmissionId && selectedSubmissionId && selectedSubmissionId !== baselineSubmissionId) &&
    Boolean(baselineWorkspace.data?.submission?.status) &&
    EDITABLE_SUBMISSION_STATUSES.has(baselineWorkspace.data!.submission!.status);

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!baselineSubmissionId || !selectedSubmissionId) {
        throw new Error('Selecione uma versão para restaurar.');
      }
      return restoreSubmissionInputsFromVersion(baselineSubmissionId, selectedSubmissionId);
    },
    onSuccess: async () => {
      setConfirmRestore(false);
      await invalidateSubmissionRelatedQueries(queryClient, {
        activeSubmissionId: baselineSubmissionId,
        agentSessionId: activeAgentSessionId,
        franchiseId,
        periodId,
      });
    },
  });

  const copyShareLink = useCallback(() => {
    if (!selectedSubmissionId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('versao', selectedSubmissionId);
    void navigator.clipboard.writeText(url.toString());
  }, [selectedSubmissionId]);

  if (!open) return null;

  return (
    <>
      <div
        className="version-history-backdrop"
        role="presentation"
        aria-hidden
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />
      <aside className="version-history-panel" aria-label="Histórico de versões da submissão">
        <header className="version-history-header">
          <div>
            <h2 className="version-history-title">Histórico de versões</h2>
            <p className="version-history-sub">Compare linhas da DRE entre versões persistidas na competência.</p>
          </div>
          <button type="button" className="version-history-close" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="version-history-body">
          <div className="version-history-list-wrap">
            {versionsQuery.isLoading ? (
              <p className="version-history-hint" style={{ padding: '0.75rem' }}>
                Carregando versões…
              </p>
            ) : versionsQuery.error ? (
              <p className="inline-message inline-message--danger" style={{ margin: '0.75rem' }}>
                {formatApiError(versionsQuery.error, 'Não foi possível listar versões.')}
              </p>
            ) : (
              <ul className="version-history-list">
                {(versionsQuery.data ?? []).map((row: SubmissionVersionSummaryRow) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={
                        'version-history-item' +
                        (row.id === selectedSubmissionId ? ' version-history-item--active' : '')
                      }
                      onClick={() => setSelectedSubmissionId(row.id)}
                    >
                      <strong>
                        v{row.version_number} · {versionTimelineLabel(row)}
                      </strong>
                      <span className="version-history-item-meta">
                        {formatDateTime(row.created_at)} · {formatStatusLabel(row.status)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="version-history-detail">
            {!baselineSubmissionId ? (
              <p className="version-history-hint">Não há submissão corrente nesta competência para comparar.</p>
            ) : !selectedSubmissionId || selectedSubmissionId === baselineSubmissionId ? (
              <p className="version-history-hint">Selecione uma versão anterior para ver o diff em relação à atual.</p>
            ) : compareWorkspace.isLoading || baselineWorkspace.isLoading ? (
              <p className="version-history-hint">Carregando snapshot da versão…</p>
            ) : compareWorkspace.error || baselineWorkspace.error ? (
              <p className="inline-message inline-message--danger">
                {formatApiError(compareWorkspace.error ?? baselineWorkspace.error, 'Erro ao carregar comparação.')}
              </p>
            ) : snapshotDiff ? (
              <>
                <div className="version-history-actions">
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => copyShareLink()}>
                    Copiar link desta versão
                  </button>
                  <button
                    type="button"
                    className="btn btn--gold btn--sm"
                    disabled={!canRestore || restoreMutation.isPending}
                    onClick={() => setConfirmRestore(true)}
                  >
                    Restaurar esta versão
                  </button>
                </div>
                <VersionDiff
                  diff={snapshotDiff}
                  leftHeading={
                    compareWorkspace.data?.submission
                      ? `v${compareWorkspace.data.submission.version_number} (selecionada)`
                      : 'Versão selecionada'
                  }
                  rightHeading={
                    baselineWorkspace.data?.submission
                      ? `v${baselineWorkspace.data.submission.version_number} (atual)`
                      : 'Atual'
                  }
                  contextBlocks={contextBlocks}
                />
              </>
            ) : null}
          </div>
        </div>
      </aside>

      {confirmRestore ? (
        <div className="modal-backdrop" style={{ zIndex: 400 }} role="presentation" onClick={() => setConfirmRestore(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-version-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h3 id="restore-version-title" className="modal__title">
                Restaurar valores da versão?
              </h3>
              <button type="button" className="modal__close" onClick={() => setConfirmRestore(false)} aria-label="Fechar">
                ×
              </button>
            </div>
            <div className="modal__body">
              <p>
                Os valores de entrada da <strong>versão atual</strong> serão substituídos pelos da versão selecionada.
                Esta ação só é permitida com a submissão em estado editável (rascunho, reaberta ou ajuste pendente).
              </p>
              {restoreMutation.error ? (
                <p className="inline-message inline-message--danger">{formatApiError(restoreMutation.error, 'Erro')}</p>
              ) : null}
            </div>
            <div className="modal__footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setConfirmRestore(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--gold"
                disabled={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate()}
              >
                {restoreMutation.isPending ? 'Restaurando…' : 'Confirmar restauração'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
