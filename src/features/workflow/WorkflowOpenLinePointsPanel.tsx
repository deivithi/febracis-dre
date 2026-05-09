import { useMemo } from 'react';
import type { DreInputCatalogLine } from '../shared/portal.types';
import type { SubmissionLineCommentRow } from '../shared/lineComments.types';

export function WorkflowOpenLinePointsPanel({
  inputLines,
  openThreads,
  loading,
}: {
  inputLines: DreInputCatalogLine[];
  openThreads: SubmissionLineCommentRow[];
  loading: boolean;
}) {
  const nameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of inputLines) {
      m.set(l.line_code, l.line_name);
    }
    return m;
  }, [inputLines]);

  const criticalCount = useMemo(() => openThreads.filter((t) => t.critical).length, [openThreads]);

  if (loading) {
    return <div className="skeleton skeleton--card" />;
  }

  return (
    <div>
      <p className="card__subtitle" style={{ marginTop: 0 }}>
        Comentários inline por linha (U28) — agregado de tópicos não resolvidos e críticos para apoiar a revisão.
        {criticalCount > 0 ? (
          <>
            {' '}
            <strong>{criticalCount}</strong> crítico(s).
          </>
        ) : null}
      </p>
      {openThreads.length === 0 ? (
        <div className="inline-message">Nenhum comentário aberto por linha nesta submissão.</div>
      ) : (
        <div className="workflow-open-points" role="list">
          {openThreads.map((row) => (
            <div key={row.id} className="workflow-open-points__item" role="listitem">
              <span className="workflow-open-points__line">{nameByCode.get(row.line_code) ?? row.line_code}</span>
              <span className="workflow-open-points__excerpt">{row.content}</span>
              <div className="workflow-open-points__tags">
                {row.critical ? <span className="comment-thread__pill comment-thread__pill--critical">Crítico</span> : null}
                <span className="workflow-open-points__tag-muted">Em aberto</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
