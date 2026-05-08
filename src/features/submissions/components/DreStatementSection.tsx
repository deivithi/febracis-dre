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
      className={`submission-details-dre-wrap ${
        mobileWorkspaceTab === 'dre' ? 'submission-statement-root--dre-active' : ''
      }`}
      data-testid="submission-dre-statement"
    >
      <details className="submission-details" open>
        <summary className="submission-details__summary">
          {source === 'official' ? 'DRE oficial calculada' : 'DRE — pré-visualização do rascunho'}
        </summary>
        <p className="submission-details__meta">
          {source === 'official'
            ? 'Demonstração hierárquica gerada pelo motor após gravar o rascunho (MC1, MC2, EBITDA 1 e EBITDA 2).'
            : 'Valores digitados no rascunho, agrupados como income statement até existir DRE oficial no servidor.'}
        </p>
        <div className="submission-details__body">
          <DreStatementTable rows={rows} source={source} />
        </div>
      </details>
    </div>
  );
}
