import { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import type {
  CurrentSubmissionRow,
  DreStatementRow,
  DashboardSnapshot,
  FranchiseDashboardRow,
} from '../../shared/portal.types';
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatPeriodLabel,
  formatStatusLabel,
  getStatusVariant,
} from '../../../utils/formatters';
import { Card } from '../../../components/ui/card';
import { ScopeLayout } from '../components/ScopeLayout';
import { RecentSubmissionsCard } from '../components/RecentSubmissionsCard';

type Props = {
  snapshot: DashboardSnapshot;
  dreLines?: DreStatementRow[];
  franchiseRow?: FranchiseDashboardRow | null;
  submissionsRows?: CurrentSubmissionRow[];
};

function groupDreBySection(rows: DreStatementRow[]) {
  const map = new Map<string, DreStatementRow[]>();
  for (const row of rows) {
    const list = map.get(row.section_code) ?? [];
    list.push(row);
    map.set(row.section_code, list);
  }
  return Array.from(map.entries())
    .map(([code, lines]) => ({
      code,
      name: lines[0]?.section_name ?? code,
      order: lines[0]?.section_order ?? 0,
      lines: [...lines].sort((a, b) => a.line_order - b.line_order),
    }))
    .sort((a, b) => a.order - b.order);
}

export function FranchiseDashboardView({
  snapshot,
  dreLines,
  franchiseRow: franchiseRowProp,
  submissionsRows,
}: Props) {
  const current = franchiseRowProp ?? snapshot.latestFranchise;
  const dre = dreLines ?? snapshot.currentDre;
  const submissions = submissionsRows ?? snapshot.currentSubmissions;

  const sections = useMemo(() => groupDreBySection(dre), [dre]);

  if (!current) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <DollarSign />
        </div>
        <h3 className="empty-state__title">Sem DRE neste período</h3>
        <p className="empty-state__description">
          Quando a unidade enviar a primeira DRE, ela aparece aqui automaticamente, com a leitura consolidada do
          período.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard__content">
      <ScopeLayout
        primary={
          <div className="card card--accent">
            <div className="card__header">
              <div>
                <h2 className="card__title">DRE oficial do período</h2>
                <p className="card__subtitle">{current.franchise_name}</p>
              </div>
              <span className="badge badge--primary">{formatPeriodLabel(current.period_label)}</span>
            </div>
            <div className="card__body card__body--compact dre-section-stack">
              {sections.map((section) => {
                const inputOnly = section.lines.every((r) => r.line_type === 'input');
                return (
                  <details
                    key={section.code}
                    className="dre-section-details"
                    {...(!inputOnly ? { open: true } : {})}
                  >
                    <summary className="dre-section-details__summary">
                      <span>{section.name}</span>
                      <span className="dre-section-details__hint">{inputOnly ? 'Detalhe' : 'Destaques'}</span>
                    </summary>
                    <div className="table-shell">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Linha</th>
                            <th className="align-right">Valor</th>
                            <th className="align-right">% da receita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.lines.map((row) => (
                            <tr
                              key={`${row.section_code}-${row.line_code}`}
                              className={row.line_type !== 'input' ? 'dre-row--bold' : ''}
                            >
                              <td
                                className={
                                  row.line_code === 'ebitda_2'
                                    ? 'dre-highlight--gold'
                                    : row.line_code === 'ebitda_1'
                                      ? 'dre-highlight--success'
                                      : row.line_code === 'mc1' || row.line_code === 'mc2'
                                        ? 'dre-highlight--primary'
                                        : ''
                                }
                              >
                                {row.line_name}
                              </td>
                              <td className="align-right num-tabular">{formatCurrency(row.value_currency)}</td>
                              <td className="align-right num-tabular text-secondary">
                                {formatPercent(row.percent_of_gross_revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        }
        sidebar={
          <div className="dashboard__side">
            <Card variant="kpi" className="card--dense">
              <div className="card__header card__header--dense">
                <h3 className="card__title">Status do período</h3>
              </div>
              <div className="card__body card__body--dense-static">
                <div className="detail-list detail-list--tight">
                  <div className="detail-list__item">
                    <span className="detail-list__label">Competência</span>
                    <span className="detail-list__value competence-etiquette">
                      {formatPeriodLabel(current.period_label)}
                    </span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Status</span>
                    <span className={`status-badge status-badge--${getStatusVariant(current.submission_status)}`}>
                      <span className="status-badge__dot" />
                      {formatStatusLabel(current.submission_status)}
                    </span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Versão</span>
                    <span className="detail-list__value">
                      {(
                        submissions.find(
                          (s) =>
                            s.franchise_id === current.franchise_id &&
                            s.period_year === current.period_year &&
                            s.period_month === current.period_month,
                        ) ?? submissions[0]
                      )?.version_number ?? '—'}
                    </span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Regional</span>
                    <span className="detail-list__value">{current.regional_name}</span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Enviado em</span>
                    <span className="detail-list__value">
                      {formatDateTime(
                        (
                          submissions.find(
                            (s) =>
                              s.franchise_id === current.franchise_id &&
                              s.period_year === current.period_year &&
                              s.period_month === current.period_month,
                          ) ?? submissions[0]
                        )?.submitted_at ?? null,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <RecentSubmissionsCard rows={snapshot.currentSubmissions} className="card--dense" />
          </div>
        }
      />
    </div>
  );
}
