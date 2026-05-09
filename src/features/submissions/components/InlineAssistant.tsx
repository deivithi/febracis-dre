import * as Popover from '@radix-ui/react-popover';
import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { formatCurrencyInput } from '../currencyInput';

export type InlineAssistantProps = {
  lineCode: string;
  currentValue: string;
  suggestedValue: number | null;
  reasoning: string;
  /** Quando true, o ícone ganha opacidade (sugestão disponível). */
  hasSuggestion: boolean;
  onAccept: (value: number) => void;
  onRefine: (value: number) => void;
  onDismiss: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
};

export function InlineAssistant({
  lineCode,
  currentValue,
  suggestedValue,
  reasoning,
  onAccept,
  onRefine,
  onDismiss,
  open,
  onOpenChange,
  loading,
  hasSuggestion,
}: InlineAssistantProps) {
  const titleId = useId();
  const [refining, setRefining] = useState(false);
  const [refineText, setRefineText] = useState('');

  useEffect(() => {
    if (!open) {
      setRefining(false);
      setRefineText('');
    }
  }, [open]);

  const formattedSuggestion =
    suggestedValue !== null && Number.isFinite(suggestedValue)
      ? formatCurrencyInput(suggestedValue)
      : '—';

  const applyRefined = useCallback(() => {
    const normalized = refineText.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    const n = Number(normalized);
    if (!Number.isFinite(n)) return;
    onRefine(n);
    onOpenChange(false);
  }, [refineText, onOpenChange, onRefine]);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-assistant__trigger btn btn--ghost btn--icon${hasSuggestion ? ' inline-assistant__trigger--visible' : ''}`}
          aria-label={`Abrir sugestão do assistente para ${lineCode}`}
          disabled={loading || !hasSuggestion}
          title="Sugestão do Assistente DRE"
        >
          <Sparkles size={14} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="inline-assistant__popover card"
          sideOffset={8}
          align="end"
          collisionPadding={16}
          aria-labelledby={titleId}
        >
          {!refining ? (
            <>
              <h4 id={titleId} className="inline-assistant__title">
                Sugestão do Assistente DRE
              </h4>
              <p className="inline-assistant__value font-mono">{formattedSuggestion}</p>
              <p className="inline-assistant__reasoning">{reasoning}</p>
              <div className="inline-assistant__actions">
                <button
                  type="button"
                  className="btn btn--gold btn--sm"
                  disabled={suggestedValue === null}
                  onClick={() => {
                    if (suggestedValue === null) return;
                    onAccept(suggestedValue);
                    onOpenChange(false);
                  }}
                >
                  Aceitar
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRefining(true)}>
                  Refinar
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    onDismiss();
                    onOpenChange(false);
                  }}
                >
                  Recusar
                </button>
              </div>
            </>
          ) : (
            <>
              <h4 id={titleId} className="inline-assistant__title">
                Ajustar valor
              </h4>
              <label className="form-label" htmlFor={`${lineCode}-refine`}>
                Valor em reais (use ponto ou vírgula)
              </label>
              <input
                id={`${lineCode}-refine`}
                className="form-input font-mono"
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyRefined();
                  }
                }}
                placeholder={
                  currentValue.trim() || (formattedSuggestion !== '—' ? formattedSuggestion : '0,00')
                }
              />
              <div className="inline-assistant__actions">
                <button type="button" className="btn btn--gold btn--sm" onClick={applyRefined}>
                  Aplicar
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRefining(false)}>
                  Voltar
                </button>
              </div>
            </>
          )}
          <Popover.Arrow className="inline-assistant__arrow" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
