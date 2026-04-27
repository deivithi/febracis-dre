# Lessons

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
