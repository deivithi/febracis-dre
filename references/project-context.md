# Febracis DRE — contexto do projeto (fonte de verdade operacional)

Última revisão documental: 2026-03-29. Validar sempre contra o código antes de mudar papéis ou RLS.

## Raiz e URLs

- **Repositório (canônico nesta máquina):** `C:/Users/PC/Documents/VS CODE/febracis-dre`
- **Produção (Vercel):** https://febracis-dre.vercel.app
- **Supabase (projeto DRE FEBRACIS):** `vwxgrjjwbvdiaqxqbryk` — único remoto permitido para operação

## Stack resumida

- React 19 + Vite + TypeScript + React Router 7 + TanStack Query
- Supabase (auth, dados, RPC/views)
- API serverless: `api/dre-agent.ts` (assistente DRE; Vercel)

### Assistente DRE (OpenRouter / MiniMax)

- Variáveis de ambiente: ver [`.env.example`](../.env.example) — `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default em código: `minimax/minimax-m2.7`), `OPENROUTER_APP_URL`.
- Sem `OPENROUTER_API_KEY`, o handler usa `runLocalAssistantTurn` (`mode: 'fallback'`); a UI mostra o modo guiado local (detalhes técnicos colapsáveis em **Detalhes técnicos**).
- Contexto no LLM: `retrieveRelevantAssistantKnowledge` (pontuação lexical sobre excertos curados + docs estáticos). Não substitui RAG com embeddings até existir pipeline de ingestão.

#### UX do chat (Submissões)

- Painel **Assistente DRE**: thread com bolhas (paleta Febracis: azul / dourado / âmbar), área de mensagens com fundo “canvas” e **compositor fixo** (dock) com foco visível, autoaltura do campo de texto e **Enter** envia / **Shift+Enter** nova linha.
- Atalhos tipo **Olá** e chips ghost; `prefers-reduced-motion` desliga animações de entrada, brilho pendente e rotação do ícone de carregamento.
- Tokens CSS: prefixo `--chat-*` em [`src/styles/tokens.css`](../src/styles/tokens.css); estilos em [`SubmissionsPage.css`](../src/features/submissions/SubmissionsPage.css).

## Comandos de validação

```bash
npm run build
npm run lint
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
