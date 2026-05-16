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

## Verificações automáticas (UI)

- **RTL / Testing Library:** o repositório **não** inclui `@testing-library/react` em `devDependencies` (Vitest + Playwright cobrem outras camadas). Itens de teste de componente dependentes de RTL permanecem **fora de escopo** até decisão de adicionar a dependência.

## Deploy produção (registo)

- **17/05/2026 BRT (agent6 — hub progresso + onde paramos + avisos):** GitHub `main` **`8608840`**; Vercel **`dpl_6L5Sh2FnkjehSXLTVx7uCaE5XAPG`** (READY); snapshot `https://febracis-gylx6dkk6-deivithis-projects.vercel.app`; alias `https://febracis-dre.vercel.app`; inspect `https://vercel.com/deivithis-projects/febracis-dre/6L5Sh2FnkjehSXLTVx7uCaE5XAPG`. PRD **2.2-agent6**: ordem determinística status antes de continuação; UI hub com barra de progresso e mensagens de gravação.
- **16/05/2026 BRT (agent5 — etapa NL + faixa + pools de copy):** GitHub `main` **`3078208`**; Vercel **`dpl_E4f8LF2xiPRaRmxdYGNoG7z6ovbd`** (READY); snapshot `https://febracis-msd4c7hzs-deivithis-projects.vercel.app`; alias `https://febracis-dre.vercel.app`; inspect `https://vercel.com/deivithis-projects/febracis-dre/E4f8LF2xiPRaRmxdYGNoG7z6ovbd`. PRD **2.2-agent5**: ramo `guided_where_am_i_nl`; supressão inteligente da faixa de realinho; `ASSISTANT_FALLBACK_COPY_VARIANTS`; testes `dreAssistant.continuation`, `fallback-copy-variants`.
- **16/05/2026 BRT (agent4 UX — hub assistant + continuação):** GitHub `main` **`7fa1906`**; Vercel **`dpl_5HHLJYoge2b4hTuUnEviNPvGXzoi`** (READY); snapshot `https://febracis-6h9cscmlj-deivithis-projects.vercel.app`; alias `https://febracis-dre.vercel.app`; inspect `https://vercel.com/deivithis-projects/febracis-dre/5HHLJYoge2b4hTuUnEviNPvGXzoi`. PRD **2.2-agent4**: hub `/app/assistant` minimal (segmentos + chat; sem breadcrumb/escopo nesta rota); continuação guiada antes de off-topic (`continue_guided`); banner de realinho só se a bolha ainda não cobre o passo; testes unit `dreAssistant.continuation.test.ts`.
- **16/05/2026 BRT (agent3 UX):** GitHub `main` **`c425afe`**; Vercel **`dpl_7AEFxJnBfQgHZ2aiZeps9oCpLGyo`** (READY); snapshot `https://febracis-lnvs5i9io-deivithis-projects.vercel.app`; alias `https://febracis-dre.vercel.app`; inspect `https://vercel.com/deivithis-projects/febracis-dre/7AEFxJnBfQgHZ2aiZeps9oCpLGyo`. PRD **2.2-agent3** (bolhas, painel guiado recolhível, `pickFallbackCopy`, fallback LLM sem sufixo técnico ao utilizador).
- **16/05/2026 BRT:** GitHub `main` **`67a344f`**; Vercel **`dpl_AmC9b7gV4CexdSTFMp4zgrsbeyfn`** (READY); URL snapshot `https://febracis-9knxypuvo-deivithis-projects.vercel.app`; alias `https://febracis-dre.vercel.app`; inspect `https://vercel.com/deivithis-projects/febracis-dre/AmC9b7gV4CexdSTFMp4zgrsbeyfn`.
