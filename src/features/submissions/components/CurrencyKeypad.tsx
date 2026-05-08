import { useCallback, useMemo, useState } from 'react';
import { Calculator, Delete, X } from 'lucide-react';
import { parseAssistantCurrencyReply } from '../dreAssistant';

export interface CurrencyKeypadProps {
  lineCode: string;
  lineLabel: string;
  disabled?: boolean;
  onCancel: () => void;
  /** Envio canónico para o backend, ex.: `cmd:propose_value gross_revenue 50000` */
  onPropose: (command: string) => void;
}

/**
 * Teclado numérico BR (preview R$, atalhos de escala).
 */
export function CurrencyKeypad({
  lineCode,
  lineLabel,
  disabled = false,
  onCancel,
  onPropose,
}: CurrencyKeypadProps) {
  const [raw, setRaw] = useState('');

  const previewMoney = useMemo(() => {
    const parsed = parseAssistantCurrencyReply(raw.replace(/\s/g, ''));
    if (parsed === null) {
      return '—';
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed);
  }, [raw]);

  const pressDigit = useCallback((digit: string) => {
    setRaw((prev) => {
      const parts = prev.split(',');
      const frac = parts[1];
      if (frac !== undefined && frac.length >= 2 && /^\d$/.test(digit)) {
        return prev;
      }
      return `${prev}${digit}`;
    });
  }, []);

  const pressComma = useCallback(() => {
    setRaw((prev) => (prev.includes(',') ? prev : `${prev},`));
  }, []);

  const pressBackspace = useCallback(() => {
    setRaw((prev) => prev.slice(0, -1));
  }, []);

  const applyScale = useCallback((mult: number) => {
    const base = parseAssistantCurrencyReply(raw.replace(/\s/g, '') || '0') ?? 0;
    const next = Math.round(base * mult * 100) / 100;
    const asText = Number.isInteger(next) ? String(next) : String(next).replace('.', ',');
    setRaw(asText);
  }, [raw]);

  const handlePropose = useCallback(() => {
    const amount = parseAssistantCurrencyReply(raw.replace(/\s/g, ''));
    if (amount === null) {
      return;
    }
    const amountArg = Number.isInteger(amount) ? String(Math.trunc(amount)) : String(amount);
    onPropose(`cmd:propose_value ${lineCode} ${amountArg}`);
  }, [lineCode, onPropose, raw]);

  const canPropose = parseAssistantCurrencyReply(raw.replace(/\s/g, '')) !== null;

  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

  return (
    <div
      className="currency-keypad"
      role="dialog"
      aria-modal="true"
      aria-label={`Inserir valor em reais para ${lineLabel}`}
      data-testid="currency-keypad"
    >
      <header className="currency-keypad__header">
        <div className="currency-keypad__title">
          <Calculator size={18} aria-hidden />
          <div>
            <strong>Inserir valor</strong>
            <div className="currency-keypad__subtitle">{lineLabel}</div>
          </div>
        </div>
        <button type="button" className="currency-keypad__close" onClick={onCancel} aria-label="Fechar teclado">
          <X size={18} />
        </button>
      </header>
      <div className="currency-keypad__preview" aria-live="polite">
        <span className="currency-keypad__preview-label">Pré-visualização</span>
        <span className="currency-keypad__preview-value">{previewMoney}</span>
      </div>
      <div className="currency-keypad__digits" aria-hidden>
        {keys.map((digit) => (
          <button
            key={digit}
            type="button"
            className="currency-keypad__key"
            disabled={disabled}
            onClick={() => pressDigit(digit)}
          >
            {digit}
          </button>
        ))}
        <button type="button" className="currency-keypad__key" disabled={disabled} onClick={pressComma}>
          ,
        </button>
        <button type="button" className="currency-keypad__key" disabled={disabled} onClick={() => pressDigit('0')}>
          0
        </button>
        <button
          type="button"
          className="currency-keypad__key currency-keypad__key--icon"
          disabled={disabled}
          onClick={pressBackspace}
          aria-label="Apagar último dígito"
        >
          <Delete size={18} />
        </button>
      </div>
      <div className="currency-keypad__shortcuts">
        <span className="currency-keypad__shortcuts-label">Atalhos</span>
        <button type="button" className="btn btn--ghost btn--compact" disabled={disabled} onClick={() => applyScale(1_000)}>
          × 1 mil
        </button>
        <button type="button" className="btn btn--ghost btn--compact" disabled={disabled} onClick={() => applyScale(10_000)}>
          × 10 mil
        </button>
        <button type="button" className="btn btn--ghost btn--compact" disabled={disabled} onClick={() => applyScale(100_000)}>
          × 100 mil
        </button>
      </div>
      <footer className="currency-keypad__footer">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--gold"
          data-testid="currency-keypad-propose"
          disabled={disabled || !canPropose}
          onClick={handlePropose}
        >
          Propor valor
        </button>
      </footer>
    </div>
  );
}
