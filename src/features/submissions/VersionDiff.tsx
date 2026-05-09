import { memo, useMemo } from 'react';
import type { SubmissionSnapshotDiff } from '../../lib/diffSubmissions';
import { formatCurrency } from '../../utils/formatters';
import './VersionHistory.css';

export type VersionDiffProps = {
  diff: SubmissionSnapshotDiff;
  leftHeading: string;
  rightHeading: string;
  /** Textos de contexto (parecer / devolução / motivo) exibidos acima do diff. */
  contextBlocks?: string[];
};

function lineKindClass(kind: string) {
  if (kind === 'added') return 'version-diff__cell--pos';
  if (kind === 'removed') return 'version-diff__cell--neg';
  if (kind === 'changed') return 'version-diff__cell--chg';
  return 'version-diff__cell--same';
}

function InnerVersionDiff({ diff, leftHeading, rightHeading, contextBlocks }: VersionDiffProps) {
  const { sections, kpiDeltas } = diff;

  const kpiBlock = useMemo(() => {
    const notable = kpiDeltas.filter(
      (row) => row.delta !== null && row.delta !== 0 && (row.before !== null || row.after !== null),
    );
    if (!notable.length) return null;
    return (
      <div className="version-diff__kpi-strip">
        <span className="version-diff__kpi-title">Indicadores (motor)</span>
        <div className="version-diff__kpi-grid">
          {notable.map((row) => (
            <div key={row.key} className="version-diff__kpi-pill">
              <span className="version-diff__kpi-label">{row.label}</span>
              <span className="version-diff__kpi-values num-tabular">
                {row.before !== null ? formatCurrency(row.before) : '—'} →{' '}
                {row.after !== null ? formatCurrency(row.after) : '—'}
                {row.delta !== null ? (
                  <span
                    className={
                      row.delta > 0
                        ? 'version-diff__delta version-diff__delta--up'
                        : row.delta < 0
                          ? 'version-diff__delta version-diff__delta--down'
                          : 'version-diff__delta'
                    }
                  >
                    {' '}
                    ({row.delta > 0 ? '+' : ''}
                    {formatCurrency(row.delta)})
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [kpiDeltas]);

  return (
    <div className="version-diff">
      {contextBlocks?.length ? (
        <div className="version-diff__context">
          {contextBlocks.map((text, i) => (
            <p key={i} className="version-diff__context-p">
              {text}
            </p>
          ))}
        </div>
      ) : null}

      {kpiBlock}

      <div className="version-diff__grid-head">
        <div className="version-diff__head-muted" />
        <div className="version-diff__head-left">{leftHeading}</div>
        <div className="version-diff__head-right">{rightHeading}</div>
      </div>

      <div className="version-diff__sections">
        {sections.map((section) => (
          <section key={section.section_code || section.section_name} className="version-diff__section">
            <header className="version-diff__section-head">
              <h4 className="version-diff__section-title">{section.section_name}</h4>
              {section.section_delta_sum !== 0 ? (
                <span
                  className={
                    (section.section_delta_sum > 0
                      ? 'version-diff__section-delta version-diff__section-delta--up'
                      : 'version-diff__section-delta version-diff__section-delta--down') + ' num-tabular'
                  }
                >
                  Δ subtotal linhas: {section.section_delta_sum > 0 ? '+' : ''}
                  {formatCurrency(section.section_delta_sum)}
                </span>
              ) : (
                <span className="version-diff__section-delta version-diff__section-delta--flat">Δ subtotal: 0</span>
              )}
            </header>

            <div className="version-diff__rows">
              {section.lines.map((line) => (
                <div key={line.line_code} className={`version-diff__row version-diff__row--${line.kind}`}>
                  <div className="version-diff__line-label">
                    <span className="version-diff__line-name">{line.line_name}</span>
                    <span className="version-diff__line-code">{line.line_code}</span>
                  </div>
                  <div className={`version-diff__cell version-diff__cell--left ${lineKindClass(line.kind)}`}>
                    <span className="version-diff__val num-tabular">{line.before_label}</span>
                  </div>
                  <div className={`version-diff__cell version-diff__cell--right ${lineKindClass(line.kind)}`}>
                    <span className="version-diff__val num-tabular">{line.after_label}</span>
                  </div>
                  {line.noteParts?.length ? (
                    <div className="version-diff__notes">
                      {line.noteParts.map((part, idx) => (
                        <span
                          key={idx}
                          className={
                            part.kind === 'insert'
                              ? 'version-diff__note-insert'
                              : part.kind === 'delete'
                                ? 'version-diff__note-delete'
                                : 'version-diff__note-same'
                          }
                        >
                          {part.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export const VersionDiff = memo(InnerVersionDiff);
