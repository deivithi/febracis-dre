# Febracis DRE — contexto do projeto (fonte de verdade operacional)

Última revisão documental: 2026-04-27. Validar sempre contra o código antes de mudar papéis ou RLS.

## Raiz e URLs

- **Repositório (canônico neste workspace / OneDrive):** `C:/Users/deivithi.lopes/OneDrive - Febracis/Documentos/Antigravity 3/febracis-dre`
- **Outras raízes (outros PCs / legado):** p.ex. `C:/Users/PC/Documents/VS CODE/febracis-dre` — o código versionado a seguir é o do caminho canónico acima quando o workspace aberto for Antigravity 3.
- **Produção (Vercel):** `https://febracis-dre-phi.vercel.app` (alias estável; deploy 2026-04-27)
- **Vercel (team ativo):** `richardrios10000-5421s-projects` — projeto `febracis-dre` (ficheiros em `.vercel/` locais; pasta em gitignore)
- **Evidência último deploy produção (READY documentado):** `dpl_HK91SCXq2wRd8iNZWkqmSvnguYYd` — [inspect Vercel](https://vercel.com/richardrios10000-5421s-projects/febracis-dre/HK91SCXq2wRd8iNZWkqmSvnguYYd)
- **Sessão 2026-04-27 (destravar envs):** no projeto Vercel foram adicionadas **7** variáveis em **Production** (`VITE_SUPABASE_URL`, `OPENROUTER_*`, `AGENT_RATE_LIMIT_*`, `ADMIN_PROVISION_ALLOWED_ORIGINS`). Faltam **`VITE_SUPABASE_ANON_KEY`** e **`OPENROUTER_API_KEY`** (não estavam em `.env.local` no workspace; não inventar). `npx vercel deploy --prod` e `--prebuilt` falharam no remoto com erro genérico vazio; `vercel build --prod` + `vercel pull` locais correram verdes. Smoke no alias: HTTP 200 no HTML (contém `id="root"`), `POST /api/dre-agent` → **401** (esperado sem auth). **Preview (envs):** não aplicável enquanto o projeto não tiver **Git ligado** na Vercel (a CLI recusa `preview` com branch).
- **Supabase (projeto DRE FEBRACIS):** `vwxgrjjwbvdiaqxqbryk` — único remoto permitido para operação
- **Página em branco / crash no cliente:** o bundle chama `createClient` em [`src/lib/supabase.ts`](../src/lib/supabase.ts) — se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` faltarem no **build** (Vercel), o módulo lança e a app não monta. Configurar ambas no projeto Vercel (Production) e voltar a fazer deploy.

#### Histórico de migrações de conta Vercel

| Data | Conta / team origem | Conta / team destino | URL produção ativa | Notas |
|------|---------------------|----------------------|----------------------|-------|
| 2026-04-27 | `deivithis-projects` (legado) | `richardrios10000-5421s-projects` | `https://febracis-dre-phi.vercel.app` | Alias legado `https://febracis-dre.vercel.app` pode continuar a existir na conta antiga; não é a fonte de deploy após esta migração. Variáveis de ambiente devem ser **recriadas** no projeto novo — ver [`operacoes-pendentes-supabase-vercel-2026-04-27.md`](./operacoes-pendentes-supabase-vercel-2026-04-27.md). |

### Deploy na Vercel (instrução para agentes IA)

- **Quando:** ao **fechar um bloco de implementação** no `febracis-dre` que deva refletir em produção (frontend, `api/*`, ou qualquer ficheiro que entre no build/deploy), **sem esperar pedido explícito** do usuário.
- **Como:** na raiz do repositório, após `npm run build` (e `npm run test` quando houver alterações no assistente ou regras críticas), executar **`npx vercel@latest deploy --prod --yes`** (CLI autenticada). Confirmar no output o alias **`https://febracis-dre-phi.vercel.app`** (ou o URL de produção indicado).
- **Git:** se o usuário quiser o remoto atualizado, fazer **commit + push** para o branch acordado (ex.: `main`) **além** do deploy.
- **Exceções:** usuário pediu para **não** publicar; sessão **só leitura/planejamento** sem mudanças de código; falta de rede ou CLI não autenticada — comunicar e não assumir que o deploy correu.
- **Sincronização com o workspace global:** o `AGENTS.md` da raiz do monorepo/workspace do utilizador **aponta para este ficheiro** como fonte de verdade operacional do portal DRE (evita duplicar regras longas lá).

## Stack resumida

- React 19 + Vite + TypeScript + React Router 7 + TanStack Query
- Supabase (auth, dados, RPC/views)
- API serverless: `api/dre-agent.ts` (assistente DRE; Vercel)

### Rate limit do assistente (`api/dre-agent.ts`)

- Migration `015_agent_rate_limits.sql`: tabela `agent_rate_limits`, RLS, RPC `fn_agent_rate_check` (perfil `auth.uid()`).
- Variáveis: `AGENT_RATE_LIMIT_PER_MINUTE`, `AGENT_RATE_LIMIT_WINDOW_SECONDS`, `AGENT_RATE_LIMIT_ENABLED` (fail-open se RPC/infra falhar) — ver [`.env.example`](../.env.example).
- Resposta **429** com corpo mínimo `{ error: 'rate_limit_exceeded', retryAfterSeconds }` e header `Retry-After` quando o limite é excedido.
- **Aplicar no remoto:** `npx supabase link --project-ref vwxgrjjwbvdiaqxqbryk` (com `supabase login` ou `SUPABASE_ACCESS_TOKEN`) → `npx supabase db push --linked`. Passo a passo e alternativas: [`operacoes-pendentes-supabase-vercel-2026-04-27.md`](./operacoes-pendentes-supabase-vercel-2026-04-27.md). Enquanto a migration não estiver aplicada, o API continua **fail-open** em falhas de RPC (comportamento documentado no código).

### Assistente DRE (OpenRouter / MiniMax)

- Variáveis de ambiente: ver [`.env.example`](../.env.example) — `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default em código: `minimax/minimax-m2.7`), `OPENROUTER_APP_URL`.
- Sem `OPENROUTER_API_KEY`, o handler usa `runLocalAssistantTurn` (`mode: 'fallback'`); a UI mostra o modo guiado local (detalhes técnicos colapsáveis em **Detalhes técnicos**).
- Contexto no LLM: `retrieveRelevantAssistantKnowledge` (pontuação lexical sobre excertos curados + docs estáticos). Não substitui RAG com embeddings até existir pipeline de ingestão.

#### Governança do assistente (papéis, números, continuidade)

| Modo | Quem | Comportamento |
|------|------|----------------|
| **Sem painel** | `viewer` (rota Submissões inacessível no menu) | Sem conversa na submissão. |
| **`explain_only`** | Regional, controladoria, executivo, etc., sem operação na submissão *ou* submissão bloqueada | Chat ativo: glossário, ordem dos campos, fluxo. **`fieldUpdates` sempre vazios** no servidor (`api/dre-agent.ts` + `sanitizeResult`). Cliente não aplica alterações (`applyAssistantFieldUpdates` ignora em `explain_only`). |
| **`full`** | `franchise_user` ou `system_admin` com submissão em estado editável | `fieldUpdates` validados (`validateAssistantFieldUpdates`), preview/save como hoje. |

- **Fonte de verdade numérica:** `submission_input_values` + motor SQL; o modelo não deve exibir MC1/MC2/EBITDA calculados com valores — `stripCalculatedMetricClaimsFromAnswer` no finalize da API.
- **Memória:** sessão `agent_sessions` por `profile_id` + `submission_id`; histórico recente até `AGENT_MESSAGE_HISTORY_LIMIT` (32); com ≥12 mensagens o prompt inclui `contexto_compacto` via `buildConversationSummaryFromMessages`.
- **Fio da meada:** cada turno persiste em `state_json` o `flow_checkpoint` (`phase`, `line_code`, `filled_count`, `total_inputs`, `last_user_intent`) e `last_interaction_mode`. A UI mostra fase, “Próximo passo” e aviso de **realinhamento** quando a última intenção foi `off_topic`.
- **Entrada off-topic:** heurística `classifyDreUserIntent` + turno local determinístico quando aplicável (`shouldUseDeterministicAssistantTurn`), sem depender só do LLM.
- **Testes:** `npm run test` (Vitest) — `tests/unit/dre-agent-governance.test.ts`. Checklist manual pós-deploy: [`references/checklist-servidor-dre-agent.md`](./checklist-servidor-dre-agent.md).
- **Demo executiva:** roteiro em [`references/demo-ceo-roteiro.md`](./demo-ceo-roteiro.md).

#### UX do chat (Submissões)

- Painel **Assistente DRE**: thread com bolhas (paleta Febracis: azul / dourado / âmbar), área de mensagens com fundo “canvas” e **compositor fixo** (dock) com foco visível, autoaltura do campo de texto e **Enter** envia / **Shift+Enter** nova linha.
- Atalhos tipo **Olá** e chips ghost; `prefers-reduced-motion` desliga animações de entrada, brilho pendente e rotação do ícone de carregamento.
- Tokens CSS: prefixo `--chat-*` em [`src/styles/tokens.css`](../src/styles/tokens.css); estilos em [`SubmissionsPage.css`](../src/features/submissions/SubmissionsPage.css).

## Comandos de validação

```bash
npm run build
npm run lint
npm run test
npm run validate:settings
npm run validate:phase1:local
```

E2E (após `npx playwright install`): `npm run test:e2e` — o `playwright.config.ts` injeta `VITE_SUPABASE_*` de placeholder no processo do `npm run dev` usado pelos testes, para o bundle não abortar em ambientes **sem** `.env.local` (smoke de UI; não valida ligação ao Supabase real).

## Linha do tempo e lições

- Execução e critérios de aceite: [`tasks/todo.md`](../tasks/todo.md)
- Instincts operacionais (hero, viewport, deploy): [`tasks/lessons.md`](../tasks/lessons.md)

## Fluxo de dados (produto)

1. **Submissões** — entrada oficial de valores editáveis (`line_code`); preview local + save dispara cálculo oficial.
2. **Workflow / aprovação** — estados da submissão (bloqueio de escrita quando não editável).
3. **Dashboard** — leitura de snapshots consolidados; **não** é origem do dado.

## Mapa de rotas e papéis (frontend)

Rotas públicas: `/`, `/login`.

Área autenticada: `/app/*` (layout com sidebar). Redirecionamento índice → `/app/dashboard`.

| Rota | Papéis com acesso (OR) | Modo |
|------|-------------------------|------|
| `/app/dashboard` | Todos autenticados | Leitura (+ ações do hero conforme papel) |
| `/app/guide` | Todos autenticados | Leitura |
| `/app/submissions` | `franchise_user`, `regional_manager`, `finance_controller`, `executive`, `system_admin` | Operacional / leitura conforme `canOperateSubmission` |
| `/app/workflow` | `finance_controller`, `executive`, `system_admin` | Revisão |
| `/app/franchises` | `regional_manager`, `finance_controller`, `executive`, `system_admin` | Lista / governo |
| `/app/audit` | `finance_controller`, `executive`, `system_admin` | Leitura auditoria |
| `/app/admin` | `system_admin` | Configuração |
| `/app/forbidden` | Todos autenticados | Mensagem de acesso negado |

**`viewer`:** tem tipo em [`src/features/auth/auth.types.ts`](../src/features/auth/auth.types.ts); **não** está nas `allowedRoles` de Submissões, Workflow, etc. A navegação filtra itens; a jornada esperada é **Dashboard + Guia**. URLs diretas a rotas restritas devem mostrar página explícita de permissão (não redirecionar em silêncio).

**Verificação obrigatória:** políticas RLS e RPCs no Supabase devem refletir a mesma matriz; este arquivo descreve o que o **router React** aplica.

## Arquivos canônicos por área

| Área | Arquivos principais |
|------|----------------------|
| Rotas | [`src/App.tsx`](../src/App.tsx) |
| Guarda de rota | [`src/router/ProtectedRoute.tsx`](../src/router/ProtectedRoute.tsx), [`src/features/auth/access.ts`](../src/features/auth/access.ts) |
| Shell | [`src/layouts/app/AppLayout.tsx`](../src/layouts/app/AppLayout.tsx), [`navigation.ts`](../src/layouts/app/navigation.ts) |
| Landing / login | [`src/features/auth/LoginPage.tsx`](../src/features/auth/LoginPage.tsx), [`LoginPage.css`](../src/features/auth/LoginPage.css) |
| Dashboard | [`src/features/dashboard/DashboardPage.tsx`](../src/features/dashboard/DashboardPage.tsx), [`HoldingCockpitView.tsx`](../src/features/dashboard/HoldingCockpitView.tsx) |
| Submissões + assistente | [`src/features/submissions/SubmissionsPage.tsx`](../src/features/submissions/SubmissionsPage.tsx), [`DreAssistantPanel.tsx`](../src/features/submissions/DreAssistantPanel.tsx), [`api/dre-agent.ts`](../api/dre-agent.ts) |
| API portal | [`src/features/shared/portal.api.ts`](../src/features/shared/portal.api.ts) |
| Design tokens | [`src/styles/tokens.css`](../src/styles/tokens.css), componentes em [`src/styles/components/`](../src/styles/components/) |

## Escopos de dashboard (derivados do papel + escopos)

Lógica em `resolveDashboardScope`: `controladoria` (finance_controller), `holding` (admin executivo / rede), `regional`, `franchise`.
