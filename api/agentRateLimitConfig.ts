const DEFAULT_PER_MINUTE = 30;
const DEFAULT_WINDOW_SECONDS = 60;

function parsePositiveInt(raw: string | undefined, defaultValue: number) {
  if (raw === undefined || raw === '') return defaultValue;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return defaultValue;
  return n;
}

/**
 * Configuração do rate limit do assistente DRE (lado API serverless / Vercel).
 * Não usado no browser.
 */
export function parseAgentRateLimitEnv(): {
  enabled: boolean;
  limit: number;
  windowSeconds: number;
} {
  const enabled = process.env.AGENT_RATE_LIMIT_ENABLED !== 'false';
  return {
    enabled,
    limit: parsePositiveInt(process.env.AGENT_RATE_LIMIT_PER_MINUTE, DEFAULT_PER_MINUTE),
    windowSeconds: parsePositiveInt(process.env.AGENT_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS),
  };
}

/**
 * Valida a resposta JSON de `fn_agent_rate_check` (Supabase).
 */
export function parseRateLimitRpcResult(data: unknown): { allowed: boolean; retryAfterSeconds: number } {
  const failClosed = process.env.AGENT_RATE_LIMIT_FAIL_CLOSED === 'true';
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    if (failClosed) {
      return { allowed: false, retryAfterSeconds: 60 };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }
  const o = data as Record<string, unknown>;
  if (o.allowed === false) {
    const retry = o.retryAfterSeconds;
    const seconds = typeof retry === 'number' && Number.isFinite(retry) && retry > 0 ? Math.floor(retry) : 60;
    return { allowed: false, retryAfterSeconds: seconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
