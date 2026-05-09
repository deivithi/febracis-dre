/**
 * Estimativa simples de tempo de leitura (PT-BR): ~200 palavras/minuto, mínimo 1 minuto.
 */
export function estimateReadingMinutes(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(words / 200));
}
