# Auditoria de segurança e qualidade estrutural — febracis-dre

**Data:** 28/03/2026 (BRT)  
**Âmbito:** Repositório `febracis-dre` (React/Vite SPA, `api/dre-agent.ts` na Vercel, Supabase Postgres + RLS, Edge Function `admin-provision-user`).  
**Metodologia:** Revisão estática de código e configuração; `npm audit`; alinhamento com `references/project-context.md` e migrations em `supabase/migrations/`. Não inclui pentest externo nem testes de intrusão em produção.

---

## Resumo executivo

O portal segue uma **arquitetura defensível**: autenticação Supabase no cliente e na API do assistente via **Bearer JWT** propagado ao cliente Supabase com `anon` key; **RLS** aplicada às tabelas sensíveis, com funções `security definer` para escopo (`can_access_franchise`, `is_admin`, `can_manage_review`). O assistente DRE aplica **validação de atualizações de campo**, modo `explain_only` no servidor e pós-processamento de resposta (métricas, códigos internos).

**Principais lacunas:** ausência de **CSP / cabeçalhos de segurança HTTP** explícitos na Vercel; **CORS permissivo** (`*`) na função de provisionamento; **sem limite superior** no tamanho da mensagem do utilizador na API do agente (custo/DoS lógico); ficheiros de UI/lógica muito grandes (manutenibilidade). **Dependências:** `npm audit` reportou **0 vulnerabilidades** no momento da auditoria.

**Conclusão:** Postura **profissional** para uma aplicação SaaS interna/parceiros, com **Supabase RLS como barreira principal**. Recomenda-se reforço de **defesa em profundidade** (validação explícita `session.submission_id === submissionId`, limites de payload, headers) e **hardening** da função admin.

---

## Inventário de superfícies

| Superfície | Descrição |
|------------|-----------|
| SPA | Rotas públicas `/`, `/login`; área `/app/*` com `ProtectedRoute` e `allowedRoles` em `src/App.tsx` + `src/router/ProtectedRoute.tsx`. |
| API serverless | `POST` apenas em `api/dre-agent.ts`; exige `Authorization`; corpo validado com Zod (`sessionId`, `submissionId`, `message`). |
| Supabase Edge | `supabase/functions/admin-provision-user` — POST, JWT + RPC `is_admin`, uso de service role no servidor Deno. |
| Variáveis | `.env.example` separa `VITE_*` (cliente) de segredos do servidor (`OPENROUTER_*`). |

---

## Matriz de achados

| ID | Severidade | Categoria | Local / artefacto | Descrição | Recomendação |
|----|------------|-----------|-------------------|-----------|--------------|
| S1 | Major | Config / Transporte | `vercel.json`, SPA estática | Sem `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, etc. | Adicionar headers via `vercel.json` `headers` ou middleware; testar quebra de integrações (Supabase, OpenRouter). |
| S2 | Major | CORS / Edge | `supabase/functions/admin-provision-user/index.ts` | `Access-Control-Allow-Origin: *` em função que orquestra criação de utilizadores (mitigada por exigir admin autenticado). | Restringir origem ao domínio do portal em produção; manter OPTIONS documentado. |
| S3 | Minor | API / LLM | `api/dre-agent.ts` `requestSchema` | `message` não tem `.max()`; permite corpos grandes (custo de tokens, latência). | `z.string().min(1).max(N)` (ex.: 8–16k caracteres) alinhado ao produto. |
| S4 | Minor | API / lógica | `loadSessionContext` | Não valida explicitamente `session.submission_id === submissionId` do body. | Após carregar sessão, rejeitar com 400 se IDs divergirem; reforça consistência e auditoria. |
| S5 | Info | Defesa em profundidade | Cliente + RLS | Rotas e papéis no React são **UX**, não segurança; a confiança real está no RLS e na API. | Manter documentado; testes E2E para rotas não substituem testes de políticas SQL. |
| S6 | Info | LLM | `dreAssistant.ts` + `dre-agent.ts` | Prompt injection mitigado por regras, `stripCalculatedMetricClaimsFromAnswer`, `stripInternalLineCodesFromUserText`, `validateAssistantFieldUpdates` e `explainOnly` no servidor. | Revisão periódica de prompts; monitorização de custo OpenRouter. |
| S7 | Minor | Qualidade / estrutura | `SubmissionsPage.tsx`, `dreAssistant.ts` | ~1000+ linhas cada; elevado risco de regressão e bugs de segurança em alterações. | Extrair hooks, subcomponentes e testes de integração por fluxo. |
| S8 | Info | Dependências | `npm audit` | 0 vulnerabilidades reportadas. | Manter CI com `npm audit` e lockfile atualizado. |

---

## Autenticação e API do assistente

- **JWT:** `api/dre-agent.ts` exige cabeçalho `Authorization`; cria cliente Supabase com `Authorization` do utilizador — queries executam com identidade do user, respeitando RLS.
- **Autorização de negócio:** `canAssistantMutateSubmission` + `explainOnly` derivado no servidor; `sanitizeResult` força `fieldUpdates` vazios em modo orientação.
- **Coerência session/submission:** RLS em `submission_input_values` e `submissions` impede leitura de submissões fora do escopo; mesmo assim, validar `session.submission_id === submissionId` evita estados inconsistentes e facilita auditoria (S4).

---

## RLS e dados (Supabase)

- **Migrations:** `002_rls_policies.sql` define `is_admin`, `can_access_franchise`, `can_manage_review` com `security definer` e `search_path` fixo; políticas em `submissions` e `submission_input_values` amarradas a `can_access_franchise(franchise_id)`. A migration **010** restringe operações de escrita com `can_operate_submission`; **016** endurece `audit_log` (sem INSERT por `authenticated`).

**Atualização (09/05/2026 BRT):** [`references/technical-implementation.md`](../references/technical-implementation.md) consolida a matriz **RLS** efectiva no remoto (`dre_lines`, `submissions`, `reporting_periods`, `audit_log`) e o índice de ficheiros sob `supabase/migrations/`. O repositório já **não** inclui o duplicado `015_harden_audit_log_insert.sql`.

- **Agentes:** `014_agent_sessions_and_messages.sql` — políticas em `agent_sessions` / `agent_messages` por `profile_id` e funções administrativas; alinhado com `project-context.md`.

**Matriz de papéis (frontend vs. documentação):** O `App.tsx` e `project-context.md` descrevem rotas por papel; a **fonte de verdade** para dados continua sendo RLS + funções SQL — coerência verificável por revisão cruzada em alterações futuras.

---

## Segredos e dependências

- Chaves OpenRouter e service role **não** devem usar prefixo `VITE_*` (documentado em `.env.example`).
- `npm audit`: **0** vulnerabilidades (execução 28/03/2026).

---

## Transporte e cabeçalhos

- `vercel.json` contém apenas **rewrites** SPA; não define cabeçalhos de segurança (S1).
- **HTTPS** é garantido pela Vercel por defeito.

---

## Qualidade estrutural e testes

- **TypeScript:** `tsconfig.app.json` com `strict: true`, `noUnusedLocals`, `noUnusedParameters`.
- **ESLint:** `typescript-eslint` recommended + React Hooks; `api/**` com globals Node.
- **Testes:** Vitest (`tests/unit/dre-agent-governance.test.ts`) cobre permissões e sanitização; Playwright smoke (`tests/e2e/smoke.spec.ts`) cobre login e rotas protegidas — **não** cobre API do agente nem RLS diretamente.

---

## Quick wins (1–2 sprints)

1. Adicionar `.max()` ao `message` no Zod e validação `session.submission_id === submissionId` (S3, S4).
2. Definir cabeçalhos mínimos de segurança na Vercel (S1) — iterar com CSP report-only se necessário.
3. Restringir CORS na função `admin-provision-user` ao domínio de produção (S2).

## Roadmap (decisão de produto / maior esforço)

- CSP estrita pode exigir ajustes em scripts inline e integrações externas.
- Dividir `SubmissionsPage` / `dreAssistant` em módulos menores e aumentar testes de integração (S7).
- Considerar rate limiting na API do agente (Vercel Edge Config / middleware) se abuso de custo for risco.

---

## Referências internas

- `references/project-context.md`
- `supabase/migrations/002_rls_policies.sql`, `014_agent_sessions_and_messages.sql`
- `api/dre-agent.ts`
- `src/features/submissions/agentPermissions.ts`, `dreAssistant.ts`

---

## Estado após remediação (28/03/2026)

| ID | Estado | Notas |
|----|--------|--------|
| **S1** | Tratado | `vercel.json`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e `Content-Security-Policy` (Supabase `*.supabase.co` + OpenRouter em `connect-src`). Se algum asset ou integração falhar no browser, ajustar `connect-src` / `img-src` na CSP. |
| **S2** | Tratado | `admin-provision-user`: CORS por `ADMIN_PROVISION_ALLOWED_ORIGINS` (reflexão da origem apenas se estiver na lista). Configurar o segredo no Supabase (Edge Functions) e em `.env.example`. Pedidos de browser com `Origin` não listado recebem 403. |
| **S3** | Tratado | `api/dre-agent.ts`: `AGENT_USER_MESSAGE_MAX_LENGTH = 12000` e `message` com `.max(...)` no Zod. |
| **S4** | Tratado | `loadSessionContext`: rejeição explícita se `session.submission_id !== submissionId`. |

Itens **S5–S8** permanecem como documentação / roadmap (não eram bloqueios desta remediação).
