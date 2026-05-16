/**
 * Feature flags servidor do agente DRE (rollback operacional por env).
 * Valor não definido: usa default até ativar explicitamente em `.env` / dashboard Vercel.
 */
export function dreAgentBoolFlag(envKey: string, defaultEnabled: boolean): boolean {
  const raw = process.env[envKey];
  if (raw === undefined || raw.trim().length === 0) {
    return defaultEnabled;
  }
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'on' || v === 'yes') {
    return true;
  }
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') {
    return false;
  }
  return defaultEnabled;
}
