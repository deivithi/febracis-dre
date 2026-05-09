import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { DreInputCatalogLine } from '../../shared/portal.types';
import { LineComments } from './LineComments';
import { InlineAssistant } from './InlineAssistant';
import { useFieldSuggestion, dismissInlineSuggestion } from '../../../hooks/useFieldSuggestion';
import { formatCurrencyInput, parseCurrencyInput } from '../currencyInput';
import { logInlineAssistantAccepted } from '../inlineAssistantTelemetry';

export type EditorRowProps = {
  line: DreInputCatalogLine;
  formattedValue: string;
  /** Valor bruto do mapa do rascunho (string monetária editável). */
  rawLineValue: string;
  onLineValueChange: (lineCode: string, raw: string) => void;
  submissionId: string;
  /** Tópicos abertos (raiz, não resolvido) nesta linha */
  openCommentCount: number;
  isFinanceController: boolean;
  currentUserId: string | null;
  canEditActiveSubmission: boolean;
  inlineAssistantEnabled: boolean;
  accessToken: string | null;
};

/**
 * Linha do catálogo de inputs da submissão com comentários inline (U28) e assistente inline (U14).
 */
export function EditorRow({
  line,
  formattedValue,
  rawLineValue,
  onLineValueChange,
  submissionId,
  openCommentCount,
  isFinanceController,
  currentUserId,
  canEditActiveSubmission,
  inlineAssistantEnabled,
  accessToken,
}: EditorRowProps) {
  const rowId = useId();
  const [panelOpen, setPanelOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const openPanel = useCallback(() => setPanelOpen(true), []);

  const catalogCurrencyEditable = line.input_mode === 'currency';
  const showCurrencyInput = canEditActiveSubmission && catalogCurrencyEditable;

  const currentNumeric = useMemo(() => parseCurrencyInput(rawLineValue), [rawLineValue]);

  const fieldSuggestion = useFieldSuggestion({
    submissionId,
    lineCode: line.line_code,
    accessToken,
    currentNumeric,
  });

  const assistantGate =
    inlineAssistantEnabled &&
    canEditActiveSubmission &&
    catalogCurrencyEditable &&
    Boolean(accessToken);

  const suggestPack = fieldSuggestion.data;
  const hasSuggestion = Boolean(
    suggestPack?.editable &&
      suggestPack.suggestedValue !== null &&
      Number.isFinite(suggestPack.suggestedValue) &&
      suggestPack.reasoning.trim().length > 0,
  );

  const showIconAlways = openCommentCount > 0;
  const badgeClass =
    openCommentCount > 0
      ? 'editor-row__badge editor-row__badge--open'
      : 'editor-row__badge editor-row__badge--muted';

  const onRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tgt = e.target as HTMLElement;
    if (tgt.closest('textarea, input, select, [contenteditable="true"]')) return;
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      openPanel();
    }
  };

  const applyNumericToRow = (value: number, source: 'accept' | 'refine') => {
    onLineValueChange(line.line_code, formatCurrencyInput(value));
    void logInlineAssistantAccepted({
      submissionId,
      lineCode: line.line_code,
      value,
      source,
    });
  };

  return (
    <div
      ref={rowRef}
      id={rowId}
      className="editor-row"
      tabIndex={0}
      data-line-code={line.line_code}
      onKeyDown={onRowKeyDown}
    >
      <div className="editor-row__main">
        <div className="editor-row__labels">
          <span className="editor-row__section">{line.section_name}</span>
          <span className="editor-row__line-name">{line.line_name}</span>
        </div>
        {showCurrencyInput ? (
          <div className="editor-row__value-cell">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="form-input editor-row__currency-input font-mono"
              aria-label={`Valor — ${line.line_name}`}
              value={rawLineValue}
              disabled={!canEditActiveSubmission}
              onChange={(e) => onLineValueChange(line.line_code, e.target.value)}
              onFocus={() => fieldSuggestion.prefetchOnFocus()}
            />
            {assistantGate ? (
              <div className="inline-assistant__host">
                <InlineAssistant
                  lineCode={line.line_code}
                  currentValue={rawLineValue}
                  suggestedValue={suggestPack?.suggestedValue ?? null}
                  reasoning={suggestPack?.reasoning ?? ''}
                  hasSuggestion={hasSuggestion}
                  loading={fieldSuggestion.isFetching}
                  open={assistantOpen}
                  onOpenChange={setAssistantOpen}
                  onAccept={(v) => applyNumericToRow(v, 'accept')}
                  onRefine={(v) => applyNumericToRow(v, 'refine')}
                  onDismiss={() => dismissInlineSuggestion(submissionId, line.line_code)}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="editor-row__value font-mono">{formattedValue}</div>
        )}
        <div className="editor-row__actions">
          <button
            type="button"
            className={`btn btn--ghost btn--icon editor-row__comment-btn${showIconAlways ? '' : ' editor-row__comment-btn--hover-only'}`}
            aria-label={`Comentários inline em ${line.line_name}`}
            title="Comentários na linha — atalho C com a linha focada"
            onClick={() => setPanelOpen(true)}
          >
            <MessageSquare size={18} aria-hidden />
            {openCommentCount > 0 ? <span className={badgeClass}>{openCommentCount}</span> : null}
          </button>
        </div>
      </div>
      {panelOpen ? (
        <div className="editor-row__panel-wrap">
          <LineComments
            submissionId={submissionId}
            lineCode={line.line_code}
            lineLabel={line.line_name}
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            unresolvedRootCount={openCommentCount}
            isFinanceController={isFinanceController}
            currentUserId={currentUserId}
          />
        </div>
      ) : null}
    </div>
  );
}
