# Plano - Dashboard Executivo e Agente Guiado DRE

Data: 2026-03-28

## Contexto confirmado no produto atual

- O dashboard principal do portal hoje ja e a rota `/app/dashboard`.
- A pagina troca de forma por papel:
  - `franchise`
  - `regional`
  - `holding`
  - `controladoria`
- O dado oficial continua nascendo em `Submissoes`, passando por calculo e workflow antes de subir para leitura executiva.
- O gap atual nao e ausencia de dashboard; o gap e falta de um cockpit executivo filtravel para `admin/holding` e excesso de friccao operacional na jornada de `Submissoes`.

## Decisao arquitetural recomendada

### 1. Dashboard principal futuro

Transformar `/app/dashboard` no cockpit principal de `admin/holding`, sem mover a origem do dado.

Esse cockpit deve concentrar:

- KPIs consolidados da rede
- filtros por competencia, regional e franquia
- ranking e alertas de excecao
- leitura comparativa por unidade
- fila de revisao e saude operacional
- drill-down para a submissao oficial da unidade

### 2. Papel futuro de `Submissoes`

Transformar `/app/submissions` no workspace guiado do franqueado.

Em vez de multiplicar botoes e explicacoes soltas, a pagina deve ficar organizada em:

- contexto do periodo atual
- status da submissao
- agente guiado da DRE
- editor/manual fallback
- preview oficial dos calculos

### 3. Papel do agente

O agente nao substitui o motor oficial da DRE nem a governanca de envio.

O agente deve:

- conduzir a coleta pergunta por pergunta
- explicar cada campo em linguagem simples
- responder duvidas contextuais durante o preenchimento
- sugerir proximos passos
- acionar salvamento parcial
- preparar o envio final para o fluxo ja existente

O agente nao deve:

- recalcular fora do motor oficial
- aprovar submissao
- contornar RLS, workflow ou escopo

## Arquitetura recomendada

### Camadas

1. Frontend atual (`React + Vite`)
- Manter o app atual como shell oficial.
- Adicionar um painel de `Assistente DRE` em `Submissoes`.
- Expor chips de inicio rapido, historico da conversa e estado do processo.

2. Agent Service separado
- Criar um servico dedicado para o agente, desacoplado do frontend e do motor SQL.
- Responsabilidades:
  - orquestracao LangGraph
  - RAG
  - memoria persistente
  - streaming de resposta
  - chamadas controladas para ferramentas do portal

3. Supabase atual
- Continuar como fonte de verdade operacional.
- Usar o projeto atual `vwxgrjjwbvdiaqxqbryk`.
- Reaproveitar Postgres para:
  - credenciais e escopo
  - trilha operacional
  - documentos da base de conhecimento via pgvector
  - auditoria do agente

### Stack recomendada

- Orquestracao: LangGraph
- Ferramentas e RAG: LangChain
- Gateway de modelos: OpenRouter
- Banco e auth: Supabase
- Vetores: pgvector no proprio Postgres do Supabase
- Frontend: React atual, sem rewrite

### Decisao de linguagem

Recomendacao principal:

- Agent Service em Python, isolado do frontend

Motivo:

- o ecossistema mais maduro de memoria, checkpointers e exemplos oficiais ainda esta mais rico em Python
- o frontend atual pode continuar em TypeScript sem contaminacao arquitetural
- o contrato entre app e agente pode ficar simples via HTTP/SSE

Alternativa valida:

- Implementar o Agent Service em TypeScript se a prioridade absoluta for mono-repo JS e velocidade de onboarding interno

## Padrões recomendados

### Para a primeira versao do agente

- `Hybrid RAG`
- `Human-in-the-loop` apenas onde houver impacto operacional relevante
- `Short-term memory` por thread de conversa
- `Long-term memory` por usuario + franquia + contexto operacional
- `Tool-first orchestration` para salvar rascunho, buscar glossario e consultar status

### Fluxo alvo

1. O franqueado entra em `Submissoes`
2. O agente identifica franquia, competencia e status atual
3. O agente pergunta os campos faltantes por blocos
4. O franqueado pode interromper para tirar duvida
5. O agente consulta a base de conhecimento e responde com contexto
6. O agente chama tool de salvamento parcial
7. O sistema recalcula preview via motor oficial
8. O agente apresenta resumo final e pede confirmacao para envio
9. O envio continua indo para o workflow oficial de controladoria

## Repositorios de referencia recomendados

### Base principal

1. `langchain-ai/langgraph`
- framework-base de orquestracao
- usar como referencia principal de estado, grafo, persistencia e HITL

2. `langchain-ai/langchain`
- usar para loaders, retrievers, embeddings e integracoes

3. `langchain-ai/open_deep_research`
- referencia de arquitetura moderna, configuravel e multi-provider
- usar como inspiracao de composicao e evals, nao como template direto do produto

4. `langchain-ai/agent-inbox`
- referencia de UX para interrupts e revisao humana
- usar como padrao de interacao, nao como frontend oficial do portal

5. `langchain-ai/langchain-postgres`
- referencia de persistencia vetorial e historico em Postgres

6. `langchain-ai/langchain-template-supabase`
- referencia de integracao LangChain + Supabase

### Repositorios que nao devem ser baseline

- `langchain-ai/langgraph-memory`
  - o repositorio foi arquivado em 2026-02-25
  - serve apenas como referencia historica, nao como fundacao

## Regras de integracao com o produto atual

- O agente deve respeitar `franchise_id` e `regional_id` do usuario autenticado.
- Toda leitura do agente deve usar o mesmo escopo efetivo do portal.
- Toda escrita deve passar por tools oficiais que conversem com o backend atual.
- O calculo da DRE continua centralizado no motor oficial ja validado.
- O dashboard executivo deve ler apenas dados oficiais aprovados ou correntes conforme o papel.

## Proposta de rollout

### Fase 1 - Segura para apresentacao

- consolidar `/app/dashboard` como cockpit executivo
- adicionar filtros por competencia, regional e franquia
- manter `Submissoes` operacional como esta, mas abrir espaco dedicado para o `Assistente DRE`
- subir uma primeira versao do agente com:
  - onboarding guiado
  - FAQ contextual
  - consulta de status
  - salvamento parcial

### Fase 2 - Substituicao progressiva da friccao

- mover a coleta dos principais campos para o fluxo conversacional
- manter editor manual como fallback
- adicionar memoria persistente e trilha de preferencia do usuario

### Fase 3 - Operacao madura

- expandir a base de conhecimento
- adicionar avaliacao do agente
- incluir monitoracao de custo, latencia e taxa de resolucao sem handoff

## Critérios de aceite do novo bloco

- `admin/holding` enxerga a rede inteira com filtros por regional e franquia.
- `regional_manager` enxerga apenas sua carteira, com filtros internos compativeis.
- `franchise_user` continua restrito a sua unidade.
- O agente nao quebra o workflow oficial nem cria calculo paralelo.
- O agente responde duvidas contextuais com base auditavel.
- O franqueado consegue concluir a jornada principal com menos botoes e menor carga cognitiva.

## Riscos e cuidados

- Nao acoplar o agente diretamente ao frontend com chaves de modelo.
- Nao usar SQLite como store/checkpointer de producao.
- Nao usar Vector Buckets alpha para a primeira versao user-facing.
- Nao substituir de uma vez o editor manual; manter fallback ate a taxa de sucesso do agente ficar provada.
- Nao misturar memoria global da rede com memoria especifica de unidade sem namespace forte.

## Fontes oficiais e repositórios usados nesta rodada

- LangChain Retrieval: https://docs.langchain.com/oss/python/langchain/retrieval
- LangGraph Memory: https://docs.langchain.com/oss/python/langgraph/memory
- LangChain Checkpointers: https://docs.langchain.com/oss/python/integrations/checkpointers
- OpenRouter Auto Exacto: https://openrouter.ai/docs/guides/routing/auto-exacto
- OpenRouter Prompt Caching: https://openrouter.ai/docs/guides/best-practices/prompt-caching
- Supabase Vector Buckets: https://supabase.com/docs/guides/storage/vector/introduction
- GitHub `langchain-ai/open_deep_research`: https://github.com/langchain-ai/open_deep_research
- GitHub `langchain-ai/agent-inbox`: https://github.com/langchain-ai/agent-inbox
- GitHub `langchain-ai/langchain-postgres`: https://github.com/langchain-ai/langchain-postgres
- GitHub `langchain-ai/langchain-template-supabase`: https://github.com/langchain-ai/langchain-template-supabase
- GitHub Advisory `CVE-2025-64104`: https://github.com/advisories/GHSA-7p73-8jqx-23r8
