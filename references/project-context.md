# Febracis DRE — contexto do projeto (fonte de verdade operacional)

Última revisão documental: 08/05/2026 BRT — Dashboard executivo (`/app/dashboard`): **benchmark UX executivo** em [`references/dashboard-ux-benchmark.md`](./dashboard-ux-benchmark.md); snapshots `vw_franchise_dashboard` / `vw_regional_dashboard` para escopos multi-entidade com **paginação** em `portal.api.ts` (`.range`, até 50 000 linhas; só-franquia mantém limite reduzido); **freshness** “Leituras atualizadas em … BRT” ligada ao `dashboardQuery.dataUpdatedAt`; KPIs na grelha **`ExecutiveKpiGrid`** com secção “Situação na competência (resumo)”; **headline de escopo** no layout (`getActiveScopeHeadline` em `access.ts` + `AppLayout`). Mantém refactor anterior: Visão rede, `holdingDerivations`, hero um H1, `invalidateQueries ['dashboard']`, matriz [`references/dashboard-scope-matrix.md`](./dashboard-scope-matrix.md). **Deploy produção:** `dpl_BsrstQnFM7GBEnnfqTCmDUTHRtfc` (ver **Raiz e URLs**).

## Raiz e URLs

- **Repositório (GitHub canônico):** `https://github.com/deivithi/febracis-dre` — privado; branch `main`; remoto local esperado: `origin`.
- **Repositório local (atual):** `C:/Users/deivithi.lopes/OneDrive - Febracis/Documentos/Antigravity 3/febracis-dre`. **Risco conhecido:** OneDrive já causou arquivos rastreados ausentes; mover para `C:/Repos/febracis-dre` quando a rodada estiver verde.
- **Outras raízes (outros PCs / workspace Cursor):** p.ex. `C:/Users/PC/Documents/VS CODE/febracis-dre` ou `C:/Users/PC/OneDrive/Documents/VS CODE/febracis-dre` — validar qual pasta está aberta no Cursor (ver `AGENTS.md` na raiz do monorepo quando aplicável) e cruzar com o GitHub canônico antes de usar.
- **Produção (Vercel canônica):** `https://febracis-dre.vercel.app` no team **`deivithis-projects`**.
- **Vercel (team ativo):** `deivithis-projects` — projeto `febracis-dre`, `projectId` **`prj_TRfWzt0jvjnqmGynfr6hKTC1qDyq`**, teamId **`team_OFMmpjaot33SjbhGk0lLBFs1`**. O MCP da Vercel acessa esta conta. A CLI local pode estar logada em outra conta; verificar antes de deploy.
- **Produção READY (2026-05-07, antes da sequência ERROR):** `dpl_D5R69dMXX4QgScopdJDmmLcMkQMs`, commit `f3ffc35daaf72dab711a94597c683b77b354b909`, alias `https://febracis-dre.vercel.app`.
- **Produção READY (`vercel` 08/05/2026 BRT, commit `894dafb`):** `dpl_BsrstQnFM7GBEnnfqTCmDUTHRtfc`, URL `https://febracis-mowqvy8gc-deivithis-projects.vercel.app`, inspect `https://vercel.com/deivithis-projects/febracis-dre/BsrstQnFM7GBEnnfqTCmDUTHRtfc`, alias **`https://febracis-dre.vercel.app`**, região build `iad1` — dashboard: paginação snapshot, `ExecutiveKpiGrid`, freshness BRT, headline de escopo, [`references/dashboard-ux-benchmark.md`](./dashboard-ux-benchmark.md).
- **Produção READY (`vercel inspect` 08/05/2026 BRT, commit `4ca2ffad82837328af25255fc38343f1def189d1`):** `dpl_JA9qevtJ9eWra1iDsQHVbAKGVMyF`, URL `https://febracis-4wtz4liwi-deivithis-projects.vercel.app`, inspect `https://vercel.com/deivithis-projects/febracis-dre/JA9qevtJ9eWra1iDsQHVbAKGVMyF`, alias **`https://febracis-dre.vercel.app`**, região build `iad1`, estado **Ready** — cockpit Holding + KPIs unificados ao filtro, label **Visão rede** (`access.ts`), `holdingDerivations.ts`, matriz [`references/dashboard-scope-matrix.md`](./dashboard-scope-matrix.md).
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `0b6ba37`):** `dpl_5HoGgcfE4Co9c4js58vdsU7EZ1ZH` (URL `https://febracis-7ub9e2dli-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`**, região build `iad1`, estado **Ready** — KPI **preenchimento da grelha** só no topo (`SubmissionKpiSection`, `data-testid="draft-progress"`); **`SubmissionWorkbenchRail`** coluna 2 = apenas card “Resumo da DRE (prévia)”, sem segundo `draft-progress`.
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `1284d00`):** `dpl_Ck1NYFjrEMUbh19UGiabqJGTpwUm` (URL `https://febracis-hpkkxljga-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`** — KPI grelha com contador obrigatórias + barra + hint (duplicado ainda aparecia sob o resumo no rail até `0b6ba37`).
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `fdc2242`):** `dpl_nQLyZeEzjoLMjGKbuBs7cCqEqvg6` (URL `https://febracis-f4l44ywr4-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`**, região build `iad1`, estado **Ready** — KPI trio em **Submissões** e **Assistente**: três cartões no desktop (`escopo da rede` + preenchimento da grelha (`draftValidation`) + **EBITDA 2 da prévia**).
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `1b4601b`):** `dpl_2pdrekNnTmppbZA6mutxkvjtmVmC` (URL `https://febracis-626zti1qi-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`**, região build `iad1`, estado **Ready** — correção de cascata CSS: `.submission-workbench__rail.submission-workbench__rail--grid` com especificidade maior que `.submission-sidebar`, restaurando o cockpit em três colunas no desktop (painel Submissões).
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `bb2af38`):** `dpl_2mGBY8cB32UBKRvdToWDgBfSf9N8` (URL `https://febracis-p8ki074vq-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`**, região build `iad1`, estado **Ready** — Submissões redesenhada como cockpit (três cards no topo em desktop, DRE oficial calculada abaixo, acessibilidade nas abas móveis e barra de progresso, tabela de escopo com navegação por teclado).
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `a9991f5`):** `dpl_3dqF3diWdqfVdrw2wq7mhxJ3JzBn` (URL `https://febracis-rdhzw3zbv-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`**, região build `iad1`, estado **Ready** — speech layer PT-BR aplicada a Dashboard/Workflow/ScopeTable; checklist de severidade global em [`src/styles/components/validation-checklist.css`](../src/styles/components/validation-checklist.css); spec opcional Playwright para capturas executivas.
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `3d4032e`):** `dpl_DUcL1Xmwo2JfSmWZorH6sDt6zijo` (URL `https://febracis-q6mwmjxjw-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`**, região build `iad1`, estado **Ready** — mesmo split Submissões/Assistente; subtítulo da página Submissões alinhado ao plano.
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `66bce48`):** `dpl_H9xfqR5Kt2nyjzQYW6m9aSqtPygY` (URL `https://febracis-h1yk9mtvc-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`**, região build `iad1`, estado **Ready** — Submissões sem dock de chat (abas móveis Painel | DRE); hub **Assistente** `/app/assistant` com conversa guiada.
- **Produção READY anterior (`vercel inspect` 08/05/2026 BRT, commit `473fe09`):** `dpl_Hbz2oi4AqyR2adx6s5oNps1PvnMB` (URL `https://febracis-rmqi7hmbz-deivithis-projects.vercel.app`), alias **`https://febracis-dre.vercel.app`**, `api/dre-agent` (~2 MB), região build `iad1`, estado **Ready** — inclui hub **Assistente** `/app/assistant` + governança `assistantProductTab` modo Dúvidas.
- **Produção READY anterior (08/05/2026 BRT, referência):** `dpl_9GRYX3oQrPqNtqrSHbXJM4RBvWyw` (`https://febracis-mvz4witu9-deivithis-projects.vercel.app`).
- **Deploy intermédio (auditoria DRE Agent, mesma janela):** `dpl_78Q5paVibSPCrb2AMNSFg2qigCZX` (`febracis-c5r88l4c9-deivithis-projects`).
- **Produção READY anterior (2026-05-08 documental):** `dpl_9uBcfAUK1JxsxjGznd3Jq2sMg8c3` (`febracis-ligzmsedq-deivithis-projects`), commit de referência histórica **`8eb04ee`**.
- **GitHub `main` (2026-05-07, referência histórica):** `f0645821dabf12da020a8f007ffa0934a1e1f196`. O último auto-deploy deste commit (`dpl_2EMgRwmt7vR7i78Q2MHDmSTm7NE9`) ficou `ERROR`; build local com Node 24 passa, então a causa provável é configuração/ambiente Vercel.
- **Supabase (produção canônica atual):** `vwxgrjjwbvdiaqxqbryk` — projeto `febracis-dre`, org `nayypuosrfhhrkorfszw`, região `sa-east-1`. Manter este projeto como produção; `gjocbbipuguapypxfbub` foi uma migração abortada/não canônica nesta rodada.
- **Contas históricas / não canônicas:** `richardrios10000-5421s-projects` (`febracis-dre-phi`) e `deivithilopes-6933s-projects` (`febracis-dre-rho`) não são fonte de produção nesta decisão.
- **Tela preta / envs ausentes no bundle:** [`src/lib/supabase.ts`](../src/lib/supabase.ts) **não** aborta mais o carregamento do módulo: expõe `getSupabaseConfig()` / `getSupabaseClient()` e um proxy `supabase` que só falha ao **usar** o cliente sem `VITE_*`. O login mostra aviso quando a configuração falta; `AppErrorBoundary` e o bootstrap em [`src/main.tsx`](../src/main.tsx) evitam `#root` vazio por exceções de render. **Para dados reais e auth**, continuam a ser obrigatórios `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` no **build** de Production e um deploy que os embuta — validar com `npm run smoke:prod` (opcional `SMOKE_STRICT=1`).

### Checklist — app “verde” no browser (resumo)

Detalhe e comandos: [`operacoes-pendentes-supabase-vercel-2026-04-27.md`](./operacoes-pendentes-supabase-vercel-2026-04-27.md).

1. **Vercel Production:** confirmar `VITE_SUPABASE_URL=https://vwxgrjjwbvdiaqxqbryk.supabase.co`, `VITE_SUPABASE_ANON_KEY`, rate limit e `ADMIN_PROVISION_ALLOWED_ORIGINS=https://febracis-dre.vercel.app,http://localhost:5173`; redeploy para embutir `VITE_*` no bundle.
2. **Supabase:** migrations **015** (`agent_rate_limits`) e **016** (`harden_audit_log_insert`) aplicadas no remoto legado via MCP em 2026-05-07; confirmar em `list_migrations` antes de novo deploy.
3. **Smoke:** login no alias, assistente, 429, CORS admin — secção 4 do doc de operações.

#### Histórico de migrações de conta Vercel

| Data | Conta / team origem | Conta / team destino | URL produção ativa | Notas |
|------|---------------------|----------------------|----------------------|-------|
| 2026-05-07 | `richardrios10000-5421s-projects` / `deivithilopes-6933s-projects` (tentativas históricas) | `deivithis-projects` | `https://febracis-dre.vercel.app` | Decisão operacional: manter a produção na conta Gmail que já serve o alias ativo. MCP Vercel acessa este team; CLI local deve ser conferida antes de deploy. |
| 2026-04-27 | `deivithis-projects` | `richardrios10000-5421s-projects` | `https://febracis-dre-phi.vercel.app` | Migração histórica revertida/desclassificada. Não usar como fonte canônica. |

### Deploy na Vercel (instrução para agentes IA)

- **Quando:** ao **fechar um bloco de implementação** no `febracis-dre` que deva refletir em produção (frontend, `api/*`, ou qualquer ficheiro que entre no build/deploy), **sem esperar pedido explícito** do usuário.
- **Como:** na raiz do repositório, após `npm run build` (e `npm run test` quando houver alterações no assistente ou regras críticas), executar **`npx vercel --prod --yes`** somente com a CLI ligada ao team `deivithis-projects` (ou dashboard/MCP dessa conta). Confirmar no output o alias **`https://febracis-dre.vercel.app`**. Se a CLI estiver em `deivithilopes-6933` ou outra conta, não publica na produção correta.
- **Git:** no **protocolo de encerramento** pós-implementação, **commit + push** para `main`/`origin` é **obrigatório** sempre que código ou docs da app mudarem — ver secção abaixo. Fora desse ciclo, só faz push se houve contribuições a integrar no remoto.
- **Exceções:** usuário pediu para **não** publicar; sessão **só leitura/planejamento** sem mudanças de código; falta de rede ou CLI não autenticada — comunicar e não assumir que o deploy correu.
- **Sincronização com o workspace global:** o `AGENTS.md` da raiz do monorepo/workspace do utilizador **aponta para este ficheiro** como fonte de verdade operacional do portal DRE (evita duplicar regras longas lá).

### Protocolo de encerramento obrigatório (pós-implementação no `febracis-dre`)

**Decisão do produto:** após qualquer implantação, criação, ajuste ou correção nesta aplicação, o ciclo fecha **nesta ordem**, sem esperar novo pedido do utilizador — exceto quando o utilizador declarar sessão só leitura, “não publicar” ou faltar rede/CLI autenticada.

1. **Documentação no repositório do portal** (`<raiz>/febracis-dre`): atualizar sempre que o comportamento, rotas ou contratos mudarem:
   - `references/project-context.md` (fonte de verdade operacional; deploy, assistente, rotas).
   - `references/demo-ceo-roteiro.md` quando a narrativa de demo mudar.
   - `febracis-dre/AGENTS.md` quando o fluxo de agente ou comandos de validação mudarem.
   - Outros `docs/*.md` apenas se a alteração tocar nesse domínio (ex.: glossário, segurança).
2. **Skills e regras no workspace** (monorepo Cursor em que o portal está versionado):
   - `.cursor/skills/stack-febracis-dre/SKILL.md` — checkpoint e protocolo resumido.
   - `.cursor/rules/stack-febracis-dre.mdc` — ponteiro ao protocolo e ao `project-context.md`.
3. **Skill global no PC** (retomada entre sessões / Codex): `C:\Users\PC\.codex\skills\febracis-dre-especialista\SKILL.md` — alinhar ao mesmo protocolo e à data do último deploy quando houver publicação.
4. **Raiz do monorepo:** se a política for transversal a todos os projetos, atualizar o `AGENTS.md` da raiz (secção febracis-dre); caso contrário basta o passo 1–3.
5. **Git:** `git status` na raiz do clone do portal; **commit** com mensagem clara (Conventional Commits); **push** para `origin/main` (ou branch acordado).
6. **Vercel produção:** na raiz do portal, `npm run build` e `npm run test` quando houver mudança no assistente, API `api/*`, auth ou regras críticas; depois **`npx vercel --prod --yes`** no team `deivithis-projects`; confirmar alias `https://febracis-dre.vercel.app`. Opcional: `SMOKE_STRICT=1 npm run smoke:prod`.
7. **Registo neste ficheiro:** após deploy bem-sucedido, atualizar na secção **Raiz e URLs** o último `dpl_*` / estado Ready quando relevante (linha de produção READY).

**Exceções:** utilizador pediu explicitamente para não fazer push ou não deploy; apenas documentação interna sem impacto em código; impossibilidade técnica — comunicar o bloqueio e o que ficou pendente.

#### Incidentes de deploy (referência)

- **2026-05-07/08:** várias tentativas de produção na Vercel falharam em sequência (status `Error` no dashboard). `npm run build` e `npx vercel build` locais permaneceram verdes; a recuperação foi feita com deploy a partir do clone autenticado (`npx vercel --prod --yes`) na raiz do repo, após `npx vercel pull --yes` quando faltavam settings locais. Para diagnóstico: `npx vercel inspect <url-da-deployment>`.

## Stack resumida

- React 19 + Vite + TypeScript + React Router 7 + TanStack Query
- Supabase (auth, dados, RPC/views)
- API serverless: `api/dre-agent.ts` (assistente DRE; Vercel)

### Rate limit do assistente (`api/dre-agent.ts`)

- Migration `015_agent_rate_limits.sql`: tabela `agent_rate_limits`, RLS, RPC `fn_agent_rate_check` (perfil `auth.uid()`).
- Variáveis: `AGENT_RATE_LIMIT_PER_MINUTE`, `AGENT_RATE_LIMIT_WINDOW_SECONDS`, `AGENT_RATE_LIMIT_ENABLED` (fail-open se RPC/infra falhar) — ver [`.env.example`](../.env.example).
- Resposta **429** com corpo mínimo `{ error: 'rate_limit_exceeded', retryAfterSeconds }` e header `Retry-After` quando o limite é excedido.
- **Aplicar no remoto:** `npx supabase link --project-ref vwxgrjjwbvdiaqxqbryk` (com `supabase login` ou `SUPABASE_ACCESS_TOKEN`) → `npx supabase db push --linked`. Passo a passo e alternativas: [`operacoes-pendentes-supabase-vercel-2026-04-27.md`](./operacoes-pendentes-supabase-vercel-2026-04-27.md). Enquanto a migration não estiver aplicada, o API continua **fail-open** em falhas de RPC (comportamento documentado no código).

### Hardening de `audit_log` (migration `016`)

- Ficheiro: [`supabase/migrations/016_harden_audit_log_insert.sql`](../supabase/migrations/016_harden_audit_log_insert.sql). Remove a policy permissiva de INSERT em `public.audit_log` e revoga INSERT para `anon`/`authenticated` (mitiga log poisoning — ver comentário no SQL). Os triggers `security definer` da migration **006** continuam a registar eventos. **Nota de numeração:** no repositório remoto `main` (clone antigo) este patch existia como `015_harden_audit_log_insert.sql`; no workspace canónico, **015** está reservada a `015_agent_rate_limits.sql`, pelo que o hardening foi renumerado para **016**.

### Assistente DRE (OpenAI nativa ou OpenRouter)

- Variáveis de ambiente: ver [`.env.example`](../.env.example). **Prioridade:** `OPENAI_API_KEY` na Vercel (ou **`OPENROUTER_API_KEY`**). Modelo implícito no código quando `OPENAI_MODEL` falta: **`gpt-5.4-mini`**. **Não** há chave OpenAI hardcoded no repositório — use sempre segredos de ambiente. Ao usar CLI/pipe no Windows, confirmar que o valor gravado **não** inclua newline (*Value contains newlines*).
- **`OPENROUTER_*`:** default `OPENROUTER_APP_URL` na função passou a **`https://febracis-dre.vercel.app`** (substitui o alias histórico `*-phi`).
- Quick wins auditoria **08/05/2026 BRT:** mensagem utilizador entre `<<<USER_MESSAGE_BEGIN>>>`/`END`; 1 retry com espera ~800 ms antes do fallback determinístico; erro operacional **`AgentOperationalError`** com `code`/`status`; logs JSON (`dre_agent_turn`) com `latencyMs`, `mode`, `model`; resposta HTTP inclui **`mode`** e **`telemetry`** (`assistant_provider`, `assistant_model`).
- Payload opcional **`assistantProductTab`**: `"duvidas"` força comportamento **`explain_only`** no turno mesmo quando o papel poderia gravar valores (hub **Assistente**); omitido ou `"preencher"` preserva regra por papel/status.
- Documento completo da auditoria: [`references/audit-dre-agent-2026-05-08.md`](./audit-dre-agent-2026-05-08.md).
- Sem chaves remotas válidas **e** sem default resolvível (cenário só para forks que limpem as constantes) + sem `OPENROUTER_API_KEY`, o handler usa `runLocalAssistantTurn` (`mode: 'fallback'`); UI segue modo guiado local (detalhes em **Detalhes técnicos**).
- Contexto no LLM: `retrieveRelevantAssistantKnowledge` (pontuação lexical sobre excertos curados + docs estáticos). Não substitui RAG com embeddings até existir pipeline de ingestão.

##### Assistente guiado determinístico (`cmd:*` + painel)

- **Bypass LangGraph:** comandos `cmd:*` tratados no início do handler com `runDeterministicCommand` (`api/dre-agent.ts`); telemetria **`dre_agent_command`**.
- **HITL persistido:** `session_state_patch` devolve `proposed_value`, `acceptance_state`, `dre_phase`, `skipped_line_codes`. O cliente faz merge em `useSubmissionsWorkspace`; **`applyAssistantFieldUpdates` só aplica** `fieldUpdates` quando **`requiresFieldConfirmation` não está ativo** — propostas ficam pendentes até `cmd:confirm_value` (fluxo local ou LLM com confirmação).
- **UI:** `DreAssistantPanel` — stepper de **10 fases**, CTA por campo (Explicar / Inserir / Pular), toolbar de navegação, teclado **`CurrencyKeypad`** (BRL), mini-card de confirmação.
- **Referência didática:** [`docs/dre-glossario.md`](../docs/dre-glossario.md) (revisão controladoria pendente).
- **Playwright:** [`tests/e2e/assistant-guided.spec.ts`](../tests/e2e/assistant-guided.spec.ts) — navega para `/app/assistant`, fluxo completo só com `E2E_DRE_EMAIL` e `E2E_DRE_PASSWORD` definidos; caso contrário o teste faz **`skip`**.

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

#### UX do chat e separação Submissões ↔ Assistente

- **Submissões** (`/app/submissions`): grelha oficial + **rail executivo em duas colunas em desktop** ([`SubmissionWorkbenchRail.tsx`](../src/features/submissions/components/SubmissionWorkbenchRail.tsx)): coluna esquerda com **Situação da DRE** (franquia, competência, versão, status, observações, ações Salvar/Enviar); coluna direita com **Resumo da DRE (prévia)** em ordem da planilha (RBV → MC1 → MC2 → EBITDA), **selo de fonte** (rascunho local × valores gravados), **barra de progresso** "X de Y linhas obrigatórias" e **Verificações da controladoria** em formato checklist (`pass`/`warn`/`fail` traduzido em [`formatters.ts`](../src/utils/formatters.ts) via `formatValidationStatusLabel` / `getValidationSeverity`). Sem dock de conversa; em ecrã estreito mantém-se abas **Painel** e **DRE**. Link "Como ler" aponta para `/app/guide`.

#### Speech layer PT-BR (toda a app)

- **Painel executivo** (`/app/dashboard`): **um H1** (“Painel executivo”); barra contextual sem segundo título competitivo; escopo rede como **Visão rede**; **sidebar/header** com cobertura de escopo + modo (`getActiveScopeHeadline`). KPIs na faixa **`ExecutiveKpiGrid`** com título “Situação na competência (resumo)” e `aria-label` dedicado; **freshness** com data/hora em BRT a partir do cache TanStack Query (`dataUpdatedAt`). Modo **holding**: KPIs alinhados aos filtros (`deriveHoldingView` → `DashboardPage`). **Dados:** `fetchDashboardSnapshot` agrega vistas com paginação para não truncar redes grandes — ver [`src/features/shared/portal.api.ts`](../src/features/shared/portal.api.ts). “Atualizar leitura” com `invalidateQueries({ queryKey: ['dashboard'] })` quando aplicável; tabela do radar com `.table-shell--scroll`. KPIs franchise/regional/controladoria/rede nos builders existentes (`buildFranchiseKpis` etc.). Bench e gaps: [`references/dashboard-ux-benchmark.md`](./dashboard-ux-benchmark.md); matriz UX: [`references/dashboard-scope-matrix.md`](./dashboard-scope-matrix.md).
- **Aprovações** (`/app/workflow`): título "Mesa de trabalho da controladoria", KPIs "Aguardando ação" / "Pontos abertos", botões "Assumir a revisão" / "Aprovar a DRE" / "Devolver para ajuste"; secção "O que precisa de atenção" usa o mesmo **checklist global** de severidade (`pass`/`warn`/`fail`) reaproveitando [`src/styles/components/validation-checklist.css`](../src/styles/components/validation-checklist.css).
- **Tabela de âmbito** ([`SubmissionsScopeTable.tsx`](../src/features/submissions/components/SubmissionsScopeTable.tsx)): colunas "Competência" / "Enviada em" e cabeçalho "Todas as DREs no seu acesso".
- **Hub Assistente** (`/app/assistant`): subtítulo executivo ("Os números aqui são os mesmos que aparecem em Submissões…"), strip de contexto "Você está em: {franquia} · competência {período} — modo orientação / preenchimento guiado".
- **Capturas para demo CEO**: spec opcional [`tests/e2e/demo-screenshots.spec.ts`](../tests/e2e/demo-screenshots.spec.ts) gera snapshots de Painel executivo, Submissões e Hub Assistente quando `E2E_DRE_EMAIL`/`E2E_DRE_PASSWORD` estão definidos. Saída em `tests/e2e/__screenshots__/` (já no `.gitignore`).
- Painel **Assistente DRE** (só no hub `/app/assistant`): thread com bolhas (paleta Febracis: azul / dourado / âmbar), área de mensagens com fundo “canvas” e **compositor fixo** (dock) com foco visível, autoaltura do texto e **Enter** envia / **Shift+Enter** nova linha.
- Atalhos tipo **Olá** e chips ghost; `prefers-reduced-motion` desliga animações de entrada, brilho pendente e rotação do ícone de carregamento.
- Tokens CSS: prefixo `--chat-*` em [`src/styles/tokens.css`](../src/styles/tokens.css); estilos em [`SubmissionsPage.css`](../src/features/submissions/SubmissionsPage.css) (partilhados com o hub).
- **Hub Assistente** (`/app/assistant`): modos fixos **Dúvidas** (query `tab=duvidas`; corpo opcional **`assistantProductTab: "duvidas"`** na API — força `explain_only`) e **Começar a DRE**; deep link **`?submission=<uuid>`** alinha franquia/período ao mesmo estado que **Submissões**. Botão **Assistente DRE** na página Submissões e coluna na tabela de âmbito quando o utilizador está no hub.

## Comandos de validação

```bash
npm run build
npm run lint
npm run test
npm run validate:settings
npm run validate:phase1:local
npm run smoke:prod
npm run verify:dist
```

- **`npm run smoke:prod`:** faz fetch do HTML de produção (definir `SMOKE_PROD_URL=https://febracis-dre.vercel.app`) e procura `supabase.co` / project ref `vwxgrjjwbvdiaqxqbryk` nos chunks JS. Com **`SMOKE_STRICT=1`**, falha com exit code 1 se o bundle público não contiver evidência Supabase (útil em CI após deploy).
- **`npm run verify:dist`:** após `npm run build`, valida `dist/assets/*.js` quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão definidos no processo (ex. `vercel env run -e production -- npm run build` seguido do mesmo prefixo no script), ou use **`FORCE_VERIFY_DIST=1`** para forçar a checagem do `dist` já gerado.

E2E (após `npx playwright install`): `npm run test:e2e` — o `playwright.config.ts` injeta `VITE_SUPABASE_*` de placeholder no processo do `npm run dev` usado pelos testes, para o bundle não abortar em ambientes **sem** `.env.local` (smoke de UI; não valida ligação ao Supabase real).

- **Auditoria lógica / RBAC / sincronização:** [`references/audit-app-logic-2026-05-08.md`](./audit-app-logic-2026-05-08.md) — matriz rotas/menu, chaves TanStack Query, contrato assistente, correções aplicadas, gates (`lint`, `build`, `test`, E2E) e checklist manual por papel.

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
| `/app/assistant` | `franchise_user`, `regional_manager`, `finance_controller`, `executive`, `system_admin` | Hub Assistente DRE: modos **Dúvidas** (`tab=duvidas`, API `assistantProductTab: "duvidas"` → `explain_only`) e **Começar a DRE**; `?submission=<uuid>` como âncora |
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
| Dashboard | [`DashboardPage.tsx`](../src/features/dashboard/DashboardPage.tsx), [`HoldingCockpitView.tsx`](../src/features/dashboard/HoldingCockpitView.tsx), [`holdingDerivations.ts`](../src/features/dashboard/holdingDerivations.ts) |
| Submissões + assistente | [`SubmissionsPage.tsx`](../src/features/submissions/SubmissionsPage.tsx), [`AssistantPage.tsx`](../src/features/submissions/AssistantPage.tsx) (rota `/app/assistant`), [`DreAssistantPanel.tsx`](../src/features/submissions/DreAssistantPanel.tsx), [`useSubmissionsWorkspace.ts`](../src/features/submissions/useSubmissionsWorkspace.ts), [`api/dre-agent.ts`](../api/dre-agent.ts) |
| API portal | [`src/features/shared/portal.api.ts`](../src/features/shared/portal.api.ts) |
| Design tokens | [`src/styles/tokens.css`](../src/styles/tokens.css), componentes em [`src/styles/components/`](../src/styles/components/) |

## Escopos de dashboard (derivados do papel + escopos)

Lógica em `resolveDashboardScope`: `controladoria` (finance_controller), `holding` (admin executivo / rede — **rótulo UI “Visão rede”**, não “Holding”), `regional`, `franchise`. Detalhes de blocos/CTAs: [`references/dashboard-scope-matrix.md`](./dashboard-scope-matrix.md).
