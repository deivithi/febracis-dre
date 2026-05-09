import type { DreInputCatalogLine } from '../../shared/portal.types';
import { useLineCommentOpenCounts } from '../../../hooks/useLineComments';
import { EditorRow } from './EditorRow';

export type SubmissionCatalogInputListProps = {
  submissionId: string | null;
  lines: DreInputCatalogLine[];
  lineValueMap: Record<string, string>;
  isFinanceController: boolean;
  currentUserId: string | null;
  workspaceLoading?: boolean;
  canEditActiveSubmission: boolean;
  inlineAssistantEnabled: boolean;
  accessToken: string | null;
  onPatchLineValue: (lineCode: string, raw: string) => void;
};

/**
 * Lista de linhas editáveis do catálogo DRE para a submissão activa, com valores e U28 comentários.
 */
export function SubmissionCatalogInputList({
  submissionId,
  lines,
  lineValueMap,
  isFinanceController,
  currentUserId,
  workspaceLoading,
  canEditActiveSubmission,
  inlineAssistantEnabled,
  accessToken,
  onPatchLineValue,
}: SubmissionCatalogInputListProps) {
  const countsQuery = useLineCommentOpenCounts(submissionId);

  if (!submissionId) {
    return null;
  }

  if (workspaceLoading) {
    return (
      <section className="submission-input-catalog card" aria-label="Linhas da DRE">
        <div className="card__body">
          <div className="skeleton skeleton--card" style={{ minHeight: 120 }} />
        </div>
      </section>
    );
  }

  if (!lines.length) {
    return null;
  }

  const counts = countsQuery.data ?? {};

  return (
    <section className="submission-input-catalog card" data-testid="submission-input-catalog-comments" aria-label="Linhas da DRE e comentários">
      <div className="card__header">
        <div>
          <h3 className="card__title">Linhas de entrada · comentários</h3>
          <p className="card__subtitle">
            Edite valores monetários quando o rascunho está aberto; comentários à direita (atalho{' '}
            <kbd className="dre-assistant__kbd">C</kbd>
            ). Com <strong>U14</strong> ativo, o ícone à direita do campo traz sugestões do assistente.
          </p>
        </div>
      </div>
      <div className="card__body submission-input-catalog__body">
        <div className="editor-row-list">
          {lines.map((line) => (
            <EditorRow
              key={line.id}
              line={line}
              formattedValue={(lineValueMap[line.line_code] ?? '—').trim() || '—'}
              rawLineValue={lineValueMap[line.line_code] ?? ''}
              onLineValueChange={onPatchLineValue}
              submissionId={submissionId}
              openCommentCount={counts[line.line_code] ?? 0}
              isFinanceController={isFinanceController}
              currentUserId={currentUserId}
              canEditActiveSubmission={canEditActiveSubmission}
              inlineAssistantEnabled={inlineAssistantEnabled}
              accessToken={accessToken}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
