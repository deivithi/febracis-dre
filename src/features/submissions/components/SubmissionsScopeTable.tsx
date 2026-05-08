import { FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CurrentSubmissionRow } from '../../shared/portal.types';
import { formatDateTime, formatPeriodLabel, formatStatusLabel, getStatusVariant } from '../../../utils/formatters';

type SubmissionsScopeTableProps = {
  rows: CurrentSubmissionRow[];
  activeSubmissionId: string | null;
  onSelectRow: (row: CurrentSubmissionRow) => void;
  /** Deep link para o hub `/app/assistant` (coluna opcional). */
  getAssistantHref?: (row: CurrentSubmissionRow) => string;
};

/**
 * Lista colapsável de todas as submissões no escopo do utilizador.
 */
export function SubmissionsScopeTable({ rows, activeSubmissionId, onSelectRow, getAssistantHref }: SubmissionsScopeTableProps) {
  return (
    <details className="submission-details">
      <summary className="submission-details__summary">Todas as submissões no seu escopo</summary>
      <p className="submission-details__meta">
        Clique numa linha para abrir essa franquia e competência. Recolha esta secção para focar no assistente e no
        painel lateral.
      </p>
      <div className="submission-details__body submission-details__body--flush">
        <div className="card__body card__body--compact">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <FileSpreadsheet />
              </div>
              <h3 className="empty-state__title">Nenhuma submissão encontrada</h3>
              <p className="empty-state__description">
                Quando houver uma submissão salva ou enviada dentro do seu escopo, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Franquia</th>
                    <th>Período</th>
                    <th>Regional</th>
                    <th className="align-center">Versão</th>
                    <th>Status</th>
                    <th>Submetido em</th>
                    {getAssistantHref ? <th className="align-right">Assistente</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.submission_id}
                      className={row.submission_id === activeSubmissionId ? 'data-row--active' : ''}
                      onClick={() => onSelectRow(row)}
                    >
                      <td>
                        <div className="list-row__title">{row.franchise_name}</div>
                        <div className="list-row__meta">{row.franchise_code}</div>
                      </td>
                      <td>{formatPeriodLabel(row.period_label)}</td>
                      <td>{row.regional_name}</td>
                      <td className="align-center font-mono">v{row.version_number}</td>
                      <td>
                        <span className={`status-badge status-badge--${getStatusVariant(row.status)}`}>
                          <span className="status-badge__dot" />
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(row.submitted_at)}</td>
                      {getAssistantHref ? (
                        <td className="align-right" onClick={(event) => event.stopPropagation()}>
                          <Link className="assistant-scope-link" to={getAssistantHref(row)}>
                            Abrir
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
