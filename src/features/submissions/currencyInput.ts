import { toNumber } from '../../utils/formatters.js';

const currencyInputFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseCurrencyInput(rawValue: string) {
  const normalized = rawValue.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrencyInput(value: unknown) {
  const numberValue = toNumber(value);
  return numberValue ? currencyInputFormatter.format(numberValue) : '';
}
