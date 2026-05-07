# Lessons

## 2026-05-07 (Vercel CLI — troca de conta)

### [CLI Vercel local agora autenticada na conta dona de `deivithis-projects`]

**Trigger:** A CLI estava logada como `deivithilopes-6933` (Febracis pessoal) e nao tinha acesso ao team `deivithis-projects`, dono do projeto `prj_TRfWzt0jvjnqmGynfr6hKTC1qDyq` e do alias `https://febracis-dre.vercel.app`.
**Instinct:** Rodar `vercel logout` + `vercel login` no shell e abrir o link `vercel.com/oauth/device?...` em janela anonima (ou apos deslogar do `deivithilopes-6933` em vercel.com) para autorizar com a conta `deivithi74@gmail.com`. Validar com `vercel whoami` (`deivithi`), `vercel teams ls` (`deivithis-projects`), `vercel project inspect febracis-dre` e `vercel env ls`.
**Fonte:** Plano "Trocar a conta autenticada na Vercel CLI local" 2026-05-07
**Data:** 2026-05-07

### [Production no projeto febracis-dre tem 4 envs configuradas; checklist documentado pede 9]

**Trigger:** `vercel env ls` mostrou em Production apenas `OPENROUTER_MODEL`, `OPENROUTER_API_KEY`, `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_URL`. Faltam `OPENROUTER_APP_URL`, `AGENT_RATE_LIMIT_*` (3) e `ADMIN_PROVISION_ALLOWED_ORIGINS`.
**Instinct:** Confirmar com `vercel env ls` antes de redeploy; o handler `api/dre-agent.ts` faz fail-open quando o gate de rate limit nao tem RPC/env, mas o produto fica sem 429 real. Tratar como pendencia da Fase 2 do plano "Investigar e Arrumar Tudo 100%".
**Fonte:** Plano "Trocar a conta autenticada na Vercel CLI local" 2026-05-07
**Data:** 2026-05-07

## 2026-05-07 (Vercel/GitHub/Supabase — reconciliacao operacional)

### [A Vercel acessivel via MCP/CLI e a Vercel documentada podem ser contas diferentes]

**Trigger:** A documentacao apontava para `deivithilopes-6933s-projects`/`febracis-dre-rho`, mas o MCP autenticado listou apenas `deivithis-projects` com o projeto real `prj_TRfWzt0jvjnqmGynfr6hKTC1qDyq` e alias `https://febracis-dre.vercel.app`.
**Instinct:** Antes de qualquer deploy, listar teams/projetos pela ferramenta autenticada atual e cruzar com `.vercel/project.json`; se contradizer a doc, tratar a doc como drift ate reconciliar.
**Fonte:** Plano “Investigar e Arrumar Tudo 100%” 2026-05-07
**Data:** 2026-05-07

### [Repositorio Git dentro do OneDrive pode perder ficheiros rastreados]

**Trigger:** O working tree apareceu com deletes-fantasma em `auth.types.ts`, `HoldingCockpitView.tsx`, `navigation.ts` e migrations `004/005`, enquanto os ficheiros existiam no HEAD/GitHub.
**Instinct:** Manter repo Git fora do OneDrive (`C:/Repos/...`) para desenvolvimento ativo; se surgir `D` inesperado em muitos ficheiros, fazer backup branch/tag antes de resetar.
**Fonte:** Plano “Sincronizar Vercel, GitHub e Máquina” 2026-05-07
**Data:** 2026-05-07

### [Filter-branch removeu workflows e quebrou ancestral comum entre clones]

**Trigger:** O `main` local antigo e `origin/main` do GitHub tinham 35/29 commits exclusivos, apesar de representarem mudanças parecidas, por reescrita de historico sem `.github/workflows`.
**Instinct:** Antes de comparar ou resetar, criar branch/tag de backup; para restaurar CI, pedir scope `workflow` com `gh auth refresh -h github.com -s workflow`.
**Fonte:** Plano “Sincronizar Vercel, GitHub e Máquina” 2026-05-07
**Data:** 2026-05-07

### [Supabase CLI e Supabase MCP podem ter permissoes diferentes]

**Trigger:** `npx supabase link --project-ref vwxgrjjwbvdiaqxqbryk` falhou por access-control, mas o MCP Supabase conseguiu listar o projeto e aplicar migrations `015/016`.
**Instinct:** Quando CLI negar acesso, verificar MCP antes de declarar bloqueio; quando usar MCP para DDL, confirmar depois com `list_migrations`.
**Fonte:** Plano “Investigar e Arrumar Tudo 100%” 2026-05-07
**Data:** 2026-05-07

## 2026-04-28 (frontend — resiliência Supabase + smoke de bundle)

### [Não lançar erro no import de `supabase.ts`; tratar env ausente como estado]

**Trigger:** Produção servia bundle sem `VITE_*`; `throw` no carregamento do módulo impedia o React de montar (`#root` vazio).
**Instinct:** Expor `getSupabaseConfig()` / `getSupabaseClient()`, proxy lazy para imports legados, `AuthProvider` com `supabaseMisconfigured`, login com alerta bloqueante, `AppErrorBoundary` + `renderOperationalErrorToRoot` no bootstrap.
**Fonte:** Plano “Corrigir Portal DRE” 2026-04-28
**Data:** 2026-04-28

### [Smoke objetivo do bundle público: `npm run smoke:prod` + `SMOKE_STRICT=1`]

**Trigger:** Alias pode servir deploy antigo sem Supabase embutido; diagnóstico manual era frágil.
**Instinct:** Script `scripts/smoke-prod-bundle.mjs` reporta `hasUrl`, `hasProjectRefInBundle`, hashes curtos dos chunks; `scripts/verify-dist-supabase.mjs` valida `dist/` após build com `VITE_*` ou `FORCE_VERIFY_DIST`.
**Fonte:** Plano “Corrigir Portal DRE” 2026-04-28
**Data:** 2026-04-28

## 2026-04-28 (produção — rotação manual de chaves)

**Rotação (sem automatizar no repositório — nunca gravar segredos em ficheiros):**

1. **Supabase (projeto `vwxgrjjwbvdiaqxqbryk`):** no dashboard, *Project Settings → API*, gerar/rotação conforme política da equipa do *anon key* e *service_role*; atualizar em **Vercel → febracis-dre → Settings → Environment Variables** as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (e qualquer secret server-side que use o service role); fazer **Redeploy** em Production.
2. **OpenAI ou OpenRouter:** no respetivo dashboard do fornecedor, revogar/criar nova API key; em Vercel Production definir `OPENAI_API_KEY` **ou** `OPENROUTER_API_KEY` (consoante o backend usa API nativa ou OpenRouter), alinhar `OPENAI_MODEL` / `OPENROUTER_MODEL` se necessário; **Redeploy**.
3. **Validação pós-rotação:** smoke no browser (login + submissão), chamada de teste a `/api/dre-agent` com sessão válida, e verificação de logs Vercel/Supabase para erros 401/403 por chave errada.

**Data:** 2026-04-28

## 2026-04-28 (migrations — colisão 015 GitHub vs workspace)

### [Duas migrations diferentes não podem partilhar o número `015` no mesmo histórico local]

**Trigger:** O clone do `main` no GitHub trazia `015_harden_audit_log_insert.sql` enquanto o workspace canónico já tinha `015_agent_rate_limits.sql` (rate limit do assistente).
**Instinct:** Renumerar o hardening de `audit_log` para **`016_harden_audit_log_insert.sql`**, documentar em `project-context.md` e antecipar reconciliação com o remoto no próximo `push` (o `main` remoto pode ainda ter o ficheiro como 015).
**Fonte:** Incorporação `febracis-dre2` → workspace 2026-04-28
**Data:** 2026-04-28

## 2026-04-28 (doc / envs de build)

### [Sem `VITE_SUPABASE_ANON_KEY` no build de produção, `supabase.ts` lança e a SPA não monta]

**Trigger:** Migração Vercel com **7/9** variáveis em Production; `VITE_SUPABASE_URL` existe mas falta a chave anónima no bundle.
**Instinct:** Tratar `VITE_SUPABASE_URL` **e** `VITE_SUPABASE_ANON_KEY` como par obrigatório no dashboard **antes** de considerar a app utilizável no browser; redeploy após acrescentar `VITE_*`.
**Fonte:** Sincronização doc pós-deploy 2026-04-28
**Data:** 2026-04-28

## 2026-04-27 (destravar envs + deploy CLI)

### [Vercel Preview com branch exige repositório Git ligado ao projeto]

**Trigger:** `vercel env add ... preview` devolveu *Project does not have a connected Git repository* ao passar branch `main`.
**Instinct:** Ligar o repo no dashboard (secção Git) **antes** de duplicar envs para Preview; até lá, produção pode usar só `Production` envs.
**Fonte:** Sessão destravar produção 2026-04-27
**Data:** 2026-04-27

### [`vercel deploy` remoto falhou com `deploy_failed` e mensagem vazia; `vercel build --prod` local OK]

**Trigger:** Várias tentativas `npx vercel deploy --prod --yes` e `--prebuilt` após `vercel build --prod` local.
**Instinct:** Inspecionar o *deployment* na dashboard, tentar *Redeploy* a partir de um build conhecido, ou abrir ticket se o erro persistir sem logs.
**Fonte:** Sessão destravar produção 2026-04-27
**Data:** 2026-04-27

## 2026-04-27 (migração Vercel)

### [Migração de team Vercel exige re-criar todas as variáveis no projeto novo]

**Trigger:** Deploy na conta `richardrios10000-5421s-projects` concluiu com `npx vercel@latest deploy --prod --yes`, mas `vercel env ls` listou **zero** variáveis — o bundle não recebe `VITE_*` sem configuração explícita.
**Instinct:** Sempre, ao mudar de team/projeto, copiar a tabela de `references/operacoes-pendentes-supabase-vercel-2026-04-27.md` e preencher Production (e Preview se necessário) antes de considerar a app “viva” em produção; redeploy após inserir env.
**Fonte:** Rodada 2026-04-27 encerramento
**Data:** 2026-04-27

### [Supabase CLI exige `supabase login` ou `SUPABASE_ACCESS_TOKEN` para `link` e `db push`]

**Trigger:** `npx supabase link --project-ref vwxgrjjwbvdiaqxqbryk` falhou com *Access token not provided*.
**Instinct:** Em CI ou no portátil, exportar `SUPABASE_ACCESS_TOKEN` (token de acesso pessoal) **ou** correr `supabase login` interativo antes de `db push` para aplicar a migration 015.
**Fonte:** Rodada 2026-04-27 encerramento
**Data:** 2026-04-27

### [CORS da Edge Function deve incluir o novo domínio no mesmo passo do deploy Vercel]

**Trigger:** Plano pós-migração: `ADMIN_PROVISION_ALLOWED_ORIGINS` no Supabase deve listar o alias novo (`https://febracis-dre-phi.vercel.app`) para o fluxo de aprovisionamento admin não quebrar.
**Instinct:** Atualizar o secret imediatamente após o primeiro deploy com URL definitiva, não na semana seguinte.
**Fonte:** Rodada 2026-04-27 encerramento
**Data:** 2026-04-27

## 2026-04-27

### [Playwright precisa de VITE_SUPABASE_* no webServer para o Vite não abortar]

**Trigger:** `npm run test:e2e` subia o dev server sem `.env.local`, o módulo `src/lib/supabase.ts` lançava e a UI não renderizava (testes falhavam).
**Instinct:** No `playwright.config.ts`, passar `env` no `webServer` com URL/anon key placeholder (ou usar `process.env` quando o CI tiver segredos), documentar que o smoke é de **UI** e não valida API Supabase.
**Dominio:** Testes E2E
**Fonte:** Rodada refator Submissões
**Data:** 2026-04-27

### [SubmissionsPage: componentes + hook em vez de um único ficheiro gigante]

**Trigger:** Critério de manutenção (<25 KB no `SubmissionsPage.tsx`) e diff reviável.
**Instinct:** Extrair `SubmissionToolbar`, `AssistantDock`, `DreStatementSection`, `SubmissionKpiSection`, `SubmissionWorkbenchRail`, `SubmissionsScopeTable` e mover o estado/lógica para `useSubmissionsWorkspace.ts`; `currencyInput.ts` para utilitários de máscara.
**Dominio:** Frontend
**Fonte:** Rodada refator Submissões
**Data:** 2026-04-27

## 2026-03-28

### [Serverless Vercel exige imports ESM explicitos entre api e src]

**Trigger:** O preview da Vercel publicou o frontend, mas falhou ou degradou a compilacao da function `api/dre-agent.ts` por imports relativos sem extensao `.js` e por depender de `@vercel/node` fora do pacote publicado.
**Instinct:** Ao criar functions em `api/` neste projeto, SEMPRE usar tipos locais minimos no handler e imports ESM com extensao `.js` ao apontar para modulos TypeScript em `src/`.
**Dominio:** Deploy
**Fonte:** Correcao interna
**Data:** 2026-03-28

### [Confirmar o projeto Supabase canonico antes de planejar ambiente novo]

**Trigger:** O usuario corrigiu o escopo e esclareceu que o unico projeto permitido e o Supabase do `DRE FEBRACIS`, nao qualquer outro projeto da conta.
**Instinct:** Quando houver mais de um projeto Supabase visivel na conta, SEMPRE confirmar pelo nome canonico do produto e pelo `project_ref` vinculado antes de propor criacao, migracao ou alteracao de ambiente.
**Dominio:** Deploy
**Fonte:** Correcao do usuario
**Data:** 2026-03-28

### [Nao colapsar a hero premium cedo demais]

**Trigger:** O usuario corrigiu o enquadramento da landing porque o card de acesso ficou fora do eixo visual esperado em desktop medio.
**Instinct:** SEMPRE validar composicoes premium em breakpoints intermediarios antes de empilhar a estrutura em uma unica coluna.
**Dominio:** Browser
**Fonte:** Correcao do usuario
**Data:** 2026-03-28

### [Nao redesenhar quando o pedido for apenas posicional]

**Trigger:** O usuario pediu somente para mover o login entre o texto e o Paulo, e a composicao foi redesenhada alem do necessario.
**Instinct:** Quando o usuario aprovar a direcao visual e pedir um microajuste, SEMPRE preservar a composicao validada e mover apenas o elemento solicitado.
**Dominio:** Browser
**Fonte:** Correcao do usuario
**Data:** 2026-03-28

### [Nao trocar o ativo visual aprovado por outro parecido]

**Trigger:** O usuario pediu para ampliar a presenca da imagem de fundo ja aprovada do Paulo, e a implementacao trocou para outro recorte visual.
**Instinct:** Quando o usuario pedir ajuste de escala ou enquadramento em uma composicao aprovada, SEMPRE manter o mesmo asset e trabalhar apenas tamanho, posicao, opacidade e recorte.
**Dominio:** Browser
**Fonte:** Correcao do usuario
**Data:** 2026-03-28

### [Nao tratar foto editorial de hero como faixa lateral]

**Trigger:** O usuario corrigiu a landing porque o Paulo ainda parecia uma imagem recortada e colada na direita, mesmo usando o asset certo.
**Instinct:** Em heros com fotografia editorial aprovada, SEMPRE compor a foto como plano integral do viewport com mascaramento e validacao em multiplos breakpoints, nunca como uma faixa isolada deslocada para um canto.
**Dominio:** Browser
**Fonte:** Correcao do usuario
**Data:** 2026-03-28

### [Nao usar o mesmo offset para desktop amplo e ultra-wide]

**Trigger:** O usuario marcou uma area exata no print para o card de login e o mesmo deslocamento horizontal nao funcionou ao mesmo tempo em `1680px` e em telas ultra-wide.
**Instinct:** Quando um elemento flutuante precisa ocupar um vazio especifico da hero, SEMPRE calibrar o posicionamento por faixa de viewport e validar contra a area anotada pelo usuario, em vez de aplicar um unico offset para todos os desktops grandes.
**Dominio:** Browser
**Fonte:** Correcao do usuario
**Data:** 2026-03-28

### [Nao encerrar revisao de copy sem validar o fluxo autenticado e o bundle]

**Trigger:** O usuario encontrou `Configuracoes`, `Aprovacoes` e `Submissoes` ainda quebrados na aplicacao mesmo apos uma rodada anterior marcada como concluida.
**Instinct:** Quando a tarefa for revisao editorial global, SEMPRE validar as areas autenticadas e buscar as strings finais em `dist/assets` apos o build; leitura parcial de codigo ou checagem de uma unica tela nao e suficiente para declarar a copy fechada.
**Dominio:** Browser
**Fonte:** Correcao do usuario
**Data:** 2026-03-28

### [Sempre sincronizar a skill ao fim de cada etapa]

**Trigger:** O usuario reforcou que o ponto de parada e os proximos passos do `febracis-dre` precisam ficar refletidos na skill persistente ao final de cada bloco concluido.
**Instinct:** Ao concluir qualquer etapa relevante neste projeto, SEMPRE atualizar a skill `febracis-dre-especialista` com estado atual, ultima entrega publicada e proximo bloco esperado antes de considerar o checkpoint encerrado.
**Dominio:** Processo
**Fonte:** Correcao do usuario
**Data:** 2026-03-28

### [Reautenticar smoke user apos reprovisionar acesso com senha]

**Trigger:** O runner de configuracoes falhou porque a troca de coligada reaplicou senha/metadados no mesmo usuario e a sessao anterior ficou invalida.
**Instinct:** Quando um smoke user for reprovisionado via `admin-provision-user` com `password`, SEMPRE abrir uma nova sessao antes de continuar os probes dependentes daquele login.
**Dominio:** Supabase
**Fonte:** Correcao interna
**Data:** 2026-03-28
