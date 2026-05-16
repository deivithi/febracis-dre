/**
 * TTL de memória persona / ISA no Postgres e sanitização breve para logs (sem texto do utilizador).
 */

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 && n <= 3650 ? n : fallback;
}

/** Dias até expiração; `null` = sem coluna expires_at aplicada pela API (comportamento legado). */
export function personaMemoryExpiresAtIso(): string | null {
  const days = parsePositiveInt(process.env.DRE_AGENT_PERSONA_TTL_DAYS, 0);
  if (days <= 0) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function isaMemoryExpiresAtIso(): string | null {
  const days = parsePositiveInt(process.env.DRE_AGENT_ISA_TTL_DAYS, 0);
  if (days <= 0) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/** Remove caracteres invisíveis / de controlo para logs e reduz comprimento sem expor texto completo. */
export function clipForOperationalLogSnippet(text: string, max = 120): string {
  const cleaned = text
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    // eslint-disable-next-line no-control-regex -- remove bytes de controlo em logs operacionais
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
  return cleaned.length ? `${cleaned.length}chars:${cleaned}` : '';
}
