# Febracis DRE — contexto do projeto (fonte de verdade operacional)

Última revisão documental: 2026-03-29. Validar sempre contra o código antes de mudar papéis ou RLS.

## Raiz e URLs

- **Repositório (canônico nesta máquina):** `C:/Users/PC/Documents/VS CODE/febracis-dre`
- **Produção (Vercel):** https://febracis-dre.vercel.app
- **Supabase (projeto DRE FEBRACIS):** `vwxgrjjwbvdiaqxqbryk` — único remoto permitido para operação

### Deploy na Vercel (instrução para agentes IA)

- **Quando:** ao **fechar um bloco de implementação** no `febracis-dre` que deva refletir em produção (frontend, `api/*`, ou qualquer ficheiro que entre no build/deploy), **sem esperar pedido explícito** do usuário.
- **Como:** na raiz do repositório, após `npm run build` (e `npm run test` quando houver alterações no assistente ou regras críticas), executar **`npx vercel --prod --yes`** (CLI autenticada). Confirmar no output o alias **`https://febracis-dre.vercel.app`**.
- **Git:** se o usuário quiser o remoto atualizado, fazer **commit + push** para o branch acordado (ex.: `main`) **além** do deploy.
- **Exceções:** usuário pediu para **não** publicar; sessão **só leitura/planejamento** sem mudanças de código; falta de rede ou CLI não autenticada — comunicar e não assumir que o deploy correu.
- **Sincronização com o workspace global:** o `AGENTS.md` da raiz do monorepo/workspace do utilizador **aponta para este ficheiro** como fonte de verdade operacional do portal DRE (evita duplicar regras longas lá).

## Stack resumida

- React 19 + Vite + TypeScript + React Router 7 + TanStack Query
- Supabase (auth, dados, RPC/views)
- API serverless: `api/dre-agent.ts` (assistente DRE; Vercel)

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

E2E (após `npx playwright install`): `npm run test:e2e`

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
