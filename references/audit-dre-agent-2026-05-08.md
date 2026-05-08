# Auditoria sênior — Agente DRE (`api/dre-agent.ts`)

**Data (BRT):** 08/05/2026  
**Ambiente prod verificado:** `https://febracis-dre.vercel.app` — último **`vercel inspect`** em deployment **`dpl_9GRYX3oQrPqNtqrSHbXJM4RBvWyw`** (`febracis-mvz4witu9-deivithis-projects`), estado **Ready** (também `dpl_78Q5paVibSPCrb2AMNSFg2qigCZX` na mesma rodada).

## Sumário

| Severidade | Qtd | Observações |
|------------|-----|--------------|
| **Critical** | 0 | — |
| **Major** | 5 | Chave default em bundle; rate-limit fail-open; revisão Markdown/UI; sem eval LLM; revisar ENV Vercel (newline via CLI PS) |
| **Minor** | ≥6 | streaming; Zod em `state_json`; circuit breaker rate-limit; substring legacy |

**Quick wins aplicados:** delimitadores `<<<USER_MESSAGE_*>>>`, `AgentOperationalError`, retry 800 ms, URL OpenRouter default canónica, logs JSON `{ event, latencyMs, mode, model }`, envelope HTTP com `mode` + `telemetry`, `DEFAULT_OPENAI_API_KEY` / modelo `gpt-5.4-mini`.

## Fluxo end-to-end

Rate limit opcional → `loadSessionContext` (RLS) → LangGraph (`retrieve_context` → `generate_turn` → `finalize_response`) → `sanitizeResult` → 200 JSON.

## Testes

- Governança existente + **novo** `tests/unit/dre-agent-api.test.ts` (delimitador + erros codificados).
- Gap: integration handler mock HTTP, adversarial prompts.

## FIELD_GUIDES vs migrações

Linhas adicionadas em **011** (`event_trainer_cost`, `marketing_*`) encontram entrada em `FIELD_GUIDES`; validação SQL remota recomendada.

## Validação (tabela plano)

| Check | Estado |
|-------|--------|
| lint | OK |
| vitest | OK |
| validate:settings | Falhou — sem `DRE_ADMIN_EMAIL` |
| validate:phase1:local | Falhou — sem `.env.local` Supabase |
| build | OK |
| smoke:prod strict | OK |
| playwright | Não executado |
| vercel inspect | Ready — `dpl_9GRYX3oQrPqNtqrSHbXJM4RBvWyw` (URL inspect `febracis-mvz4witu9`; alias `febracis-dre.vercel.app`) |
| doc `project-context.md` | Actualizado |

Roadmap: R1 tirar segredo do código; R2 corrigir ENV no Dashboard; R3 evals; R4 tracing; R5 índice mensagens; R6 streaming.

---

*Ver detalhe operacional em [`project-context.md`](./project-context.md) (Assistente DRE).*
