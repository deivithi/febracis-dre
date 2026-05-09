import { Fragment } from 'react';
import { groupStatementBySection, statementLineKind } from './dreStatementModel';
import type { DreStatementRow } from '../shared/portal.types';
import { formatCurrency, toNumber } from '../../utils/formatters';

export interface DreStatementTableProps {
  rows: DreStatementRow[];
  source: 'official' | 'draft';
}

export function DreStatementTable({ rows, source }: DreStatementTableProps) {
  const sections = groupStatementBySection(rows);

  return (
    <div className="statement-table-wrap">
      {source === 'draft' ? (
        <p className="statement-table-wrap__banner" role="status">
          Pré-visualização local dos valores do rascunho. Salve o rascunho para a DRE oficial calculada pelo motor
          (SQL) substituir esta tabela.
        </p>
      ) : null}

      <div className="table-shell statement-table-shell">
        <table className="statement-table">
          <caption className="sr-only">Quadro do resultado: linhas por secção com valor e percentagem da RBV</caption>
          <thead>
            <tr>
              <th scope="col" className="statement-table__col-line">
                Linha
              </th>
              <th scope="col" className="statement-table__col-value">
                Valor
              </th>
              <th scope="col" className="statement-table__col-pct">
                % RBV
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.sectionCode}>
                <tr className="statement-table__section">
                  <th scope="colgroup" colSpan={3} className="statement-table__section-label">
                    {section.sectionName}
                  </th>
                </tr>
                {section.lines.map((line) => {
                  const kind = statementLineKind(line.line_type);
                  return (
                    <tr
                      key={`${line.submission_id}-${line.line_code}`}
                      className={`statement-table__row statement-table__row--${kind}`}
                    >
                      <td className="statement-table__line">
                        <span className="statement-table__line-name">{line.line_name}</span>
                      </td>
                      <td className="statement-table__value num-tabular">{formatCurrency(line.value_currency)}</td>
                      <td className="statement-table__pct num-tabular">
                        {line.percent_of_gross_revenue === null
                          ? '—'
                          : `${toNumber(line.percent_of_gross_revenue).toFixed(2).replace('.', ',')}%`}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
