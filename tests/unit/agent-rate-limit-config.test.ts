import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseAgentRateLimitEnv, parseRateLimitRpcResult } from '../../api/agentRateLimitConfig';

describe('parseAgentRateLimitEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa defaults com env vazio', () => {
    vi.stubEnv('AGENT_RATE_LIMIT_ENABLED', undefined);
    vi.stubEnv('AGENT_RATE_LIMIT_PER_MINUTE', undefined);
    vi.stubEnv('AGENT_RATE_LIMIT_WINDOW_SECONDS', undefined);
    const c = parseAgentRateLimitEnv();
    expect(c.enabled).toBe(true);
    expect(c.limit).toBe(30);
    expect(c.windowSeconds).toBe(60);
  });

  it('respeita AGENT_RATE_LIMIT_ENABLED=false', () => {
    vi.stubEnv('AGENT_RATE_LIMIT_ENABLED', 'false');
    const c = parseAgentRateLimitEnv();
    expect(c.enabled).toBe(false);
  });

  it('ignora valores nao numéricos para limit e janela', () => {
    vi.stubEnv('AGENT_RATE_LIMIT_PER_MINUTE', 'not-a-number');
    vi.stubEnv('AGENT_RATE_LIMIT_WINDOW_SECONDS', '');
    const c = parseAgentRateLimitEnv();
    expect(c.limit).toBe(30);
    expect(c.windowSeconds).toBe(60);
  });
});

describe('parseRateLimitRpcResult', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fail-open quando dado nulo ou invalido', () => {
    expect(parseRateLimitRpcResult(null)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(parseRateLimitRpcResult('x')).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it('fail-closed quando AGENT_RATE_LIMIT_FAIL_CLOSED=true', () => {
    vi.stubEnv('AGENT_RATE_LIMIT_FAIL_CLOSED', 'true');
    expect(parseRateLimitRpcResult(null)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(parseRateLimitRpcResult('x')).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('interpreta bloqueio com retry', () => {
    expect(
      parseRateLimitRpcResult({
        allowed: false,
        retryAfterSeconds: 45,
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it('usa 60s de fallback se retry estiver ausente', () => {
    expect(
      parseRateLimitRpcResult({
        allowed: false,
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });
});
