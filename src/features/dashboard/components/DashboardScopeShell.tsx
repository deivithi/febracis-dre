import { Clock3 } from 'lucide-react';
import type { ReactNode } from 'react';
import '../DashboardPage.css';

const CALLOUT_STORAGE = 'febracis-dre.dashboardCallout.collapsed';

type Props = {
  /** Título visível para leitores de ecrã (h1). */
  pageTitleSr?: string;
  scopeBadgeLabel: string;
  periodLabel: string;
  freshnessText?: string | null;
  /** Export / ações à direita. */
  actions: ReactNode;
  children?: ReactNode;
};

/**
 * Cabeçalho compacto unificado: escopo + competência + frescura + export.
 */
export function DashboardScopeShell({
  pageTitleSr = 'Painel executivo',
  scopeBadgeLabel,
  periodLabel,
  freshnessText,
  actions,
  children,
}: Props) {
  return (
    <header className="dashboard-scope-shell">
      <h1 className="dashboard-scope-shell__sr-only">{pageTitleSr}</h1>
      <div className="dashboard-scope-shell__row">
        <div className="dashboard-scope-shell__left">
          <span className="badge badge--gold dashboard-scope-shell__scope-badge" title={scopeBadgeLabel}>
            {scopeBadgeLabel}
          </span>
          <div className="dashboard-scope-shell__period-block">
            <span className="dashboard-scope-shell__comp-label">Competência</span>
            <span className="dashboard-scope-shell__comp-value">{periodLabel}</span>
            {freshnessText ? (
              <span className="dashboard-scope-shell__fresh" role="status" aria-live="polite">
                <Clock3 size={14} aria-hidden />
                {freshnessText}
              </span>
            ) : null}
          </div>
        </div>
        <div className="dashboard-scope-shell__actions">{actions}</div>
      </div>
      {children}
    </header>
  );
}

export { CALLOUT_STORAGE };
