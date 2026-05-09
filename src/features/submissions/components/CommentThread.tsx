import { useMemo } from 'react';
import type { SubmissionLineCommentRow } from '../../shared/lineComments.types';
import { renderBasicMarkdown } from '../../../utils/basicMarkdown';
import { formatAbsoluteBrt, formatRelativeTimeBrt } from '../../../utils/brtRelativeTime';

export type CommentThreadProps = {
  threads: { root: SubmissionLineCommentRow; replies: SubmissionLineCommentRow[] }[];
  /** Mostrar mesmo threads resolvidos (histórico) */
  showResolved: boolean;
  currentUserId: string | null;
  /** Abre compositor de resposta sobre o comentário */
  onReply?: (parentId: string) => void;
  onResolve?: (rootId: string, resolved: boolean) => void | Promise<void>;
  onToggleCritical?: (rootId: string, critical: boolean) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onEdit?: (id: string, text: string) => void | Promise<void>;
  isFinanceController?: boolean;
  /** Permissão por linha para resolver/reabrir tópico raíz */
  canResolveRoot?: (rootAuthorId: string, rootRow: SubmissionLineCommentRow) => boolean;
  replyBusy?: boolean;
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).slice(0, 2);
  return p.map((x) => x[0]?.toUpperCase() ?? '').join('') || '?';
}

function MessageBubble({
  row,
  isRoot,
  currentUserId,
  onReply,
  onResolve,
  onToggleCritical,
  onDelete,
  onEdit,
  isFinanceController,
  canResolveRoot,
}: {
  row: SubmissionLineCommentRow;
  isRoot: boolean;
  currentUserId: string | null;
  onReply?: CommentThreadProps['onReply'];
  onResolve?: CommentThreadProps['onResolve'];
  onToggleCritical?: CommentThreadProps['onToggleCritical'];
  onDelete?: CommentThreadProps['onDelete'];
  onEdit?: CommentThreadProps['onEdit'];
  isFinanceController?: boolean;
  canResolveRoot?: CommentThreadProps['canResolveRoot'];
}) {
  const mine = Boolean(currentUserId && row.author_id === currentUserId);
  const rel = formatRelativeTimeBrt(row.created_at);
  const abs = formatAbsoluteBrt(row.created_at);
  const canResolve = Boolean(isRoot && canResolveRoot?.(row.author_id, row));

  return (
    <div className={`comment-thread__msg ${isRoot ? 'comment-thread__msg--root' : ''}`}>
      <div className="comment-thread__avatar" aria-hidden>
        {initials(row.author_display_name)}
      </div>
      <div className="comment-thread__body">
        <div className="comment-thread__meta">
          <span className="comment-thread__name">{row.author_display_name}</span>
          <time dateTime={row.created_at} title={abs}>
            {rel}
          </time>
          {row.critical ? <span className="comment-thread__pill comment-thread__pill--critical">Crítico</span> : null}
          {isRoot && row.resolved ? <span className="comment-thread__pill comment-thread__pill--resolved">Resolvido</span> : null}
        </div>
        <div className="comment-thread__content">{renderBasicMarkdown(row.content ?? '')}</div>
        <div className="comment-thread__actions">
          {onReply ? (
            <button type="button" className="btn btn--ghost btn--compact comment-thread__action" onClick={() => onReply(row.id)}>
              Responder
            </button>
          ) : null}
          {mine && onEdit ? (
            <button
              type="button"
              className="btn btn--ghost btn--compact comment-thread__action"
              onClick={() => {
                const n = window.prompt('Editar texto do comentário', row.content);
                if (n !== null && n.trim()) void onEdit(row.id, n.trim());
              }}
            >
              Editar
            </button>
          ) : null}
          {mine && onDelete ? (
            <button type="button" className="btn btn--ghost btn--compact comment-thread__action" onClick={() => void onDelete(row.id)}>
              Remover
            </button>
          ) : null}
          {isRoot && canResolve && onResolve ? (
            <button
              type="button"
              className="btn btn--ghost btn--compact comment-thread__action"
              onClick={() => void onResolve(row.id, !row.resolved)}
            >
              {row.resolved ? 'Reabrir tópico' : 'Resolver tópico'}
            </button>
          ) : null}
          {isRoot && isFinanceController && onToggleCritical ? (
            <button
              type="button"
              className="btn btn--ghost btn--compact comment-thread__action"
              onClick={() => void onToggleCritical(row.id, !row.critical)}
            >
              {row.critical ? 'Tirar crítico' : 'Marcar crítico'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CommentThread({
  threads,
  showResolved,
  currentUserId,
  onReply,
  onResolve,
  onToggleCritical,
  onDelete,
  onEdit,
  isFinanceController,
  canResolveRoot,
  replyBusy,
}: CommentThreadProps) {
  const visible = useMemo(() => threads.filter(({ root }) => showResolved || !root.resolved), [threads, showResolved]);

  if (!visible.length) {
    return <p className="line-comments__empty">Nenhum comentário com os filtros actuais.</p>;
  }

  return (
    <div className="comment-thread" role="feed" aria-busy={replyBusy}>
      {visible.map(({ root, replies }) => (
        <div key={root.id} className="comment-thread__block">
          <MessageBubble
            row={root}
            isRoot
            currentUserId={currentUserId}
            onReply={onReply}
            onResolve={onResolve}
            onToggleCritical={onToggleCritical}
            onDelete={onDelete}
            onEdit={onEdit}
            isFinanceController={isFinanceController}
            canResolveRoot={canResolveRoot}
          />
          {replies.map((r) => (
            <MessageBubble
              key={r.id}
              row={r}
              isRoot={false}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              isFinanceController={false}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
