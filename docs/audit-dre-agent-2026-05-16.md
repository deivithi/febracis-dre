# Auditoria técnica — Agente DRE (16/05/2026 BRT)

## Âmbito

Revisão incremental ao plano «Agente DRE — atualização integral»: camada API (`api/dre-agent.ts`), privacidade/TTL (`api/agentTurnPrivacy.ts`), contexto e prompts (`dreAgentContext.ts`, `dreAssistant.ts`), migração Postgres **024**, testes Vitest e documentação PRD §9.5–§9.7.

## Achados principais

| Área | Estado | Notas |
|------|--------|-------|
| RLS / histórico DRE | Melhorado | Vista `vw_agent_historical_dre_context` com `security_invoker`; RPC histórico em **SECURITY INVOKER** — alinhado a «sem bypass» das políticas base. |
| Memória persona / ISA | Melhorado | TTL opcional via `DRE_AGENT_PERSONA_TTL_DAYS` / `DRE_AGENT_ISA_TTL_DAYS`; filtro `expires_at` na leitura. |
| Prompt injection / texto não confiável | Mitigado | `sanitizeUntrustedAgentTextSnippet` em FTS e linhas persona compactas antes do prompt; doutrina institucional limitada a `PROMPT_INSTITUCIONAL_FEBRACIS_LINES` (sem métricas voláteis inventadas). |
| Observabilidade | Melhorado | `dre_agent_turn_ok` com campos de contenção, histórico e flags; snippets de log via `clipForOperationalLogSnippet`. |
| Digest feedback | Novo | `fn_agent_weekly_feedback_digest` para agregação declarativa (7 dias). |

## Riscos residuais

- Avaliação comportamental completa continua dependente do harness YAML + CI (PRD §9-bis.6).
- Eval live HTTP é **opt-in** (`DRE_AGENT_LIVE_EVAL=1`) — não substitui monitorização de produção.

## Referências

- [`docs/PRD-canonical.md`](PRD-canonical.md) §9.5–§9.7  
- [`docs/agente-persona-febracis.md`](agente-persona-febracis.md)  
- [`supabase/migrations/024_agent_security_invoker_and_digest.sql`](../supabase/migrations/024_agent_security_invoker_and_digest.sql)
