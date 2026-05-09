/**
 * Cor estável por identificador (ex.: franchise_id UUID) para séries em gráficos.
 * HSL com saturação/luminosidade fixas para legibilidade em fundos claros/escuros moderados.
 */
export function colorFromFranchiseId(franchiseId: string): string {
  let h = 2166136261;
  for (let i = 0; i < franchiseId.length; i++) {
    h ^= franchiseId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 62% 46%)`;
}
