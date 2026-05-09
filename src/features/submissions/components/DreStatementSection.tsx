import type { DreStatementRow } from '../../shared/portal.types';
import {
  SUBMISSION_WORKSPACE_BODY_TRANSITION,
  SUBMISSION_WORKSPACE_LOCKED_BODY_CLASSES,
} from '../submissionLockUi';
import { DreStatementTable } from '../DreStatementTable';
import { Card } from '../../../components/ui/card';

export type DreStatementSectionProps = {
  rows: DreStatementRow[];
  source: 'official' | 'draft';
  drePanelActive: boolean;
  workspaceLocked?: boolean;
};

/**
 * Bloco colapsável com a tabela DRE (oficial ou prévia do rascunho).
 */
export function DreStatementSection({
  rows,
  source,
  drePanelActive,
  workspaceLocked = false,
}: DreStatementSectionProps) {
  if (!rows.length) {
    return null;
  }

  const bodyLockClass = workspaceLocked
    ? SUBMISSION_WORKSPACE_LOCKED_BODY_CLASSES
    : SUBMISSION_WORKSPACE_BODY_TRANSITION;

  return (
      <div
        id="dre-view"
        role="tabpanel"
        aria-labelledby="tab-dre"
        className={`submission-details-dre-wrap ${
        drePanelActive ? 'submission-statement-root--dre-active' : ''
      }`}
      data-testid="submission-dre-statement"
    >
      <Card variant="kpi">
        <div className="card__header">
          <div>
            <h3 className="card__title">
              {source === 'official' ? 'DRE oficial calculada' : 'DRE — pré-visualização do rascunho'}
            </h3>
            <p className="card__subtitle">
              {source === 'official'
                ? 'Quadro hierárquico calculado pelo motor após gravar o rascunho.'
                : 'Valores digitados no rascunho, agrupados como income statement até existir DRE oficial.'}
            </p>
          </div>
        </div>
        <div className={`card__body card__body--flush ${bodyLockClass}`}>
          <div className="statement-table-shell statement-table-shell--constrained">
            <DreStatementTable rows={rows} source={source} />
          </div>
        </div>
      </Card>
    </div>
  );
}
