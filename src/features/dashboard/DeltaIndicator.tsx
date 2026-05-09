import { ArrowDown, ArrowUp } from 'lucide-react';
import { formatCurrency, formatInteger, toNumber } from '../../utils/formatters';
import './DeltaIndicator.css';

export type DeltaValueMode = 'currency' | 'integer';

export type DeltaIndicatorProps = {
  /** Valor do período A (mais recente / esquerda na comparação). */
  valueA: unknown;
  /** Valor do período B (base). */
  valueB: unknown;
  mode: DeltaValueMode;
  /** Se true, aumento de A em relação a B é “bom” (verde). Se false, aumento é “ruim” (vermelho). */
  higherIsBetter: boolean;
  className?: string;
};

function formatAbsDelta(valueA: number, valueB: number, mode: DeltaValueMode): string {
  const diff = valueA - valueB;
  if (mode === 'currency') {
    const formatted = formatCurrency(Math.abs(diff));
    return diff >= 0 ? `+${formatted}` : `−${formatted}`;
  }
  const n = Math.abs(Math.round(diff));
  const formatted = formatInteger(n);
  return diff >= 0 ? `+${formatted}` : `−${formatted}`;
}

/**
 * Δ percentual e variação absoluta, com setas e cores de sucesso/perigo.
 * Base percentual: período B. Divisão por zero → traço neutro.
 */
export function DeltaIndicator({ valueA, valueB, mode, higherIsBetter, className = '' }: DeltaIndicatorProps) {
  const a = toNumber(valueA);
  const b = toNumber(valueB);

  const pct =
    b === 0 || !Number.isFinite(b)
      ? null
      : ((a - b) / Math.abs(b)) * 100;

  const neutralPct = pct === null || !Number.isFinite(pct);
  const rawPositive = a - b > 0;
  const rawNegative = a - b < 0;
  const isEqual = !rawPositive && !rawNegative;
  const isGood =
    neutralPct || isEqual ? false : higherIsBetter ? rawPositive : rawNegative;

  const neutral = neutralPct || isEqual;
  const pctLabel =
    neutralPct ? '—' : `${(pct as number) >= 0 ? '+' : ''}${(pct as number).toFixed(1).replace('.', ',')}%`;

  const rootClass = [
    'delta-indicator',
    'num-tabular',
    neutral ? 'delta-indicator--neutral' : isGood ? 'delta-indicator--success' : 'delta-indicator--danger',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const absPart = neutralPct ? '—' : formatAbsDelta(a, b, mode);

  return (
    <div className={rootClass} role="group" aria-label="Variação entre períodos">
      <span className="delta-indicator__pct" aria-hidden={neutralPct}>
        {neutralPct ? null : isEqual ? null : rawPositive ? <ArrowUp size={14} strokeWidth={2.5} /> : <ArrowDown size={14} strokeWidth={2.5} />}
        <span className="delta-indicator__pct-text">Δ {pctLabel}</span>
      </span>
      <span className={`delta-indicator__abs ${mode === 'currency' ? 'delta-indicator__abs--tabular' : ''}`}>
        ({absPart})
      </span>
    </div>
  );
}
