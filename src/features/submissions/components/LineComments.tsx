import { useCallback, useEffect, useMemo, useState } from 'react';
import { groupLineCommentsByThread, useLineComments } from '../../../hooks/useLineComments';
import type { SubmissionLineCommentRow } from '../../shared/lineComments.types';
import { CommentThread } from './CommentThread';

export type LineCommentFilter = 'all' | 'unresolved' | 'critical';

export type LineCommentsProps = {
  submissionId: string;
  lineCode: string;
  lineLabel: string;
  open: boolean;
  onClose: () => void;
  /** Tópicos não resolvidos nesta linha (badge persistente na grelha). */
  unresolvedRootCount?: number;
  isFinanceController: boolean;
  currentUserId: string | null;
};

function applyFilter(threads: ReturnType<typeof groupLineCommentsByThread>, f: LineCommentFilter) {
  if (f === 'all') return threads;
  if (f === 'unresolved') return threads.filter(({ root }) => !root.resolved);
  return threads.filter(({ root }) => root.critical);
}

function countFiltered(threads: ReturnType<typeof groupLineCommentsByThread>, f: LineCommentFilter) {
  return applyFilter(threads, f).length;
}

export function LineComments({
  submissionId,
  lineCode,
  lineLabel,
  open,
  onClose,
  unresolvedRootCount = 0,
  isFinanceController,
  currentUserId,
}: LineCommentsProps) {
  const [filter, setFilter] = useState<LineCommentFilter>('unresolved');
  const [showResolved, setShowResolved] = useState(false);
  const [composer, setComposer] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
    createMutation,
    replyMutation,
    resolveMutation,
    criticalMutation,
    deleteMutation,
    editMutation,
  } = useLineComments(submissionId, lineCode, open);

  useEffect(() => {
    if (!open) {
      setComposer('');
      setReplyTo(null);
    }
  }, [open]);

  const threadsAll = useMemo(() => groupLineCommentsByThread(rows), [rows]);
  const threadsFiltered = useMemo(() => applyFilter(threadsAll, filter), [threadsAll, filter]);

  const filteredCount = countFiltered(threadsAll, filter);

  const busy =
    createMutation.isPending ||
    replyMutation.isPending ||
    resolveMutation.isPending ||
    criticalMutation.isPending ||
    deleteMutation.isPending ||
    editMutation.isPending;

  const submitComposer = useCallback(async () => {
    const text = composer.trim();
    if (!text) return;
    if (replyTo) {
      await replyMutation.mutateAsync({ parentId: replyTo, content: text });
    } else {
      await createMutation.mutateAsync({ content: text, critical: false });
    }
    setComposer('');
    setReplyTo(null);
  }, [composer, replyTo, createMutation, replyMutation]);

  const canResolveRoot = useCallback(
    (_rootAuthorId: string, root: SubmissionLineCommentRow) =>
      Boolean(isFinanceController || (currentUserId !== null && root.author_id === currentUserId)),
    [currentUserId, isFinanceController],
  );

  if (!open) return null;

  return (
    <div className="line-comments-drawer card" role="dialog" aria-label={`Comentários em ${lineLabel}`}>
      <div className="line-comments-drawer__head">
        <div>
          <h4 className="line-comments-drawer__title">{lineLabel}</h4>
          <p className="line-comments-drawer__subtitle">
            Discussão inline nesta linha · abertos nesta linha:{' '}
            <strong className="line-comments-drawer__count-open">{unresolvedRootCount}</strong>
            {' · '}com filtro actual:{' '}
            <strong>{filteredCount}</strong>
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--compact line-comments-drawer__close" onClick={onClose}>
          Fechar
        </button>
      </div>

      <div className="line-comments__filters" role="toolbar" aria-label="Filtro de comentários">
        <span className="line-comments__filter-label">Mostrar lista:</span>
        {([
          ['unresolved', 'Não resolvidos'],
          ['critical', 'Apenas críticos'],
          ['all', 'Todos'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn btn--ghost btn--compact${filter === value ? ' line-comments__chip--active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
        <label className="line-comments__toggle">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Incluir tópicos resolvidos na lista (histórico)
        </label>
      </div>

      {replyTo ? (
        <p className="line-comments__replying">
          A responder ao comentário seleccionado.{' '}
          <button type="button" className="btn btn--ghost btn--compact" onClick={() => setReplyTo(null)}>
            Cancelar resposta
          </button>
        </p>
      ) : null}

      {isLoading ? <div className="skeleton skeleton--card line-comments__skeleton" /> : null}
      {isError ? (
        <div className="inline-message inline-message--danger">Não foi possível carregar os comentários desta linha.</div>
      ) : null}

      {!isLoading && !isError ? (
        <CommentThread
          threads={threadsFiltered}
          showResolved={showResolved}
          currentUserId={currentUserId}
          replyBusy={busy}
          isFinanceController={isFinanceController}
          canResolveRoot={canResolveRoot}
          onReply={(parentId) => setReplyTo(parentId)}
          onResolve={(rootId, resolved) => resolveMutation.mutateAsync({ rootId, resolved })}
          onToggleCritical={
            isFinanceController ? (rootId, critical) => criticalMutation.mutateAsync({ rootId, critical }) : undefined
          }
          onDelete={(id) => deleteMutation.mutateAsync(id)}
          onEdit={(id, text) => editMutation.mutateAsync({ id, content: text })}
        />
      ) : null}

      <div className="line-comments__composer">
        <textarea
          className="form-input line-comments__textarea"
          rows={3}
          placeholder={
            replyTo ? 'Escreva a resposta… (negrito **texto**, *itálico*, [titulo](https://…))' : 'Novo comentário…'
          }
          value={composer}
          disabled={busy}
          onChange={(e) => setComposer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submitComposer();
            }
          }}
        />
        <button type="button" className="btn btn--gold line-comments__send" disabled={busy || !composer.trim()} onClick={() => void submitComposer()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
