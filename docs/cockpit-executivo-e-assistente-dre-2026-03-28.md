# Cockpit Executivo e Assistente DRE - 2026-03-28

## Objetivo

Fechar a proxima camada da demonstracao executiva de segunda-feira com dois eixos sincronizados:

- transformar o `Dashboard` de `holding` no cockpit principal de leitura executiva
- transformar `Submissoes` no workspace assistido da unidade, sem mover a origem oficial do dado para fora do backend atual

## O que foi implementado

### Cockpit executivo

- O `Dashboard` de `holding` agora usa `HoldingCockpitView`
- O cockpit oferece filtros por:
  - competencia
  - regional
  - unidade
- O recorte recalcula:
  - receita filtrada
  - EBITDA 2 filtrado
  - aprovadas
  - fila/desvios
- A tela inclui:
  - radar executivo do recorte
  - resumo lateral
  - top 5 EBITDA 2
  - fila de revisao do periodo selecionado

Arquivos principais:

- `src/features/dashboard/HoldingCockpitView.tsx`
- `src/features/dashboard/DashboardPage.tsx`
- `src/features/dashboard/DashboardPage.css`

### Assistente DRE

- O sidebar de `Submissoes` agora exibe `DreAssistantPanel`
- O assistente possui:
  - quick actions para iniciar, explicar o campo atual e salvar
  - memoria persistente por submissao
  - historico de mensagens
  - referencias usadas na ultima resposta
  - foco guiado por `line_code`
- A integracao respeita a fundacao da DRE:
  - o assistente so sugere `fieldUpdates` para linhas editaveis
  - o frontend aplica as mudancas no mesmo estado que alimenta preview e save oficial
  - o backend continua dono exclusivo do calculo de `MC1`, `MC2`, `EBITDA 1` e `EBITDA 2`

Arquivos principais:

- `src/features/submissions/DreAssistantPanel.tsx`
- `src/features/submissions/dreAssistant.ts`
- `src/features/submissions/SubmissionsPage.tsx`
- `src/features/submissions/SubmissionsPage.css`
- `api/dre-agent.ts`

## Persistencia e Supabase

Foi aplicada a migration:

- `supabase/migrations/014_agent_sessions_and_messages.sql`

Essa migration cria:

- `agent_sessions`
- `agent_messages`
- RLS para leitura e escrita por escopo
- `fn_agent_get_or_create_session`

Projeto remoto confirmado:

- `vwxgrjjwbvdiaqxqbryk`

## Modo atual de operacao do assistente

### Pronto hoje

- memoria persistente no Supabase
- endpoint serverless publicado na Vercel
- fallback deterministico funcionando
- sincronizacao com os campos oficiais da DRE
- bloqueio de escrita respeitado em submissao travada

### Status do LLM real

- concluido em producao em 2026-03-28

Modelo previsto para a rodada de demo:

- `openrouter/free`

O endpoint ja esta preparado para esse caminho:

- se `OPENROUTER_API_KEY` existir, usa OpenRouter
- se nao existir, cai no fallback deterministico

## OpenRouter em producao

- `OPENROUTER_API_KEY` configurado na Vercel em `Production`
- `OPENROUTER_MODEL` configurado na Vercel como `openrouter/free`
- deploy de producao republicado em `https://febracis-dre.vercel.app`
- validacao tecnica feita por chamada autenticada ao endpoint oficial `/api/dre-agent`
- resposta confirmada com:
  - `mode = llm`
  - `focusLineCode = variable_card_fees`
  - resposta contextual sobre o campo `Taxa com Cartoes`
- smoke aprofundado em submissao editavel:
  - unidade `Febracis Fortaleza Demo`
  - status `pending_adjustment`
  - o assistente atualizou `Receita Bruta de Vendas` para `411000`
  - o preview reagiu imediatamente
  - o save oficial atualizou a DRE calculada para `R$ 411.000,00`
  - o valor foi revertido para `R$ 410.000,00` ao final

## Validacoes executadas

- `npm run build`
- `npm run lint`
- `npm run validate:phase1:local`
- `supabase migration list --linked`
- `supabase db push --linked`
- smoke manual via browser na URL oficial:
  - login no portal
  - cockpit de `holding` com filtros visiveis
  - assistente iniciando conversa
  - envio de valor em submissao travada retornando mensagem de bloqueio sem alterar os campos

## Deploys desta rodada

- Preview: `https://febracis-qn3op8k2g-deivithis-projects.vercel.app`
- Producao publicada: `https://febracis-368ddfl8z-deivithis-projects.vercel.app`
- URL oficial: `https://febracis-dre.vercel.app`

## Proximo passo

- Expandir os smokes do assistente para mais cenarios editaveis em `draft` e `pending_adjustment`.
- Espelhar `OPENROUTER_API_KEY` e `OPENROUTER_MODEL=openrouter/free` tambem em `Preview`, se a rodada de demonstracao pedir paridade fora de producao.
- Evoluir o agente sem criar calculo paralelo nem romper o workflow oficial da DRE.
