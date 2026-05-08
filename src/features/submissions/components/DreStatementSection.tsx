import type { DreStatementRow } from '../../shared/portal.types';
import { DreStatementTable } from '../DreStatementTable';

type MobileWorkspaceTab = 'panel' | 'dre';

export type DreStatementSectionProps = {
  rows: DreStatementRow[];
  source: 'official' | 'draft';
  mobileWorkspaceTab: MobileWorkspaceTab;
};

/**
 * Bloco colapsável com a tabela DRE (oficial ou prévia do rascunho).
 */
export function DreStatementSection({ rows, source, mobileWorkspaceTab }: DreStatementSectionProps) {
  if (!rows.length) {
    return null;
  }

  return (
      <div
        id="dre-view"
        role="tabpanel"
        aria-labelledby="tab-dre"
        className={`submission-details-dre-wrap ${
          mobileWorkspaceTab === 'dre' ? 'submission-statement-root--dre-active' : ''
        }`}
        data-testid="submission-dre-statement"
      >
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="card__title">
              {source === 'official' ? 'DRE oficial calculada' : 'DRE — pré-visualização do rascunho'}
            </h3>
            <p className="card__subtitle">
              {source === 'official'
                ? 'Demonstração hierárquica gerada pelo motor após gravar o rascunho.'
                : 'Valores digitados no rascunho, agrupados como income statement até existir DRE oficial.'}
            </p>
          </div>
        </div>
        <div className="card__body card__body--flush">
          <div className="statement-table-shell statement-table-shell--constrained">
            <DreStatementTable rows={rows} source={source} />
          </div>
        </div>
      </div>
    </div>
  );
}
