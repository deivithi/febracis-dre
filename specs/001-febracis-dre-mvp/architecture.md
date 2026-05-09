# Arquitetura — SPEC-001 (`febracis-dre`)

Alinhado ao PRD `docs/PRD-canonical.md` §8 e ao SSOT `references/project-context.md`. Stack real: **React 19**, Vite 8, TypeScript, React Router 7, TanStack Query/Table, Zod, Recharts, Lucide; **sem** Tailwind nem shadcn no `package.json`.

## Camadas

### 1. SPA (browser)

- **Entrada:** `src/main.tsx`, rotas `src/App.tsx`, garda `ProtectedRoute`.
- **Estado servidor:** TanStack Query contra Supabase JS (`src/lib/supabase.ts` + cliente com JWT).
- **RBAC UX:** `allowedRoles` por rota — **não** substitui RLS; apenas esconde/mostra navegação (ver `docs/security-review-2026-03-28.md`).
- **Domínios:** `src/features/dashboard`, `submissions`, `workflow`, `admin`, etc.; mapa fino em `references/technical-implementation.md`.

### 2. Supabase (Auth + Postgres + RLS)

- **Auth:** sessão utilizador; JWT enviado nas queries.
- **Dados:** tabelas e políticas descritas em `data-model.md` e `contracts/rls-policies.md`.
- **Motor DRE:** funções SQL / triggers em migrações (fonte de cálculo oficial — PRD §7, BC-03).
- **Edge Functions:** p.ex. `supabase/functions/admin-provision-user` — provisionamento admin; CORS e secret `ADMIN_PROVISION_ALLOWED_ORIGINS` no Dashboard (CFO/Seg — ver `AGENTS.md` / `project-context`).

### 3. API serverless (Vercel)

- **`api/dre-agent.ts`:** único handler HTTP do assistente; método POST; corpo validado com Zod; cliente Supabase **com o Bearer do utilizador** para todas as leituras/RLS; LangGraph para pipeline LLM opcional; fallback determinístico local.
- **Deploy:** mesmo repositório que o frontend; variáveis `OPENAI_*`, `OPENROUTER_*`, `SUPABASE_*` só no servidor (nunca `VITE_*` para segredos).

### 4. Integrações LLM

- Ordem: `OPENAI_API_KEY` **>** OpenRouter (`OPENROUTER_API_KEY`).
- Modelos default em código: OpenAI `gpt-5.4-mini`; OpenRouter `minimax/minimax-m2.7` (ver constantes em `api/dre-agent.ts`).

## Fluxo de dados (assistente)

1. Browser chama API com JWT + `sessionId` + `submissionId` + `message` [+ `assistantProductTab`].
2. Handler valida rate limit (RPC opcional, fail-open documentado).
3. `loadSessionContext` carrega catálogo de linhas, valores, mensagens, estado submissão, papéis.
4. Deriva `explainOnly` / `writeAllowed` (`agentPermissions.ts`).
5. Caminho: comando `cmd:*` determinístico, off-topic local, ou grafo LangGraph + structured output + `sanitizeResult` (`validateAssistantFieldUpdates`, strip métricas).
6. Resposta inclui `result`, `telemetry`, `flow_checkpoint`, `session_state_patch` (contrato `contracts/api-dre-agent.json`).

## Onde não há componente à parte

- **Sem** serviço Python/LangGraph alojado fora Vercel neste MVP (PRD §4, §13-bis #4).
- **Sem** pgvector obrigatório na camada de conhecimento (RAG lexical em `dreAssistant.ts`).

## Referências cruzadas

- Rotas e ficheiros: `references/technical-implementation.md`.
- Deploy e ordem migrações: `references/project-context.md`.
- Diagramas: `SPEC.md` §3–§4.
