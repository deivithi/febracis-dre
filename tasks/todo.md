# TODO - 2026-03-28

## Rodada 2026-04-27 (encerramento) — Migração Vercel + deploy + doc

### Plano

- **HEAD do repo da app:** não fixar hash aqui — na raiz de `febracis-dre/` correr `git log -1 --oneline` ao fechar uma rodada de doc/deploy.
- [x] Pre-flight: `vercel whoami` → `richardrios10000-5421`; build local `lint` + `test` + `build` verde
- [x] Deploy produção na conta destino: `npx vercel@latest deploy --prod --yes` → alias **`https://febracis-dre-phi.vercel.app`**, deployment `dpl_HK91SCXq2wRd8iNZWkqmSvnguYYd`
- [x] Documentação e `.env.example` alinhados ao novo alias; guia [`references/operacoes-pendentes-supabase-vercel-2026-04-27.md`](../references/operacoes-pendentes-supabase-vercel-2026-04-27.md) para secrets Vercel + Supabase (requer credenciais locais)
- [ ] Migration `015` aplicada no Supabase remoto — **pendente** (`supabase login` / `SUPABASE_ACCESS_TOKEN` em falta no agente); seguir guia acima
- [x] Variáveis de ambiente no projeto Vercel (parcial) — **2026-04-27:** 7/9 em Production (faltam `VITE_SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`; `.env.local` ausente no workspace do agente). Preview bloqueado sem Git no projeto Vercel.
- [ ] `npx vercel deploy --prod` com sucesso após adicionar segredos e validar build remoto — **tentativas 2026-04-27 falharam** (`deploy_failed`); usar *Redeploy* no dashboard ou investigar logs
- [ ] Smoke manual em produção (login, assistente, rate limit 429, CORS admin) — **após** `VITE_SUPABASE_ANON_KEY` + migration 015

### Critérios de aceite (encerramento)

- [x] `npm run lint`, `npm run test`, `npm run build` verdes na máquina de implementação
- [x] Deploy Vercel READY com URL de produção e alias documentados
- [ ] Migration `015` + `supabase migration list --linked` confirmando `015` no remoto
- [ ] `npx vercel@latest env ls` com as 9 variáveis (Production; Preview após Git) — hoje **7** em Production
- [x] `project-context.md` + `README` + referência operacional atualizados

---

## Rodada 2026-04-27 — CI, rate limit, gap Despesas Variáveis (doc), refator Submissões

### Plano

- [x] PR1: GitHub Actions (`lint`, `test`, `build`, `audit` informativo) — mergeado
- [x] PR2: Rate limit do assistente via `fn_agent_rate_check` (migration `015`) — mergeado
- [x] PR3: Documento [`docs/gap-despesas-variaveis-2026-04-27.md`](../docs/gap-despesas-variaveis-2026-04-27.md) + reunião Controladoria (agendar)
- [x] PR4: Extrair componentes de `SubmissionsPage.tsx` (Toolbar, DreStatementSection, AssistantDock, rail/KPI/scope, hook `useSubmissionsWorkspace`) + smoke E2E (placeholder Supabase no `playwright.config`)
- [ ] **PR5 (condicional):** implementação de linhas/motor só após OK explícito da Controladoria (ver doc acima)

### Critérios de aceite (rodada)

- [x] CI verde na `main` em push/PR
- [ ] Migration `015` aplicada no Supabase **DRE FEBRACIS** (rate limit real; sem RPC = fail-open no API) — ver `references/operacoes-pendentes-supabase-vercel-2026-04-27.md`
- [x] Deploy produção: `npx vercel@latest deploy --prod --yes` (alias `https://febracis-dre-phi.vercel.app`, team `richardrios10000-5421s-projects`) — 2026-04-27
- [x] Doc de gap revisado pelo PO
- [x] Refator sem alterar contratos de API/assistente

---

> **URLs históricas:** secções abaixo que citam `https://febracis-dre.vercel.app` referem o **team legado** (`deivithis-projects`) antes da migração 2026-04-27. Produção operacional atual: **`https://febracis-dre-phi.vercel.app`** (`richardrios10000-5421s-projects`) — `references/project-context.md`.

## Rodada Atual - Cockpit Executivo e Assistente DRE

### Plano

- [x] Conectar o cockpit executivo filtravel na visao `holding` sem romper as demais visoes do dashboard.
- [x] Integrar o Assistente DRE ao workspace de `Submissoes`, reaproveitando os campos oficiais, o preview e o save oficial da DRE.
- [x] Criar persistencia remota da memoria do assistente no mesmo projeto Supabase do `DRE FEBRACIS`.
- [x] Validar build, lint e o gate regressivo da fase pesada apos a integracao.
- [x] Publicar a rodada em preview e em producao para demonstracao executiva.

### Criterios de Aceite

- [x] O `holding` passa a ter filtros por competencia, regional e unidade no dashboard principal.
- [x] O `Submissoes` passa a ter um assistente visivel e funcional no espaco lateral direito.
- [x] O assistente conversa com memoria persistente por submissao e nao cria campo nem calculo paralelo fora da DRE oficial.
- [x] O assistente atualiza somente os mesmos `line_code` editaveis que ja alimentam o motor oficial da DRE.
- [x] O fluxo continua respeitando bloqueio de escrita quando a submissao esta travada.
- [x] `npm run build`, `npm run lint` e `npm run validate:phase1:local` passam no estado final.
- [x] O deploy em preview e a publicacao na URL oficial concluem sem erro.

### Revisao

- [x] O dashboard `holding` agora renderiza `HoldingCockpitView` com filtros executivos e radar do recorte.
- [x] A migration `014_agent_sessions_and_messages.sql` foi aplicada no Supabase remoto `vwxgrjjwbvdiaqxqbryk`.
- [x] O `Submissoes` ganhou `DreAssistantPanel`, sessao persistente, historico de mensagens, referencias e integracao com `/api/dre-agent`.
- [x] O endpoint `api/dre-agent.ts` opera em modo deterministico local quando `OPENROUTER_API_KEY` nao esta configurada.
- [x] O smoke manual na URL oficial confirmou login, cockpit executivo visivel e assistente respondendo com bloqueio de escrita respeitado em submissao travada.
- [x] A rodada foi publicada em producao em `https://febracis-dre.vercel.app`.
- [x] O `OPENROUTER_API_KEY` e o `OPENROUTER_MODEL=openrouter/free` foram configurados em producao na Vercel e o endpoint oficial respondeu com `mode = llm`.
- [x] O smoke em submissao editavel confirmou o ciclo completo `LLM -> campo oficial -> preview -> save -> DRE oficial`, com reversao do valor ao estado original ao final.

### Notas

- A camada oficial de calculo continua no backend existente; o assistente apenas escreve nos `line_code` editaveis e deixa `MC1`, `MC2`, `EBITDA 1` e `EBITDA 2` sob o motor SQL oficial.
- O endpoint do assistente usa LangGraph + LangChain + OpenRouter-ready path; em producao, a URL oficial ja responde em modo `llm` com `openrouter/free`, mantendo o fallback deterministico apenas para ambientes sem `OPENROUTER_API_KEY`.
- Foi preciso alinhar imports ESM com extensao `.js` entre `api/` e `src/` para a compilacao das serverless functions na Vercel.
- O preview validado desta rodada foi `https://febracis-qn3op8k2g-deivithis-projects.vercel.app`.
- O deploy de producao desta rodada gerou `https://febracis-42u4wgc9x-deivithis-projects.vercel.app` e foi aliasado para `https://febracis-dre.vercel.app`.
- A configuracao real do OpenRouter foi validada por chamada autenticada ao endpoint oficial `/api/dre-agent`, que retornou `mode = llm`, `focusLineCode = variable_card_fees` e resposta contextual usando o modelo roteado.
- O smoke funcional em producao foi aprofundado em `Febracis Fortaleza Demo` (`pending_adjustment`): o assistente atualizou `gross_revenue` para `411000`, o preview refletiu `R$ 411.000,00`, o save oficial propagou o valor para a DRE calculada, e depois o valor foi revertido para `R$ 410.000,00` para preservar o demo.
- Novo deploy de producao apos a configuracao do OpenRouter: `https://febracis-368ddfl8z-deivithis-projects.vercel.app`.
- Proximo passo da fase:
  - expandir o smoke do assistente para um caso editavel completo em submissao `draft` ou `pending_adjustment`
  - se desejado, adicionar `OPENROUTER_API_KEY` tambem no escopo `Preview` da Vercel

## Rodada Atual - Publicacao Segura da Documentacao no GitHub

### Plano

- [x] Confirmar se o projeto `febracis-dre` ja existe no GitHub e validar se o repositorio esta privado.
- [x] Executar varredura de seguranca na documentacao para evitar commit de chaves, senhas e artefatos temporarios.
- [x] Sincronizar a documentacao com o estado real do produto antes do push.
- [x] Publicar README, `docs/`, `tasks/` e ajustes de `.gitignore` no repositorio privado.
- [x] Confirmar o link final do GitHub para compartilhamento interno.

### Criterios de Aceite

- [x] O repositorio remoto do projeto foi confirmado como privado.
- [x] Nenhuma chave de API, senha ou credencial entrou no commit.
- [x] A documentacao publicada descreve corretamente o estado atual do cockpit executivo, do assistente DRE e dos gates de validacao.
- [x] O link do GitHub pode ser compartilhado com seguranca dentro do contexto interno.

### Revisao

- [x] `origin` confirmado em `https://github.com/deivithi/febracis-dre.git`.
- [x] `gh repo view` confirmou `isPrivate = true` no repositorio `deivithi/febracis-dre`.
- [x] A varredura em `README.md`, `docs/`, `tasks/`, `.env.example` e `.gitignore` nao encontrou chaves nem credenciais reais.
- [x] A documentacao operacional foi sincronizada com o estado real do OpenRouter em producao antes do push.
- [x] A publicacao foi feita somente no repositorio privado do projeto.

### Notas

- O push desta rodada foi restrito a documentacao e higiene de versionamento; artefatos temporarios como `.playwright-cli` e `supabase/.temp/` permaneceram ignorados.
- O link compartilhavel do repositorio e `https://github.com/deivithi/febracis-dre`.
- Commit publicado desta rodada: `57c04b1` (`docs: publish validated project documentation`).

## Rodada Atual - Dashboard Executivo e Agente Guiado DRE

### Plano

- [x] Confirmar no codigo qual rota e o dashboard principal atual e quais visoes ja existem por papel (`franchise`, `regional`, `holding`, `controladoria`).
- [x] Mapear os gaps entre o dashboard `holding` atual e o cockpit executivo desejado, com filtros por regional e franquia.
- [x] Pesquisar fontes oficiais e repositorios de referencia para RAG, memoria persistente, HITL e orquestracao com LangChain, LangGraph e OpenRouter.
- [x] Definir uma arquitetura-alvo sincronizada com o app atual, separando claramente dashboard executivo, workspace operacional e agente guiado do franqueado.
- [x] Consolidar um plano em fases com criterio de pronto para apresentacao, riscos, dependencias e recomendacao de stack.

### Critérios de Aceite

- [x] Ficar claro qual e o dashboard principal hoje e qual deve ser o dashboard principal futuro para `admin/holding`.
- [x] Ficar definido como o dashboard executivo filtrara regionais e unidades sem violar o isolamento atual por escopo.
- [x] Ficar definido como o agente guiado substituira excesso de botoes sem romper o workflow oficial de submissao.
- [x] Ficar definida a estrategia de memoria persistente, RAG, auth e sincronizacao com o Supabase atual.
- [x] O plano final citar apenas referencias confiaveis e atualizadas, priorizando documentacao oficial e repositorios oficiais.

### Revisao

- [x] Foi confirmado no codigo que o dashboard principal atual ja e `/app/dashboard`, com visoes distintas para `franchise`, `regional`, `holding` e `controladoria`.
- [x] O gap real encontrado esta no `holding`: hoje existe consolidado, ranking e fila, mas ainda nao existe cockpit executivo filtravel por competencia, regional e franquia.
- [x] A rota `Submissoes` foi confirmada como workspace operacional da DRE e principal ponto de friccao para a jornada assistida do franqueado.
- [x] A recomendacao arquitetural desta rodada foi registrada em `docs/plano-dashboard-executivo-e-agente-dre-2026-03-28.md`.
- [x] O plano fechou com stack recomendada (`LangGraph + LangChain + OpenRouter + Supabase + pgvector`) e com rollout por fases para evitar retrabalho antes da apresentacao.

### Notas

- Recomendacao principal de implementacao: manter o frontend atual em React/Vite e criar um `Agent Service` separado para a orquestracao do agente, sem mover a origem oficial do dado para fora do backend atual.
- Recomendacao principal de UX: transformar `/app/dashboard` no cockpit executivo de `admin/holding` e transformar `/app/submissions` no workspace guiado do franqueado.
- Recomendacao principal de persistencia: usar Postgres/pgvector do proprio Supabase para memoria e base vetorial, evitando `Vector Buckets` nesta primeira versao user-facing porque a feature esta em alpha.
- Recomendacao principal de seguranca: evitar SQLite em producao para store/checkpointer e manter namespace forte por usuario, franquia e contexto operacional.

## Rodada Atual - Configuracoes e Isolamento por Coligada

### Plano

- [x] Revisar a trilha de configuracoes para tratar `franchises.code` como o codigo operacional da coligada nesta fase.
- [x] Endurecer a tela administrativa para deixar papel, escopo, regional e coligada claros no momento da liberacao do acesso.
- [x] Corrigir a view administrativa para expor o escopo efetivo com mais consistencia no diretorio de usuarios.
- [x] Criar uma validacao automatizada especifica da area de configuracoes para provar isolamento por coligada, troca de unidade e leitura por perfil.
- [x] Atualizar documentacao, checkpoint e evidencias com foco na apresentacao de segunda-feira.

### Critérios de Aceite

- [x] O admin consegue identificar a unidade pelo codigo da coligada no momento de conceder ou editar um acesso.
- [x] Um `franchise_user` vinculado a uma coligada enxerga apenas a propria unidade em franquias, submissoes e dashboard.
- [x] A troca de coligada do mesmo usuario atualiza imediatamente o conjunto de dados visiveis.
- [x] Um `regional_manager` enxerga apenas as unidades da regional vinculada.
- [x] Um `viewer` continua em modo leitura, respeitando o mesmo isolamento por escopo.
- [x] `npm run build`, `npm run lint` e a nova validacao de configuracoes passam no estado final.

### Revisao

- [x] A tela `Configuracoes` agora mostra o codigo da coligada no fluxo de concessao, com busca por unidade e resumo da liberacao antes do save.
- [x] A migration `013_access_directory_effective_scope.sql` atualizou `vw_user_access_directory` para expor `scope_type` e `regional_id` efetivos mesmo quando a regional vem da coligada.
- [x] O runner `scripts/validate-access-settings.mjs` provou isolamento por coligada, troca de unidade, leitura regional e modo leitura do viewer no projeto remoto `vwxgrjjwbvdiaqxqbryk`.
- [x] `npm run build`, `npm run lint` e `npm run validate:settings` passaram no estado final desta rodada.

### Notas

- O codigo operacional da coligada nesta fase e `franchises.code`; o backend continua aplicando isolamento real por `franchise_id` e `regional_id`.
- O relatorio verde da rodada ficou em `output/validation/configuracoes-coligada-2026-03-28T21-30-03-650Z.md`.
- A area de acessos ganhou `data-testid` e resumo visual para facilitar smoke repetivel e demonstracao para diretoria.
- O demo remoto foi restaurado ao estado padrao ao final do runner, e os usuarios smoke ficaram reapontados para IDs validos do seed atual.
- A sidebar recebeu calibracao final da marca Febracis com mais presenca visual, tom dourado e deploy em producao concluido em `https://febracis-dre.vercel.app`.

## Rodada Atual - Diagnostico do Ambiente Supabase

### Plano

- [x] Confirmar se o `febracis-dre` ja estava ligado a um projeto remoto do Supabase.
- [x] Validar se as migrations e Edge Functions principais ja existem no remoto atual.
- [x] Tentar criar um novo projeto isolado, sem excluir nem alterar o ambiente atual.
- [x] Consolidar o bloqueio real e o proximo caminho seguro.

### Revisao

- [x] O repositório ja estava vinculado ao projeto remoto `vwxgrjjwbvdiaqxqbryk`.
- [x] O remoto atual ja possui as migrations `001` a `010` aplicadas e a function `admin-provision-user` ativa.
- [x] A criacao de um novo projeto foi tentada pela CLI oficial e falhou por limite de projetos free na conta.
- [x] Nenhum ambiente existente foi apagado nem alterado nesta rodada.

### Notas

- `supabase/config.toml` e `.env.local` apontam para o mesmo projeto remoto `vwxgrjjwbvdiaqxqbryk`.
- O usuario corrigiu o escopo desta trilha: o unico projeto permitido para operacao e o Supabase do `DRE FEBRACIS`, que no workspace atual corresponde ao projeto remoto `febracis-dre`.
- A migration `011_submission_lock_and_dre_validation.sql` foi aplicada com sucesso no projeto remoto `vwxgrjjwbvdiaqxqbryk`.
- A migration `012_fix_audit_trigger_status_guard.sql` tambem foi aplicada com sucesso no mesmo projeto remoto.
- `supabase migration list --linked` agora confirma `001` a `012` aplicadas no remoto do `DRE FEBRACIS`.
- `supabase functions list` confirmou `admin-provision-user` publicada no remoto atual.
- A tentativa de criar o novo projeto `febracis-dre-hml-20260328` falhou com a mensagem de limite de `2` projetos free ativos para o usuario `deivithi`.
- Proximo caminho seguro:
  - ignorar qualquer outro projeto da conta
  - continuar somente no projeto atual do `DRE FEBRACIS`, sem excluir nada, usando a fundacao agora validada como baseline

## Rodada Atual - Fase Pesada 01: Validacao Integral do Preenchimento DRE

### Plano

- [x] Retomar o projeto a partir do checkpoint mais recente da skill `febracis-dre-especialista` e revisar o estado real do workspace.
- [x] Revalidar a base local com `build`, `lint` e guardrails antes de abrir a trilha pesada de validacao.
- [x] Mapear o estado remoto das migrations e transformar a pendencia da `011_submission_lock_and_dre_validation.sql` em gate formal da fase.
- [x] Criar um runner unico da fase para consolidar checks locais, estado remoto, prova de paridade, workflow e evidencias.
- [x] Instrumentar a interface com seletores estaveis para suportar smoke autenticado e repetivel sem fragilizar o frontend.
- [x] Documentar a execucao da fase, os prerequisitos e os artefatos gerados para futuras retomadas.
- [x] Atualizar o checkpoint operacional e o contexto persistente da skill com o novo ponto de parada.

### Revisao

- [x] Foi criado o runner `scripts/validate-dre-foundation.mjs` para executar a validacao hibrida da fase pesada.
- [x] Foram adicionados os atalhos `npm run validate:phase1`, `npm run validate:phase1:local` e `npm run validate:phase1:apply-migration`.
- [x] A documentacao operacional da fase foi registrada em `docs/validacao-da-fundacao-dre-fase-01.md`.
- [x] Foram adicionados `data-testid` estaveis nas telas de login, submissoes, workflow e admin para suportar smoke real posterior.
- [x] `npm run build`, `npm run lint`, `node scripts/verify-dre-guardrails.mjs` e `npm run validate:phase1` passaram no estado final desta rodada.
- [x] A fase pesada 01 ficou provada ponta a ponta no projeto remoto `vwxgrjjwbvdiaqxqbryk`, incluindo paridade de calculo, workflow completo, bloqueios pos-envio e leitura por perfil.

### Notas

- O runner da fase pesada carrega `.env.local`, consolida checks locais, inspeciona o estado remoto das migrations com Supabase CLI e grava evidencias em `output/validation/` nos formatos Markdown e JSON.
- Quando `DRE_ADMIN_EMAIL` e `DRE_ADMIN_PASSWORD` estiverem disponiveis, o runner provisiona usuarios temporarios pelos fluxos administrativos ja existentes e valida ponta a ponta os papeis `system_admin`, `franchise_user`, `finance_controller`, `regional_manager` e `viewer`.
- O caso canonico coberto pelo runner inclui explicitamente `event_trainer_cost`, `variable_card_fees`, `variable_logistics`, `variable_room_rent`, `marketing_gifts` e `marketing_offline`, alem da paridade entre preview, KPIs e DRE oficial do backend.
- O runner cria um periodo temporario aberto para evitar colisao com os seeds demo ja existentes, testa bloqueio apos envio, devolucao para ajuste, ressubmissao da mesma versao e aprovacao final consumida pelo dashboard.
- O estado remoto confirmado nesta rodada foi:
  - migrations `001` a `012` aplicadas no remoto vinculado
- A migration `012_fix_audit_trigger_status_guard.sql` corrigiu a trigger generica de auditoria que quebrava o resave da mesma submissao em `pending_adjustment` com o erro `record "old" has no field "status"`.
- Os comandos `supabase db push --linked` foram executados com sucesso no projeto `vwxgrjjwbvdiaqxqbryk`, sem tocar na credencial de acesso ja existente do usuario.
- O `npm run validate:phase1` fechou verde no ambiente real com autenticacao administrativa valida, seed demo controlado, provisionamento smoke, prova de workflow completo, reset e restauracao do sandbox.
- Houve uma falha transitoria em `npm run validate:phase1:local` por lock de `dist/images` durante limpeza do build; como o `build` passou na rodada seguinte do gate estrito, isso ficou caracterizado como conflito local de arquivo, nao como regressao funcional do app.
- O relatorio final verde da fase pesada ficou em `output/validation/fase-pesada-01-2026-03-28T21-08-16-156Z.md`.
- Proximo bloco de trabalho esperado:
  - decidir o proximo objetivo funcional acima da fundacao validada
  - preservar o runner `validate:phase1` como gate regressivo antes de novos blocos pesados

## Rodada Atual - Blindagem da Submissao e Validacao da DRE

### Plano

- [x] Mapear o fluxo atual de submissao, edicao, reenvio e versionamento no frontend e no Supabase.
- [x] Validar a regra de imutabilidade apos envio e aprovacoes para garantir que o franqueado nao edite nem reenvie indevidamente.
- [x] Revisar o motor de calculo da DRE e do EBITDA contra a planilha-base e referencias oficiais atuais.
- [x] Corrigir os gaps necessarios no seed de linhas, funcoes SQL e preview do frontend sem aumentar a complexidade para o franqueado.
- [x] Criar verificacoes objetivas para provar que as formulas e bloqueios essenciais estao funcionando.

### Revisao

- [x] Fluxo de submissao blindado contra edicao indevida apos envio.
- [x] Formula da DRE e do EBITDA validada contra modelo canonico e documentacao.
- [x] Evidencias tecnicas atualizadas com build, lint e verificacoes locais.

### Notas

- Foi criada a migration `supabase/migrations/011_submission_lock_and_dre_validation.sql` para blindar a escrita direta em tabelas sensiveis, impedir nova versao apos envio/aprovacao e reforcar as guardas do workflow de revisao.
- O motor da DRE foi corrigido para usar a cadeia canonica `MC2 = MC1 - despesas_evento - despesas_variaveis - marketing - inadimplencia_liquida`.
- A leitura da planilha `Modelo DRE Gerencial.xlsx` confirmou campos ausentes no app atual. Para manter simplicidade sem perder fidelidade de calculo, foram adicionadas apenas as linhas essenciais que alimentam MC2:
  - `event_trainer_cost`
  - `variable_card_fees`
  - `variable_logistics`
  - `variable_room_rent`
  - `marketing_gifts`
  - `marketing_offline`
- O frontend de `Submissoes` agora respeita o bloqueio operacional por status: depois de `submitted`, a unidade so visualiza; so volta a editar se a controladoria devolver para `pending_adjustment`.
- A validacao funcional da DRE foi registrada tambem em `docs/logica-da-dre-e-do-workflow.md`, com nota explicita de que o sistema segue a semantica canonica da DRE quando a planilha-amostra tiver celula inconsistente.
- Foi criado o script `scripts/verify-dre-guardrails.mjs` para checar a formula de referencia e a presenca das travas criticas nos fontes versionados.
- `npm run build`, `npm run lint` e `node scripts/verify-dre-guardrails.mjs` passaram nesta rodada.
- `supabase db lint --linked --level error` passou no projeto remoto vinculado em 2026-03-28.
- `supabase db push --dry-run --linked` confirmou que a fila remota reconhece somente a migration nova `011_submission_lock_and_dre_validation.sql`.
- Nao foi possivel provar o fluxo autenticado completo em navegador real nesta rodada porque o workspace nao expoe credenciais de teste prontas para login.

## Rodada Atual - Benchmark e Escala

### Plano

- [x] Abrir a planilha `C:\Users\PC\Downloads\Modelo DRE Gerencial.xlsx` para extrair abas, categorias e formulas-base da DRE.
- [x] Confirmar o estado tecnico atual do workspace e as tensoes abertas entre narrativa, permissoes e calculo.
- [x] Pesquisar benchmarks internacionais com foco em software para franquias, performance por unidade, reporting financeiro e operacao multi-unidade.
- [x] Alinhar a narrativa do produto ao comportamento atual de permissao, evitando prometer operacao onde hoje existe apenas leitura.
- [x] Documentar os gaps entre o modelo real da planilha e a implementacao atual do `febracis-dre`.
- [x] Consolidar um plano concreto de escala do produto com prioridades de UX, automacao, dados, rollout e governanca.

### Revisao

- [x] Benchmark sintetizado com fontes oficiais e recomendacoes aplicaveis ao contexto Febracis.
- [x] Gap entre modelo Excel e app atual documentado com impacto funcional.
- [x] Ajustes de narrativa/permissao refletidos no codigo e/ou documentacao canonica.
- [x] Evidencias tecnicas atualizadas sem quebrar o build.

### Notas

- A planilha-base confirmou que o produto precisa de linhas editaveis e subtotais calculados por secao, e nao apenas totais agregados.
- Foi criado o documento `docs/benchmark-internacional-e-plano-de-escala-2026-03-28.md` com benchmark internacional, gaps do modelo atual e roadmap em fases.
- A narrativa de `regional_manager` foi alinhada para modo leitura em `src/features/guide/GuidePage.tsx` e `docs/modelo-de-acesso-e-permissoes.md`, preservando a regra tecnica atual.
- O gap estrutural mais importante identificado nesta rodada esta em `Despesas Variaveis`: a planilha tem linhas proprias, mas o modelo atual trata a secao como subtotal derivado de outras secoes.
- `npm run build` e `npm run lint` passaram apos os ajustes desta rodada.
- Nao foi possivel provar o fluxo autenticado completo em navegador real nesta rodada porque o workspace nao expoe credenciais de teste prontas para login.

## Plano

- [x] Criar uma skill global especialista no projeto `febracis-dre` para continuidade entre sessoes.
- [x] Consolidar contexto canonico do projeto com arquitetura, logica, historico e estado atual.
- [x] Registrar a skill no catalogo, validar estrutura e auditar seguranca minima.
- [x] Revisar todos os textos visiveis do frontend para corrigir acentuacao, cedilha e mojibake.
- [x] Corrigir labels, mensagens de erro e copys das paginas principais sem alterar a logica da aplicacao.
- [x] Validar `build` e checar a landing localmente em navegador real apos a revisao editorial.
- [x] Reposicionar o card de login exatamente para a area central livre marcada no print em telas amplas.
- [x] Validar o novo alvo visual do card em viewport ampla sem alterar o restante da hero.
- [x] Publicar o microajuste final de posicionamento em producao.
- [x] Reposicionar apenas o card de login para o vao central entre o texto e o Paulo em telas amplas.
- [x] Validar o novo encaixe do card na landing em viewport ampla sem alterar a composicao.
- [x] Publicar a correcao de posicionamento em producao.
- [x] Refazer a composicao do Paulo na landing usando o mesmo asset aprovado, sem efeito de recorte.
- [x] Validar o encaixe da primeira tela em breakpoints desktop, medio, tablet e mobile.
- [x] Publicar a versao corrigida em producao apos validacao visual.
- [x] Publicar a versao atual do projeto em producao na Vercel.
- [x] Confirmar que a URL oficial refletiu o deploy novo.
- [x] Ampliar a camada visual do Paulo na landing sem alterar a composicao aprovada.
- [x] Ajustar opacidade, escala e recorte para preservar a sutileza editorial.
- [x] Validar build e checar o resultado da landing em viewport desktop.
- [x] Mapear a documentacao e a arquitetura geral do produto.
- [x] Entender rotas, layouts, guardas e modulos principais do frontend.
- [x] Entender perfis, escopos, workflow e regras operacionais da DRE.
- [x] Entender integracao com Supabase, funcoes, views e RLS que sustentam o produto.
- [x] Consolidar um resumo funcional e arquitetural com foco no que impacta UX/UI.
- [x] Restaurar a composicao aprovada da landing com texto, mandala e Paulo.
- [x] Reposicionar apenas o card de login para o vao central entre o texto e o Paulo.
- [x] Validar `build`, `lint` e checagem visual em tela media e ampla antes da publicacao.

## Revisao

- [x] Resultado validado localmente.
- [x] Resultado publicado em producao.

### Notas

- O erro da rodada anterior foi arquitetural: houve redesign quando o pedido era apenas reposicionamento.
- A correcao restaurou a composicao aprovada e controlou apenas dois pontos: deslocamento do card e escala do fundo do Paulo em larguras amplas.
- Houve uma tentativa incorreta de trocar o asset do Paulo por outro recorte; isso foi revertido na mesma rodada.
- O ajuste final ficou restrito ao `background` original da landing, ampliando apenas escala e posicionamento do asset ja aprovado.
- O deploy em producao foi executado a partir do estado atual do workspace com `vercel deploy --prod -y`.
- A producao nova ficou disponivel em `https://febracis-a1l7bp6u8-deivithis-projects.vercel.app` e foi aliasada para `https://febracis-dre.vercel.app`.
- A leitura desta rodada confirmou a tese central do produto: o dado nasce em `Submissoes`, passa por calculo e workflow, e so depois sobe ao `Dashboard`.
- A arquitetura esta organizada em tres camadas coerentes: shell React com navegacao por papel, camada de acesso/API em `portal.api.ts` e motor de negocio no Supabase via RLS, views e funcoes SQL.
- Foram encontrados pontos de tensao entre documentacao e implementacao que vao impactar UX/UI: `viewer` nao entra em `Submissoes` apesar do discurso de leitura por escopo; `regional_manager` aparece na rota de `Submissoes`, mas nao pode operar a submissao; `executive` consegue revisar no backend e na rota, embora a narrativa textual o descreva mais como leitor executivo.
- A composicao nova transformou o Paulo em um plano fotografico integral da hero, com mascaramento por gradientes e escala responsiva, em vez de uma faixa deslocada no lado direito.
- A validacao visual desta rodada foi feita em `1680x1050`, `1440x900`, `1024x768`, `390x844` e `1920x1080`, com capturas salvas em `output/playwright/`.
- O deploy corrigido desta rodada gerou `https://febracis-9u5zycn5y-deivithis-projects.vercel.app` e foi confirmado na URL oficial `https://febracis-dre.vercel.app`.
- O ajuste seguinte moveu somente o card de login em telas amplas para o vao central entre o bloco de texto e o Paulo, sem alterar foto, tipografia ou estrutura da hero.
- A checagem visual desse microajuste foi feita em `2048x936` e `1680x1050`, mantendo a composicao original intacta.
- O deploy desse microajuste gerou `https://febracis-7ddwmbwvb-deivithis-projects.vercel.app` e foi confirmado novamente na URL oficial `https://febracis-dre.vercel.app`.
- A calibracao final separou o comportamento de desktop amplo e ultra-wide: `1500px+` preserva o encaixe do desktop grande e `1900px+` aplica o deslocamento extra para colocar o card dentro da area marcada no print.
- A validacao local mais recente confirmou o novo alvo visual em `2048x936` e manteve o desktop `1680x1050` sem invadir o bloco de texto.
- O deploy final desta calibracao gerou `https://febracis-cho9pro08-deivithis-projects.vercel.app` e foi checado novamente na URL oficial `https://febracis-dre.vercel.app`.
- Foi criada a skill global `febracis-dre-especialista` em `C:\Users\PC\.codex\skills\febracis-dre-especialista` para continuidade entre sessoes.
- A skill inclui `SKILL.md`, `agents/openai.yaml` e `references/project-context.md` com caminho local, URL oficial, arquitetura, mapa de fontes, logica funcional, tensoes conhecidas e estado atual do projeto.
- O catalogo operacional foi atualizado em `C:\Users\PC\.codex\skill-ops\catalog\skills-catalog.json`, a meta foi registrada em `C:\Users\PC\.codex\skill-ops\observability\targets.csv` e a execucao foi registrada em `usage-log.csv`.
- A validacao estrutural da skill passou com `validate-skills.ps1 -SkillName febracis-dre-especialista` e a auditoria rapida nao encontrou segredos nem instrucoes perigosas no conteudo criado.
- A rodada de copy corrigiu acentuacao e cedilha em navegacao, login, guide, dashboard, submissoes, workflow, franquias, auditoria, admin e mensagens expostas por `portal.api.ts`.
- O `build` passou apos a revisao editorial e a landing foi checada localmente com Playwright, confirmando textos como `competencia`, `governanca`, `revisao`, `lideranca`, `configuracoes` e `sistemico` renderizados corretamente com acento.
- Uma segunda rodada de copy encontrou residuos reais ainda ativos no fluxo autenticado: `submissoes historicas`, `Competencia`, `Gestao de acessos`, `acesso imediato`, `RBV` e `Validacoes`.
- A conferencia final passou a incluir duas camadas obrigatorias: busca no `src` por grafias suspeitas e busca no bundle gerado em `dist/assets` para confirmar que a acentuacao chegou intacta ao artefato publicado.
- Essa rodada foi publicada em producao via `vercel deploy --prod -y`, gerando `https://febracis-aykbxo091-deivithis-projects.vercel.app` e atualizando novamente a URL oficial `https://febracis-dre.vercel.app`.
