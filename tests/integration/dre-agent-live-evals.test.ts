/**
 * Opcional — smoke contra `/api/dre-agent` quando `DRE_AGENT_LIVE_EVAL=1` e credenciais estão definidas.
 * Ver [`README-dre-agent-live-evals.md`](./README-dre-agent-live-evals.md).
 */
import { describe, expect, it } from 'vitest';

const live = process.env.DRE_AGENT_LIVE_EVAL === '1';

function liveEvalEnvGap(): string | null {
  if (!live) return null;
  const jwt = process.env.DRE_AGENT_EVAL_JWT?.trim();
  const sessionId = process.env.DRE_AGENT_EVAL_SESSION_ID?.trim();
  const submissionId = process.env.DRE_AGENT_EVAL_SUBMISSION_ID?.trim();
  const missing: string[] = [];
  if (!jwt) missing.push('DRE_AGENT_EVAL_JWT');
  if (!sessionId) missing.push('DRE_AGENT_EVAL_SESSION_ID');
  if (!submissionId) missing.push('DRE_AGENT_EVAL_SUBMISSION_ID');
  return missing.length ? missing.join(', ') : null;
}

function apiUrl(): string {
  const raw = process.env.DRE_AGENT_EVAL_API_URL?.trim();
  if (raw && raw.length > 0) {
    return raw.replace(/\/?$/, '');
  }
  return 'https://febracis-dre.vercel.app/api/dre-agent';
}

describe('integration: dre-agent live eval gate', () => {
  it('opt-in documentado — CI permanece verde sem credenciais', () => {
    const gap = liveEvalEnvGap();
    if (live && gap) {
      console.warn(
        `[dre-agent-live-evals] Cenários HTTP em skip: falta ${gap} — ver tests/integration/README-dre-agent-live-evals.md`,
      );
    }
    expect(true).toBe(true);
  });
});

describe.skipIf(!live)('integration: dre-agent live eval (opt-in)', () => {
  const gap = liveEvalEnvGap();
  const skipLive = gap !== null;

  it.skipIf(skipLive)('POST chat devolve ok=true com answer não vazio', async () => {
    const url = apiUrl();
    const jwt = process.env.DRE_AGENT_EVAL_JWT!.trim();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        sessionId: process.env.DRE_AGENT_EVAL_SESSION_ID!.trim(),
        submissionId: process.env.DRE_AGENT_EVAL_SUBMISSION_ID!.trim(),
        message: 'Olá — confirma em uma frase que estás no modo assistente DRE desta submissão.',
        assistantProductTab: 'duvidas',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok?: boolean;
      result?: { answer?: string };
    };
    expect(body.ok).toBe(true);
    expect(typeof body.result?.answer).toBe('string');
    expect((body.result?.answer ?? '').trim().length).toBeGreaterThan(3);
  });

  it.skipIf(skipLive)('POST com sessionId inválido devolve 404 SESSION_NOT_FOUND', async () => {
    const url = apiUrl();
    const jwt = process.env.DRE_AGENT_EVAL_JWT!.trim();
    const badSession = '00000000-0000-4000-8000-000000000099';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        sessionId: badSession,
        submissionId: process.env.DRE_AGENT_EVAL_SUBMISSION_ID!.trim(),
        message: 'Teste de sessão inválida.',
      }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('SESSION_NOT_FOUND');
  });

  it.skipIf(skipLive)('POST suggest_field com submission inexistente devolve SUBMISSION_NOT_FOUND', async () => {
    const url = apiUrl();
    const jwt = process.env.DRE_AGENT_EVAL_JWT!.trim();
    const fakeSubmission = '00000000-0000-4000-8000-0000000000aa';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        mode: 'suggest_field',
        submissionId: fakeSubmission,
        lineCode: 'gross_revenue',
        assistantProductTab: 'preencher',
      }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('SUBMISSION_NOT_FOUND');
  });
});
