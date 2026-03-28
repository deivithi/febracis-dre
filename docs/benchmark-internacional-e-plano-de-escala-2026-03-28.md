# Benchmark Internacional e Plano de Escala - 2026-03-28

## Objetivo

Consolidar tres frentes em um unico checkpoint:

1. O que a planilha-base da DRE realmente exige da aplicacao.
2. O que plataformas internacionais de franquia e multi-unidade fazem bem hoje.
3. [Inferencia estrategica] Como o `febracis-dre` deve escalar sem perder simplicidade para franqueados com baixa afinidade tecnologica.

## Leitura da planilha de referencia

Arquivo analisado: `C:\Users\PC\Downloads\Modelo DRE Gerencial.xlsx`

### Estrutura validada

- Aba `Modelo DRE`: 55 linhas, 65 celulas com formula.
- Aba `Modelo Eventos`: 36 linhas, 46 celulas com formula.
- As duas abas seguem a mesma filosofia: usuario preenche apenas linhas de entrada; subtotais, margens e percentuais sao calculados automaticamente.

### Logica calculada validada

#### Cadeia principal da aba `Modelo DRE`

- `RBV`
- `Deducoes`
- `MC1`
- `Despesas de Eventos`
- `Despesas Variaveis`
- `Esforco de Marketing`
- `Inadimplencia`
- `MC2`
- `Pessoas`
- `CTO`
- `Utilidades e Servicos`
- `Despesas Gerais`
- `EBITDA 1`
- `Impostos`
- `EBITDA 2`

#### Formulas-base observadas

- `MC1 = RBV - descontos - split_holding - cispay - comissao_ed - taxa_franquia`
- `Despesas de Eventos = soma das linhas de evento`
- `Despesas Variaveis = taxa_cartoes + custo_logistico + locacao_sala`
- `Esforco de Marketing = soma das linhas de marketing`
- `Inadimplencia = perda_devedores - recuperacao_devedores`
- `MC2 = MC1 - despesas_eventos - despesas_variaveis - marketing - inadimplencia`
- `EBITDA 1 = MC2 - pessoas - cto - utilidades_servicos - despesas_gerais`
- `EBITDA 2 = EBITDA 1 - impostos`

### Implicacoes de produto

- O sistema precisa trabalhar com **linhas editaveis** e **linhas derivadas**, nunca com tudo editavel.
- O usuario precisa enxergar o subtotal da secao logo abaixo das linhas que ele preencheu.
- Cada subtotal e KPI deve mostrar tambem `% da RBV`, porque a planilha usa esse raciocinio o tempo todo.
- Existem pelo menos dois modos operacionais distintos:
  - DRE gerencial mensal
  - DRE de evento

## Benchmark internacional

### 1. Qvinci

**O que foi validado**

- Qvinci padroniza contas de unidades diferentes em um `Standard Chart of Accounts` sem exigir que cada operacao renomeie seu plano de contas local.
- A plataforma destaca `Franchise Wellness Dashboards`, `Customizable KPI Scorecards`, `Benchmarking and Ranking Locations` e `Cashflow / what-if forecasting`.
- Em case oficial com Orangetheory Fitness, a Qvinci reporta coleta automatizada, consolidacao, mapeamento para chart padrao e adocao proxima de 100% no ecossistema.

**Licao aplicavel ao Febracis**

- A DRE precisa de uma **camada canonica de mapeamento** entre o que a franquia preenche e o que a rede compara.
- Nao basta mostrar a DRE consolidada; e preciso gerar **scorecards e benchmark por unidade**.
- Alta adocao em franquia vem de `simples de implementar` + `facil de entender` + `comparacao util`.

### 2. ProfitKeeper

**O que foi validado**

- ProfitKeeper posiciona `Royalty Reporter`, `Financial & KPI Reporter` e uma plataforma enterprise unica para dados financeiros, operacionais e de POS.
- A plataforma enfatiza `single source of truth`, benchmarking, rankings, validacao automatica da integridade do dado e sincronizacao com QuickBooks / CSV / POS.
- Em testimoniais oficiais, a empresa destaca onboarding rapido, upload self-service pelos franqueados e consistencia de terminologia entre unidades.

**Licao aplicavel ao Febracis**

- O franqueado precisa conseguir **subir dado sem depender de suporte tecnico**.
- O portal deve validar a integridade antes de consolidar.
- Benchmarks entre pares e ranking por KPI aumentam o valor percebido da ferramenta.

### 3. FranConnect

**O que foi validado**

- FranConnect se posiciona como plataforma unica para todo o ciclo de franquia, com modulos de Development, Operations, Marketing, Financials e insights com IA.
- A empresa informa atender cerca de 1.500 marcas e mais de 1 milhao de localizacoes no mundo.
- O modulo de royalties e pagamentos e descrito como `single source of truth` para termos financeiros do contrato, com calculo automatico de royalties e lancamentos em sistemas financeiros conectados.
- A camada de automacao da plataforma tambem inclui planos de melhoria de performance para franquias com baixo desempenho.

**Licao aplicavel ao Febracis**

- O portal deve ser **um lugar unico** para a jornada da franquia: preencher, revisar, acompanhar status e entender desempenho.
- Performance e melhoria precisam fazer parte do fluxo, nao ficar separadas em outro sistema.
- IA deve entrar primeiro como camada de leitura e explicacao, nao como substituto da governanca.

### 4. Fran Metrics

**O que foi validado**

- Fran Metrics oferece `Performance by KPI`, `Top Performers`, `Break-even analysis`, `Unit-Level Scorecard` e comparacao com metas, mediana e media do sistema.
- A plataforma declara explicitamente `Dump the P&L` em favor de scorecards mais acionaveis.
- Em fevereiro de 2026, a IFA destacou o `FRAN AI`, com perguntas em linguagem natural sobre dados de performance.

**Licao aplicavel ao Febracis**

- Para franqueados menos analiticos, **scorecard contextualizado vale mais que uma DRE bruta**.
- Comparacao com `meta`, `media da rede`, `mediana do grupo` e `top performers` deve ficar a um clique.
- IA em linguagem natural faz sentido depois que a base de calculo e benchmark estiver estavel.

### 5. Naranga

**O que foi validado**

- Naranga enfatiza software centralizado para franquias com onboarding de novas unidades, tracking em tempo real, relatorios por localidade, compliance documental e royalties.
- A empresa reforca interface simples e intuitiva, onboarding apoiado e configuracao em algumas semanas.
- O produto e descrito como escalavel de pequenos grupos ate redes com milhares de localizacoes.

**Licao aplicavel ao Febracis**

- Escala nao depende so de dashboard; depende de **onboarding estruturado**, templates e acompanhamento de implantacao.
- Para a Febracis, vale tratar a entrada da franquia como um `playbook operavel`, nao apenas como um formulario.

### 6. ServiceMinder

**O que foi validado**

- ServiceMinder vende a ideia de consolidar necessidades do negocio em uma unica plataforma, com treinamento mais simples.
- O material recente do `NeoLight` enfatiza navegacao mais limpa, layout mais intuitivo e rollout por lotes para facilitar treinamento.
- O produto reforca mobilidade e uso por owner/operator em campo.

**Licao aplicavel ao Febracis**

- UX para franqueado precisa ser pensada como **treinavel em ondas**, nao apenas bonita.
- Melhorias de interface devem considerar rollout, comunicacao interna e reaprendizagem do usuario.

### 7. Restaurant365

**O que foi validado**

- Restaurant365 centraliza dados multi-unidade, integra POS, payroll e bancos, e suporta relatorios por local e consolidado.
- A suite oferece dashboards customizaveis, visoes de operacao e mobilidade com alertas e acesso por papel.
- A documentacao recente mostra `Auto Summary` em linguagem natural dentro do modulo de dashboards.

**Licao aplicavel ao Febracis**

- Integracoes reduzem digitacao manual e erro operacional.
- Dashboards precisam ser customizaveis por papel.
- Alertas e sumarios em linguagem natural ajudam gestores e franqueados a entender o que mudou sem ler relatorio inteiro.

### 8. QuickBooks e Xero como benchmark adjacente de UX de entrada

**O que foi validado**

- QuickBooks destaca captura automatica de recibos / documentos, extracao automatica de dados e papeis customizados.
- Xero enfatiza bank feeds automaticos, reconciliacao mais facil e maior visibilidade de caixa.

**Licao aplicavel ao Febracis**

- O franqueado nao deveria digitar tudo do zero sempre que houver fonte estruturada.
- Permissao por papel precisa ser granular.
- Automacao de entrada de dado e o caminho natural para incluir usuarios com menor maturidade tecnologica.

## Gap entre a planilha real e a implementacao atual

### O que ja esta coerente

- A tese principal do produto continua correta: dado nasce na submissao e depois sobe ao dashboard.
- A aplicacao ja separa permissao de operacao e permissao de leitura.
- O produto ja tem versao, workflow, validacoes e KPIs consolidados.

### Gaps estruturais identificados

#### 1. `Despesas Variaveis` nao existe como bloco editavel real

Na planilha, `Despesas Variaveis` possui linhas proprias:

- `Taxa com cartoes`
- `Custo logistico`
- `Locacao sala`

No produto atual:

- existe apenas `variable_expenses_total` como subtotal sem linhas-filhas em `supabase/migrations/003_seed_data.sql`
- o motor de calculo em `supabase/migrations/004_calculation_engine.sql` calcula `variable_expenses_total` como:
  - `event_expenses_total + marketing_total + default_net`

**Impacto**

- O modelo atual nao representa fielmente a planilha.
- `MC2` fica baseado em uma simplificacao estrutural, nao no desenho original da DRE.

#### 2. A secao de estrutura foi comprimida demais

Na planilha, os blocos abaixo possuem varias linhas:

- `Pessoas`
- `CTO`
- `Utilidades e Servicos`
- `Despesas Gerais`

No produto atual, essas secoes entram como totais unicos:

- `people_total`
- `cto_total`
- `utilities_services_total`
- `general_expenses_total`

**Impacto**

- A experiencia e mais simples, mas perde rastreabilidade, coaching e qualidade de benchmark por linha.

#### 3. A matriz de marketing esta mais enxuta que a planilha

Na planilha, marketing inclui pelo menos:

- digital
- brindes
- regional
- off line

No produto atual, a camada base trabalha apenas com:

- `marketing_digital`
- `marketing_regional`

**Impacto**

- A consolidacao atual nao captura toda a granularidade do modelo original.

#### 4. Ha dois modelos de negocio na planilha e um modelo hibrido no app

- `Modelo DRE` tem um detalhamento mais completo de custos estruturais.
- `Modelo Eventos` simplifica a estrutura e foca o custo do evento.

**Impacto**

- O produto precisa decidir se tera:
  - um motor unico parametrizado por tipo de submissao
  - ou templates de DRE separados por contexto operacional

### Gap de narrativa e permissao

O codigo hoje trata `regional_manager` como leitura no fluxo de submissao, nao como operador principal.

Para reduzir contradicao:

- o texto de `src/features/guide/GuidePage.tsx` foi ajustado para leitura por escopo
- a documentacao `docs/modelo-de-acesso-e-permissoes.md` foi ajustada no mesmo sentido

## [Inferencia estrategica] Plano concreto para escalar o produto

### Norte do produto

O `febracis-dre` deve escalar como uma plataforma de:

- entrada assistida de DRE
- calculo automatico e auditavel
- benchmark de performance por unidade
- coaching operacional baseado em contexto

Nao como um dashboard isolado.

### Fase 0 - Corrigir a fundacao do modelo (1 a 2 semanas)

#### Entregas

- Definir um **modelo canonico da DRE** a partir da planilha.
- Decidir se a rede tera:
  - um template mensal
  - um template de evento
  - ou ambos, parametrizados por tipo
- Corrigir o motor de calculo para refletir o modelo aprovado.
- Criar uma matriz `linha da planilha -> line_code do sistema -> formula -> origem`.

#### Criterio de saida

- O calculo do app bate com a planilha para casos de teste controlados.

### Fase 1 - Tornar o preenchimento facil para o franqueado (2 a 4 semanas)

#### Entregas

- Transformar `Submissoes` em fluxo guiado por secoes.
- Mostrar sempre dois estados por secao:
  - `Voce preenche`
  - `O sistema calcula`
- Salvar automaticamente rascunho por secao.
- Exibir validacoes na hora, nao apenas apos salvar.
- Permitir importacao assistida de planilha como acelerador de onboarding.

#### Principios de UX

- Nao mostrar tudo de uma vez.
- Sempre explicar o motivo do campo.
- Exibir subtotal e `% da RBV` imediatamente apos o preenchimento.
- Usar linguagem operacional, nao contabilista, quando possivel.

### Fase 2 - Benchmark e coaching por unidade (3 a 5 semanas)

#### Entregas

- Scorecard por franquia com:
  - RBV
  - MC1
  - MC2
  - EBITDA 1
  - EBITDA 2
  - principais variacoes do periodo
- Comparadores por grupo:
  - media da regional
  - mediana da rede
  - top quartil
  - meta
- Sinalizadores:
  - fora da faixa
  - piorando vs mes anterior
  - abaixo do grupo

#### Benchmark que sustenta isso

- Qvinci
- ProfitKeeper
- Fran Metrics

### Fase 3 - Escala operacional e rollout (4 a 8 semanas)

#### Entregas

- Playbook de onboarding por lote de franquias.
- Centro de ajuda contextual por secao.
- Notificacoes por papel:
  - franquia
  - controladoria
  - regional
  - admin
- Auditoria de alteracoes por linha relevante.
- Templates por perfil de unidade / evento.

#### Estrategia de rollout

- Piloto com 3 a 5 franquias:
  - 1 madura digitalmente
  - 2 medias
  - 1 ou 2 com baixa afinidade tecnologica
- Revisar suporte, erros e tempo de submissao.
- Expandir por regional, nao por rede inteira de uma vez.

### Fase 4 - Camada de inteligencia assistida (depois da fundacao)

#### Entregas

- Resumo automatico:
  - `o que mudou`
  - `o que esta fora da faixa`
  - `o que precisa de revisao`
- Explicacao em linguagem natural de variacoes de MC2 / EBITDA.
- Sugestao de pendencias para controladoria.
- Perguntas naturais sobre desempenho por unidade e comparacao com pares.

#### Regra de prioridade

- IA deve explicar e orientar.
- IA nao deve substituir calculo, regra de negocio nem trilha de auditoria.

## KPIs de escala recomendados

### Adoacao

- taxa de franquias ativas por competencia
- tempo medio para primeira submissao
- percentual de rascunhos que viram submissao

### Qualidade

- taxa de submissao devolvida para ajuste
- numero medio de validacoes bloqueantes por unidade
- divergencia entre preview local e calculo oficial

### Eficiencia

- tempo medio da franquia para concluir preenchimento
- tempo medio da controladoria para revisar
- volume de tickets de suporte por 100 franquias

### Resultado

- tempo para fechamento por competencia
- cobertura de unidades com dado oficial aprovado
- reducao de retrabalho operacional por ciclo

## Recomendacao executiva

### Prioridade maxima

- Corrigir a fundacao da DRE antes de sofisticar benchmark ou IA.

### Prioridade alta

- Tornar o preenchimento guiado, incremental e autoexplicativo para o franqueado.

### Prioridade seguinte

- Liberar benchmark por pares e scorecard por unidade.

### Prioridade posterior

- Conectar fontes externas e adicionar explicacao em linguagem natural.

## Fontes oficiais consultadas em 2026-03-28

- Qvinci - Franchise Solution: https://www.qvinci.com/franchise-solution/
- Qvinci - Standard Chart of Accounts: https://qvinci.com/standard-chart-of-accounts/
- Qvinci - Orangetheory case study: https://www.qvinci.com/wp-content/uploads/2025/03/Orangetheory_Fitness_Customer_Success_Story.pdf
- Qvinci - MaidPro case study: https://www.qvinci.com/wp-content/uploads/2025/03/Qvinci_Maidpro_Customer_Success_Story___FINAL.pdf
- ProfitKeeper - Platform: https://www.profitkeeper.com/platform/
- ProfitKeeper - Financial & KPI Reporter: https://www.profitkeeper.com/kpis/
- ProfitKeeper - Royalty Reporter: https://www.profitkeeper.com/royalty-reporter/
- ProfitKeeper - Why ProfitKeeper: https://www.profitkeeper.com/why-profitkeeper/
- ProfitKeeper - Client stories: https://www.profitkeeper.com/client-story/
- FranConnect - Home: https://www.franconnect.com/
- FranConnect - About us: https://www.franconnect.com/company/about-us/
- FranConnect - ROYALTY Manager: https://www.franconnect.com/platform-overview/royalty-manager/
- FranConnect - Automation article: https://help.franconnect.com/hc/en-us/articles/14662389192475-What-Can-You-Automate-with-FranConnect
- Fran Metrics: https://franmetrics.net/
- IFA - FRAN AI: https://www.franchise.org/2026/02/fran-metrics-introduces-fran-ai-ahead-of-ifa-2026/
- IFA - Financial Analytics Tools and Best Practices: https://www.franchise.org/sites/default/files/2022-03/Financial%20Analytics%20Tools%20and%20Best%20Practices.pdf
- IFA - Why Financial Health Matters: https://www.franchise.org/2024/08/why-financial-health-matters/
- IFA - Annual Franchisee Survey: https://www.franchise.org/ifa-annual-franchisee-survey/
- Naranga - Home: https://naranga.com/
- Naranga - Franchise Operations Software: https://naranga.com/franchise-operations-software/
- Naranga - About us: https://naranga.com/about-us/
- ServiceMinder - Franchisor: https://serviceminder.com/home/franchisor
- ServiceMinder - About: https://serviceminder.com/home/about
- ServiceMinder - NeoLight: https://serviceminder.com/home/blog/meet-neolight
- Restaurant365 - Accounting: https://www.restaurant365.com/accounting/
- Restaurant365 - Multi-location groups: https://www.restaurant365.com/multi-location-groups/
- Restaurant365 - Financial dashboard customization: https://docs.restaurant365.com/docs/financial-dashboard-customize-the-dashboard
- Restaurant365 - Operations dashboard: https://docs.restaurant365.com/docs/operations-dashboard
- Restaurant365 - Mobile app: https://www.restaurant365.com/mobile-app/
- Restaurant365 - R365 Intelligence dashboard editor: https://docs.restaurant365.com/docs/r365-intelligence-editing-dashboards
- Restaurant365 - Auto Summary: https://docs.restaurant365.com/docs/r365-intelligence-auto-summary
- Restaurant365 - Onboarding Dashboard: https://docs.restaurant365.com/docs/onboarding-dashboard-overview
- QuickBooks - Data In / AutoEntry: https://quickbooks.intuit.com/ca/accountants/features/data-in/
- QuickBooks - Custom roles: https://quickbooks.intuit.com/online/advanced/customizations/
- QuickBooks - Manage custom roles help article: https://quickbooks.intuit.com/learn-support/en-us/help-article/access-permissions/add-manage-custom-roles-quickbooks-online-advanced/L8Ugph7xl_US_en_US
- Xero - Open banking / bank feeds: https://www.xero.com/ie/programme/open-banking/
- Xero - Hubdoc / capture data: https://www.xero.com/accounting-software/capture-data-with-hubdoc/
