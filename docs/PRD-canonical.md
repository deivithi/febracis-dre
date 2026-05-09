# PRD canónico — Portal gerencial DRE Febracis (`febracis-dre`)

**Documento:** requisitos de produto + arquitetura + contratos comportamentais (fonte sintética do ecossistema de docs internos).  
**Versão PRD:** 2.0  
**Última consolidação:** 08/05/2026 BRT (refactor canónico cliente-first / eval-agent / KPIs estruturados).  
**Não substitui:** operação ao vivo — [`references/project-context.md`](../references/project-context.md) continua SSOT deploy/Supabase/Vercel.  
**Ref. técnica cruzada (rotas/arquivos):** [`references/technical-implementation.md`](../references/technical-implementation.md).  
**Eval agente YAML:** [`dre-agent-evals.yaml`](./dre-agent-evals.yaml).

---

## Índice canónico

| § | Título |
|---|--------|
| §-1 | [PR/FAQ cliente-first (Amazon WW)](#-1-prfaq--lançamento-visão-cliente-first) |
| §0 | [Problema (baseline + custo de não fazer)](#0-problema-baseline-e-custo-de-não-fazer) |
| §1 | [Resumo executivo](#1-resumo-executivo-refinado) |
| §2 | [North star e tese central](#2-north-star-e-tese-central) |
| §3 | [Personas + RBAC](#3-personas-profundidade-jobs-to-be-done--rbac-narrativa) |
| §4 | [Fora do âmbito](#4-fora-do-âmbito-atual-explícito) |
| §5 | [Jornadas e fluxos](#5-jornadas-e-fluxos-canónicos) |
| §6 | [Requisitos funcionais alto nível](#6-requisitos-funcionais-por-domínio-alto-nível) |
| §7 | [Modelo DRE e motor](#7-modelo-dre-motor-de-cálculo-e-alinhamento-à-planilha) |
| §8 | [Arquitetura sistemas](#8-arquitetura-de-sistemas-estado-real-e-evolução-recomendada) |
| §9 | [Assistente DRE IA](#9-assistente-dre-ia--arquitetura-regras-e-roadmap) |
| §9-bis | [Eval & behavioral contract](#9-bis-eval--behavioral-contract-do-agente-dre) |
| §10 | [Benchmark internacional](#10-benchmark-internacional--síntese-aplicável) |
| §11 | [Segurança não funcional](#11-segurança-privacidade-e-qualidade-não-funcional) |
| §12 | [Fuso BRT produto](#12-fuso-dados-e-competência-brt-comportamento-produto) |
| §13 | [Roadmap fases](#13-roadmap-estratégico-em-fases--critérios-quantitativos) |
| §13-bis | [Decision log](#13-bis-decision-log--decisões-controversas-registradas) |
| §14 | [Critérios aceite](#14-critérios-de-aceite-globais-consolidados) |
| §15 | [KPIs produto](#15-kpis-de-produto) |
| §16 | [Riscos](#16-riscos-e-mitigações) |
| §17 | [Mapa documentos filhos](#17-mapa-de-documentos-filhos--anexo) |
| §18 | [Changelog PRD](#18-changelog-do-prd) |

---

## §-1. PR/FAQ — Lançamento (visão cliente-first)

> *[Inferência criativa só para formato PR Amazon — cenário ilustrativo; não é comunicação oficial até a Febracis aprovar copy externa]*

### Manchete fictícia (alvo de lançamento)

**HEADLINE:** *Sua DRE mensal fecha sozinha antes do dia cinco — sem planilhas perdidas.*

**SUBTÍTULO:** Menos retrabalho e números oficiais que a holding já confia.

**LEAD:** Franqueadas e franqueados da rede enfrentavam formulários dispersos e devoluções de controladoria no meio da correria. O portal único organiza período e competência, guia campo a campo — com assistência de IA sempre subordinada ao motor oficial MC1/MC2/EBITDA — e fecha o ciclo com audit trail até aprovação.

### FAQ cliente

| # | Pergunta | Resposta (max 3 frases) |
|---|----------|-------------------------|
| 1 | O que muda no dia a dia? | Você deixa de juntar planilhas soltas por canais paralelos para um formulário oficial com o mesmo esquema MC1/MC2/EBITDA para todos. Você sempre vê o que o sistema calcula — não reinventa EBITDA na mão. Pré-salvamento permite ir e voltar até enviar oficialmente para controladoria. |
| 2 | Preciso aprender contabilidade pesada? | Não como pré-requisito de uso cotidiano; o texto do portal foi pensado em linguagem gerencial brasileira. Glossário institucional: [`docs/dre-glossario.md`](./dre-glossario.md). |
| 3 | E se eu errar? | O motor recalcula automaticamente ao corrigir entradas editáveis válidas antes do envio. Após envio para revisão há bloqueio normal — só controlador pode devolver com motivo oficial. |
| 4 | Quem vê meus dados? | Pessoas com papel oficial no mesmo escopo (franquia, regional, holding, controlador). Postgres RLS é a barreira real. Detalhes: [`references/audit-app-logic-2026-05-08.md`](../references/audit-app-logic-2026-05-08.md). |
| 5 | Funciona no celular? | **[Não verificado — medir tráfego mobile].** SPA navegador-first; homologação real antes de promessa explícita. |

### FAQ negócio (interno)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Por que agora? | Escala de eventos, fadiga retratil franquia↔central e maturidade de assistência servidor com segurança (sem recalc paralelo ao motor SQL). |
| 2 | Por que não só BI? | BI consome resultado já consolidado; o portal é **captura oficial versionada** e workflow único até números aprováveis. |
| 3 | Custo de não fazer? | Baseline horas **[Não verificado]** — Fase §0 KPIs §15 obriga primeira medição institucional. |
| 4 | Maior risco? | Motor aplicativo divergir da planilha canónica — mitigar Foundations + regressões assinadas Controladoria. |

### Medição êxito 90 dias (estratégico)

**[Não verificado — Telemetry]** — alinhar a §15 antes de comunicar percentuais externos.

---

## §0. Problema (baseline e custo de não fazer)

### Quem sofre hoje

- **Franqueado(a):** fragmentação de entrada + incerteza até feedback da controladoria.
- **Controlador(a):** harmonização de formatos + devoluções + garantir EBITDA sem digitação irregular fora do modelo.
- **Holding/Direção:** panorama comparativo lento sempre que base está parcial ou sem rastreio.

### Dor mensurável (baselines)

| Métrica de dor | Valor atual | Fonte pretendida | Status |
|----------------|-------------|------------------|--------|
| Tempo médio coleta DRE por unidade / competência | **[Não verificado]** | eventos formulário tempo first_open→submit válido | Fase 0 |
| % submissões devolvidas por ciclo | **[Não verificado]** | audit_log + estados Postgres | Fase 0 |
| Divergência planilha vs motor | **[Não verificado]** | bateria regressão oficial | Fase 0 |
| SLA fecho competência rede | **[Não verificado]** | reporting_period + statuses | Fase 1 |
| Tickets suporte / 100 franquias/mês | **[Não verificado]** | helpdesk tag portal | Fase 1 |

### Frase problema canónica (numeros concretos após baseline)

> "Hoje, unidades **[Não verificado]** horas para fechar a DRE e **[Não verificado]%** das revisões exigem segundo passo — segurando decisões da holding **[Não verificado]** até a versão oficial unificada."

Substituir quando §0 tiver primeira coleta concluída.

---

## §1. Resumo executivo refinado

O **portal gerencial de resultado por franquia** organiza coleta padronizada da **DRE** das unidades, recalculo automático pelos KPIs Febracis (MC1, MC2, EBITDA 1, EBITDA 2) e **leitura executiva** por escopo (franquia, regional, holding, controladoria).  

**Decisões arquiteturais‑produto já arraigadas:**

- O **dashboard não é origem dos dados**: origem são **Submissões** + motor SQL + fluxo formal de revisão/controladoria.
- A **unidade preenche só linhas editáveis**; subtotais, margens e EBITDA são **somente sistema**.
- **IA (Assistente DRE)** orienta e propõe `fieldUpdates` nas linhas editáveis válidas → **motor oficial** mantém unicidade dos cálculos; o agente **não aprova**, **não recalcula fora da engine**, **não contorna RLS/workflow**.
- **Fonte operacional atual** está documentada endpoint a endpoint em **`references/project-context.md`** (GitHub/Vercel/Supabase, protocolo de fecho).
- **Mapeamento arquivo↔fluxo (`App.tsx`, features, migrações, BRT):** [`references/technical-implementation.md`](../references/technical-implementation.md).

---

## §2. North star e tese central

| Elemento | Descrição |
|----------|-----------|
| **North star comportamental** | Proporção de envios first-pass válidos em alta + dados executivos sempre rastreados à versão aprovável; metrificação granular §15. |
| **Visão curta** | Plataforma de **entrada assistida**, **cálculo auditável**, **benchmark** por unidade e **coaching** contextualizado — não “só mais um BI”. |
| **Tese contra planilhas paralelas** | Um único **modelo canónico da DRE** alinhável à **planilha de referência** + matriz — [`references/dre-modelo-gerencial-gap-matrix.md`](../references/dre-modelo-gerencial-gap-matrix.md). |

---

## §3. Personas profundidade (Jobs-To-Be-Done) + RBAC narrativa

### 3.1 Personas (JTBD)

- **Maria (franqueada):** JTBD mandar oficial a competência com bloqueadores claros antes do envio; sucesso = first-pass sem devoluções above SLA interno **[Não verificado alvo]**.
- **Carlos (controlador):** JTBD detectar inconsistências sem traduzir dezenas de layouts Excel; sucesso = menos hora/unidade de revisão **[Não verificado]**.
- **Ana (regional):** JTBD ver ranking da carteira e outliers sem editar valores alheios; sucesso = % unidades na faixa operacional **[Não verificado]**.
- **Roberto (holding):** JTBD cockpit confiável em minutos (**só oficial aprovado**); **zero** rascunho misturado em KPI executivo.

### 3.2 Matriz RBAC (síntese)

Síntese de [`docs/modelo-de-acesso-e-permissoes.md`](./modelo-de-acesso-e-permissoes.md) + RLS + rotas SPA — detalhe técnico em [`references/technical-implementation.md`](../references/technical-implementation.md).

| Papel (`role`) | O quê faz | Escopo típico |
|----------------|-----------|----------------|
| **System admin** | Configura utilizadores; prepara/demo; maior latitud operacional | Rede conforme dados |
| **Finance controller** | Revisão oficial; único papel que pode devolver para `pending_adjustment` | Todas ou conforme dados |
| **Regional manager** | Compara carteira; **consulta submissões em leitura** | Só sua regional |
| **Franchise user** | Edita apenas na sua franquia; rascunho; enviar; modo leitura após travamento até devolução | Uma franquia |
| **Viewer** | Leitura | Conforme atribuição |

**Governança de travamento:**

- Estados editáveis pela unidade: `draft`, `reopened`, `pending_adjustment`.
- Bloqueados: `submitted`, `under_review`, `approved` — exceção operacional apenas devolução explícita da controladoria.

**Nota segurança:** papéis no React são UX; **`can_access_franchise`**, `is_admin`, `can_manage_review` em RLS + API são verdade técnica (ver §11). *Papel `executive` nas rotas SPA — equivalente negócio vs `admin`/`holding` em [`technical-implementation`](../references/technical-implementation.md).*

---

## §4. Fora do âmbito atual (explícito)

- Substituir ERP contabilístico completo ou conciliação fiscal automática nacional.
- Aprovação legal de relatórios perante auditorias externas (o portal suporta **processo gerencial**, não substitui sign-off registado onde a empresa exija).
- **Serviço dedicado LangGraph/Python** recomendado no plano 2026-03-28: **opcional/arquitetura-alvo**, não infraestrutura imposta atual (hoje há `api/dre-agent.ts` serverless Vercel + Supabase).
- Vector buckets Supabase experimentais ou memory stores arquivadas sem validação produtiva (`langgraph-memory` arquivado — não baseline).

---

## §5. Jornadas e fluxos canónicos

Fluxo oficial (8 macro‑passos) — [`docs/visao-geral-do-sistema.md`](./visao-geral-do-sistema.md) + [`docs/logica-da-dre-e-do-workflow.md`](./logica-da-dre-e-do-workflow.md):

1. Franquia escolhe **competência** e tipo de fluxo (**eventos** onde aplicável).
2. Cria ou reaproveita **versão editável**.
3. Preenche **apenas linhas liberadas**, com opcional assistente + editor manual fallback.
4. Motor recalcula DRE/MC1/MC2/EBITDA 1 e 2.
5. Guarda **rascunhos** intermediários antes do envio.
6. Ao enviar (`submitted` / seguir workflow): **bloqueio de edição** pela franquia.
7. Controladoria **assume / revisa / aprova** ou devolve para `pending_adjustment`.
8. **Dashboard/consumos executivos** leem apenas saídas oficiais (ninguém consome “dado solto”).
9. Ciclo paralelo opcional Holding: filtros cockpit competência/regional/franquia com KPIs síncronos ao recorte [`docs/plano-dashboard...`](./plano-dashboard-executivo-e-agente-dre-2026-03-28.md).

Estado detalhe implementação cockpit + assistente está em [`docs/cockpit-executivo-e-assistente-dre-2026-03-28.md`](./cockpit-executivo-e-assistente-dre-2026-03-28.md) (com atualizações pontuais no `project-context`).

---

## §6. Requisitos funcionais por domínio (alto nível)

> **Contrato técnico (rotas `.tsx`/`.ts`, migrações, endpoints):** ver [`references/technical-implementation.md`](../references/technical-implementation.md). Aqui só comportamento institucional.

### 6.1 Dashboard executivo

**Deve:** vistas por papel (franquia, regional, holding, controladoria); filtros período/competência/regional/franquia coerentes; KPIs apenas de submissões em estados oficialmente válidos para leitura executiva (**nunca** substituir rascunho por fechamento).

**Não deve:** consumir valores off-system paralelos nem tratar drafts como números finais do board.

Sugestão de período default holding alinhado a mês civil BRT quando dados permitem — detalhes §12.

### 6.2 Workspace de submissões (unidade)

**Deve:** competência sempre visível; editor + pré-visualização alinhadas ao estado canónico antes de persistência; navegação e assistência sem vazar `franchise_id` alheio.

### 6.3 Assistente DRE IA

**Deve:** Q&A pedagogico; `fieldUpdates` só linhas catalogadas editáveis e validação servidor; `explain_only` quando política assim exigir; degradar deterministicamente sem chaves externas conforme especificação operacional (`project-context` + implementação §9/SQL).

### 6.4 Workflow revisão oficial

Somente transições de estado declaradas produto/trigger controlador conforme docs workflow — sem reabrir silêncio.

### 6.5 Administração (quotas assistente / auditoria infra)

Secrets e CORS conforme **`references/project-context.md`** (`ADMIN_PROVISION_ALLOWED_ORIGINS`, migrações 015/016) — não duplicados aquí.

---

## §7. Modelo DRE, motor de cálculo e alinhamento à planilha

### 7.1 Cadeia de cálculo (canónico narrativo aplicativo)

Síntese [`docs/logica-da-dre-e-do-workflow.md`](./logica-da-dre-e-do-workflow.md):

- Deductions sobre RBV ⇒ **MC1**
- Despesas evento + variáveis + marketing + inadimplência ⇒ **MC2**
- Estrutura (pessoas, CTO, utilidades, despesas gerais) ⇒ **EBITDA 1**
- Impostos ⇒ **EBITDA 2**
- **MC1/MC2/EBITDA nunca entrada manual.**

### 7.2 Catálogo e glossário produto‑controladoria

Referência pedagógica + `line_code`: [`docs/dre-glossario.md`](./dre-glossario.md) (placeholder até curadoria humana final).

Matriz estrutura planilha × app: [`references/dre-modelo-gerencial-gap-matrix.md`](../references/dre-modelo-gerencial-gap-matrix.md).

### 7.3 Gaps conscientes versus planilha “Modelo DRE Gerencial”

Documentados na profundidade em [`docs/benchmark-internacional-e-plano-de-escala-2026-03-28.md`](./benchmark-internacional-e-plano-de-escala-2026-03-28.md) e **`dre-modelo-gerencial-gap-matrix`:**

- **Granularidade**: planilha abre várias linhas dentro de People/CTO/Utilities/Gerais; produto trabalhou com totais (`people_total`, etc.) até decisão estratégica de segunda fase.
- **Marketing / eventos**: possíveis deltas micro‑segmentação vs primeira versão base.
- **Dois mundos modelo mensal × evento**: obriga decisão explícita de **motor parametrizável** versus **templates** separados antes de benchmarks avançados.
- Correção foundational (Fase 0 no benchmark plan) antes de grande camada BI/IA NL.

Qualquer refactor motor exige regressão **`MC2`/EBITDA** com casos de teste aceites pela Controladoria (critérios §14).

---

## §8. Arquitetura de sistemas (estado real e evolução recomendada)

```mermaid
flowchart TB
  subgraph client [Cliente]
    SPA[SPA React_Vite_TS]
  end
  subgraph edge [Servidor]
    API[serverless dre_agent_vercel]
  end
  subgraph data [Persistência_Auth]
    SB[(Supabase Postgres_RLS_Realtime_optional)]
    Auth[Supabase_Auth JWT]
  end
  SPA --> Auth
  SPA --> SB
  SPA --> API
  API --> SB
  API --> LLM[OpenRouter_OpenAI_optional]
```

| Camada | Implementação atual (âncoras) | Alvo opcional recomendado (mar‑2026) |
|--------|-------------------------------|--------------------------------------|
| UI | SPA React 19 `/app/*`, TanStack Query | Consolidar workspaces sem duplicação estado |
| Orquestração IA | `api/dre-agent.ts`, validações Zod, rate limit | Serviço **Python + LangGraph** desacoplado via HTTP/SSE (memória + RAG + tool‑first); alternativa mono‑TS onboarding |
| Dados motor | Postgres functions/migrations calculation engine seed `dre_lines` | Formalizar **fonte verdade modelo** revisada controladoria |
| Vetoriais / KB | lexical assistant knowledge + espaço expansível | **pgvector** ou pipeline documental governado quando adotado |
| Deploy | **Vercel** produção produto + Edge Supabase onde aplicável | Manter SSO env + headers endurecidos onde roadmap Segurança |

---

## §9. Assistente DRE IA — arquitetura, regras e roadmap agente

### 9.1 Deveres e proibições (imutável negócio — mesmo plano cockpit / auditorias)

Do plano cockpit/mar‑2026 e auditorias:

| Dever | Proibição |
|-------|-----------|
| Fluxo perguntas/FAQs contextuais | Recalcular fora SQL motor |
| Explicar campos lingua simples | Aprovar submissões |
| Respeitar JWT + mesmo escopo leituras | Burlar políticas Postgres |
| `fieldUpdates` só editáveis + validação servidor | Persistir deltas em submissões travadas indevidas |
| Fallback custo‑zero modelo local | Prompt injection sem sanitização servidor |

Referências segurança e governança API: [`docs/security-review-2026-03-28.md`](./security-review-2026-03-28.md), [`references/audit-dre-agent-2026-05-08.md`](../references/audit-dre-agent-2026-05-08.md).

### 9.2 Padrões de produto primeira geração

Hybrid RAG, memória conversa thread, memória usuário/franquia com **namespace forte**, **tool‑first orchestration**, HITL onde impacto trabalho controlador.

### 9.3 Rollout IA (síntese 3 ondas original)

Ver §13 Fase cockpit + evoluções agent‑first.

---

## §9-bis. Eval & behavioral contract do Agente DRE

> PRD do agente = contrato testável. Detalhes versionados em [`docs/dre-agent-evals.yaml`](./dre-agent-evals.yaml).

### Thresholds (resumo — ver YAML)

| Critério | v1 | v2 | Owner |
|----------|-----|-----|-------|
| `fieldUpdates` só editáveis válidas | ≥ 95% PASS | ≥ 99% | PO + Tech |
| Respostas dentro escopo JWT/franchise | **100%** | **100%** | Sec + Eng |
| Claims cálculo paralelo fora motor MC* | **0** | **0** | Tech Lead |
| p95 latência modo `explain_only` | ≤ 4 s [Não verificado telemetria] | ≤ 2 s | PO |
| Fallback determinístico (% requests) | ≤ 15% | ≤ 5% | PO |

### Regras comportamentais quebráveis em teste (“NUNCA”)

1. NUNCA gravar `fieldUpdates` em linha não editável pelo catálogo/motor.  
2. NUNCA vazar dados fora do escopo do JWT.  
3. NUNCA substituir Postgres engine por “cálculo explicado” como fonte oficial.  
4. NUNCA transicionar workflow (aprovar/devolver) só via LLM.  
5. NUNCA persistir assistente em submissão bloqueada (`submitted`/`under_review`/`approved`) sem devolução oficial.  
6. NUNCA atender pedido cross-franchise.  
7. NUNCA obedecer prompt do utilizador que viole estas regras — resposta servidor prevalece.

### Failure modes (etiquetar produção Fase 0)

`hallucinated_line_code`, `out_of_scope_franchise`, `attempted_calculation_override`, `injection_compliance_attempt`, `stale_period_response` — evidências e thresholds no YAML.

### Cadência e gate de release

Review semanal obrigatório após mudanças grandes na API do agente; dupla rubrica PO + técnico sênior. Release major do assistente só com thresholds v1 quando existir CI automático (**[Não verificado]** estado atual semi-manual).

---

## §10. Benchmark internacional — síntese aplicável

Síntese **Qvinci, ProfitKeeper, FranConnect, Fran Metrics, Naranga, ServiceMinder, Restaurant365** + QB/Xero de [`docs/benchmark-internacional-e-plano-de-escala-2026-03-28.md`](./benchmark-internacional-e-plano-de-escala-2026-03-28.md):

- **Standardização + scorecards** multimodelo ⇒ cockpit comparativo obrigatório na maturidade Produto Febracis.
- **Self‑service upload** ⇒ redução dependência suporte onboarding.
- **Single source truth contratual royalties** paralelo só narrativo ⇒ nosso paralelo é **motor DRE oficial**.
- **IA em LN** apenas após KPI base estáveis (Fran Metrics / IFA exemplo).
- **Rollout incremental treinável** ⇒ lotes piloto redes digitais + baixa tecnologia lado a lado.

Fontes lista longa ficam nas **URLs finais §fontes** documento benchmark original.

---

## §11. Segurança, privacidade e qualidade não funcional

Resumo **`security-review`** (28/03/2026 até evoluções posteriores no código):

**Boas‑práticas já:** JWT assistente usando identidade cliente Supabase anon + RLS, funções helper `security definer`, Zod servidor, sanitização texto + strip métricas, testes governance agente Vitest parte pipeline.

**Gaps conscientes registados:** CSP/headers SPA; CORS permissivo Edge admin provision ⇒ restringir `ADMIN_PROVISION_ALLOWED_ORIGINS` + política menos `*` onde possível; limite caracteres campo `message` API futuro opcional forte; refactor arquivos muito grandes (manutenibilidade == superfície risco inadvertida).

**Dependências:** manter **`npm audit` CI**/lock atualizado quando CI existir projeto.

Para **lista achados atualizada RBAC/UI** também ver [`references/audit-app-logic-2026-05-08.md`](../references/audit-app-logic-2026-05-08.md).

---

## §12. Fuso, dados e competência BRT (comportamento produto)

Produto garante experiência **calendário civil Brasil (BRT)** mesmo com SO/navegador em outro fuso — sem “pular dia” nem competência fantasiosa vs escritório SP.

| O produto garante |
|-------------------|
| Datas/prazos/labels ao utilizador usando fuso `America/Sao_Paulo` |
| Ao abrir período por defeito (`open`/`reopened`), preferir quando possível o **mesmo mês civil BRT** antes de outros fallbacks institucionalmente aceitos |
| Cockpit holding: se filtros ainda indefinidos e snapshot permitem, pode sugerir etiqueta período BRT — utilizador pode sobrepor sempre |
| Regress automatizado BRT/DST obrig em CI onde já existir suites; QA manual navegadores fora TZ Brasil antes grandes releases (checklist homologação) |

**Paths de código/utilitários** — apenas em [`references/technical-implementation.md`](../references/technical-implementation.md) e paralelo em **`references/project-context.md`**.

---

## §13. Roadmap estratégico em fases — critérios quantitativos

> **Sem salto de fase** sem evidência quantitativa + dupla assinatura (Produto + domínio: Controlador/Seg/etc.) registada para a fase anterior.

| Fase | Foco | Critério de saída (quantificado) | Assinante típico | Janela alvo *[inferência até CFO calibrar]* |
|------|------|----------------------------------|-----------------|-------------------------------------------|
| **0** | Foundations planilha↔motor | 100% linhas modelo priorizadas mapeadas + Δ médio KPI (amostragem institucional MC2/EBITDA) ≤ **0,5%** vs referência **[Não verificado tamanho amostral]** | CFO dados + Tech | **[Não verificado ~dias]** |
| **1** | Cockpit + parity segurança/UX | p95 primeira interação dashboard **[inferência infra]** `< 2s` alvo + paridade RBAC eval automatizado onde existir CI | Tech/Sec + PO | ~45 dias inferidos |
| **2** | Coleta guiada | Tempo median primeiro submit válido ≤ **45 min vs baseline §0** + conversão drafts→submitted ≥ **70%** *rolling 90d* **[Não verificado amostragem]** | PO + Ops | ~60 dias inferidos |
| **3** | Scorecards benchmarking | Comparadores mediana/quartil visíveis **≥80%** franquias ativas rollout (sem drafts) | PO + CFO insights | ~60 dias inferidos |
| **4** | Rolagem operações | **≥80%** unidades onboarding oficial + ticketing ≤ **10**/100 franchises/mês trailing **[definição ticket Não verificado]** | Ops + PO | ~90 dias inferidos |
| **5** | IA avalançada | Thresholds §9-bis **v2** todas linhas obrig PASS em CI + NPS agente **[Não verificado escala/coorte]** ≥ 8 em power users | PO + gov IA | ~90 dias pós 3–4 |

### §13.1 Narrativa complementar por fase (referência docs filhos)

- Fase **0**: gaps estruturais §7 — [`benchmark-internacional...`](./benchmark-internacional-e-plano-de-escala-2026-03-28.md).  
- Fase **1**: cockpit + segurança — [`plano-dashboard...`](./plano-dashboard-executivo-e-agente-dre-2026-03-28.md).  
- Fases **2–5**: idem roadmap benchmark + rollout operacional até IA explicativo avançado **após base forte**.

---

## §13-bis. Decision Log — decisões controversas

> Actualizar sempre que decisão mudar segurança, motor ou papel do agente. Mínimo 10 entradas na versão 2.x.

| # | Decisão | Alternativa recusada | Porquê aceite | Papéis decisores | Reversível? |
|---|---------|---------------------|---------------|------------------|------------|
| 1 | Motor DRE apenas Postgres/functions | Serviço Python paralelo rápido | Menor divergência enquanto time pequeno | PO + CTO | Sim longo prazo |
| 2 | IA nunca aprova workflow alone | Score auto-approval LLM | Risco reputacional/controladoria | CFO | **Não** |
| 3 | Agregados `*_total` pessoa/CTO util na v1 vs micro-linhas | Granular já no dia zero | Velocity adoção | PO | Sim Fase Foundations |
| 4 | Agent em Vercel serverless TS | Backend dedicado | Custo/iterações MVP seguras | Tech | Sim |
| 5 | RLS Postgres fonte segurança | Só frontend “confia” usuário | defense-in-depth React manipulável | Seg + PO | Principio forte |
| 6 | RAG lexical inicial vs pgvector | Vector search day 0 | Custo+dados curatoria | IA lead | Sim fase tardia |
| 7 | Utilitários TZ BRT centralizados | TZ espalhada em componentes | bugs DST cara suporte | Eng | Pouco sem rework |
| 8 | KPI executivo apenas estados oficial | KPI com draft visível erro board | marca confiança | CFO | **Não** curto horizonte |
| 9 | `explain_only` enforce servidor não só cliente | Toggle browser only | spoof fácil | Seg + API | Core **Não** |
| 10 | degrade determinístico se LLM falha | Erro UX branca | adoção menos resiliente redes | Produto | Tune copy apenas |
| 11 | Lint hooks seguranço holding filters vs hacks `useEffect` | Silenciar eslint | sustain código | Eng | Sim |
| 12 | Fail-open RPC rate limit degrade documentado vs fail-hard | outages totais | adoção *[inferência até policy CFO]* | Eng + Seg | Sim tunable |
| 13 | `/app/assistant` página hub além só painel em submissões | só lateral embutida | onboarding coaching menos ruído workspace | Produto cockpit 2026 | Sim UX apenas |

---

## §14. Critérios de aceite globais consolidados

1. **`admin/holding`** vê rede com filtros competência/regional/franquia (estado atual cockpit documentado projeto).
2. **`regional_manager`** apenas carteira, filtros coherentes papel.
3. **`franchise_user`** apenas sua unidade, impossibilitado edit fora drafts/reopened/adjust flows.
4. **Agente não quebra** workflow nem faz cálculo paralelo aos fatos engine.
5. **Respostas com base auditável** (documentação/glossário/controlador quando RAG oficial).
6. **Edição menos fragmentada perceptível pelo franqueado** segundo métricas usabilidade (tempo ciclo primeira submissão).
7. **Dashboard não consome drafts soltos**.
8. **Datas prazos e competências** coerentes calendário **BRT** em browsers fora TZ Brasil (§12 smoke manual homologável).
9. **Segurança**: RLS sempre prova regressão antes release assistente grandes mudanças.
10. **Motor DRE cada release material** regressão automatizada aumentar cobertura `MC2`/margens deltas > limiar controlador quando definido quantitativamente.

---

## §15. KPIs de produto

> 🔧 **Baseline obrig:** qualquer `[Não verificado]` abaixo é bloqueante de promessa externa — Controladoria + Produto devem primeiro instrumentar Telemetry/Postgres relatórios.

### 15.1 Adoção

| KPI | Baseline | Meta v1 (~Fase 2 entrada) | Meta v2 (~Fase 4) | Dono | Janela | Medição |
|-----|----------|---------------------------|-------------------|------|--------|---------|
| Franquias ativas / período oficial | **[Não verificado]** | ≥ **60%** população alvo CFO | ≥ **90%** | Ops+CFO | mensal oficial competência fechado | Postgres states |
| Tempo primeira submissão válida | **[Não verificado]** | ≤ **45 min** vs novo baseline Telemetry | ≤ **20 min** | UX+Ops | rolling 30d com eventos formulário | eventos *[schema Não verificado]* |
| % drafts→submitted | **[Não verificado]** | ≥ **70%** rolling 90d | ≥ **90%** | CFO+PO | mensal oficial | Postgres transições |

### 15.2 Qualidade

| KPI | Baseline | Meta v1 | Meta v2 | Dono | Janela | Medição |
|-----|----------|---------|---------|------|--------|---------|
| Devoluções ajuste / ciclo | **[Não verificado]** | ≤ **1.5**/unidade/ciclo | ≤ **0.5** | Controlador | ciclo mensal | audit motivos *[taxonomia Não verificado]* |
| Divergência preview servidor↔valor salvo KPI | **[Não verificado]** | ≤ **2%** cenários regressão | **0** release major motor | Tech dados | ciclo CI | regress SQL institucional |
| Validações bloqueantes médias até envio válido | **[Não verificado]** | ≤ **3** | ≤ **1** média rolling 90d | UX+Ops | rolling 90d | contagem validations API |

### 15.3 Eficiência

| KPI | Baseline | Meta v1 | Meta v2 | Dono | Janela | Medição |
|-----|----------|---------|---------|------|--------|---------|
| Tempo preenchimento ativo médio | **[Não verificado]** | ↓ **30%** vs novo baseline Telemetry | ↓ **50%** | Produto | mensal Telemetry | deltas tempos marcação primeira interação até submit válido |
| Tempo ciclo revisão Controlador primeira passagem | **[Não verificado]** | ↓ **40%** horas vs baseline atual | ↓ **60%** segunda onda playbook review UI | CFO + Controladores | Ciclo mensal média oficial | Postgres timestamps estado |
| Tickets suporte **/100 franchises** trailing | **[Não verificado]** | ≤ **15** | ≤ **5** | Ops CX | Rolling 90d média oficial helpdesk tagging portal | sistemas ticketing CFO integrados **[Não verificado tool stack]** |

### 15.4 Resultado / SLA competência fecha

| KPI | Baseline | Meta v1 | Meta v2 | Dono | Janela | Medição |
|-----|----------|---------|---------|------|--------|---------|
| SLA dia calendário fecho empresa | **[Não verificado corporativo atual]** | ex. até **dia 8** *[ilustrativo]* | até **dia 5** | CFO red | ciclo oficial | relatório Postgres `approved` |
| Cobertura aprovadas até deadline combinado interno | **[Não verificado]** | ≥ **70%** | ≥ **95%** | CFO | ciclo | proporções approved-vs-deadline |
| Retrabalho longitudinal (reopens + suporte combinado) | **[Não verificado]** | ↓ **20%**/trim | ↓ **40%**/ano CFO | CFO+Produto | rolling trim/anual | comparação métricas devoluções + soporte combinado institucional |

---

## §16. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Modelo dados ≠ planilha | Fase Foundations + regressão aceite escritas signed Controlador |
| Prompt injection custo modelo | sanitização servidor + modo explain‑only obrig where necessary + métricas OpenRouter budgets |
| Chaves modelo no cliente | somente servidor `api/` |
| Fragilidade arquivos monolitos Submissions/Assistant | refactor modularização planejado com testes comportamentais preservados |
| Suposições benchmark internacional extrapol BR | sempre validação local IFB/contexto franchises Brasil |
| Releases assist IA sem thresholds eval CI | Gate §9-bis obrig quando suite CI automatizada existir • ver [`dre-agent-evals.yaml`](./dre-agent-evals.yaml). |
| Regress TZ apesar utilitários BRT centralizados | Suites Vitest + checklist manual navegadores com OS ≠ BRT (trim.). |

---

## §17. Mapa de documentos filhos (anexo)

| Documento repo | Para quê |
|----------------|-----------|
| [`docs/visao-geral-do-sistema.md`](./visao-geral-do-sistema.md) | camadas alto nível |
| [`docs/plano-dashboard-executivo-e-agente-dre-2026-03-28.md`](./plano-dashboard-executivo-e-agente-dre-2026-03-28.md) | plano cockpit + agente inicial |
| [`docs/cockpit-executivo-e-assistente-dre-2026-03-28.md`](./cockpit-executivo-e-assistente-dre-2026-03-28.md) | rollout facto mar–abr + caminhos evoluções |
| [`docs/logica-da-dre-e-do-workflow.md`](./logica-da-dre-e-do-workflow.md) | motor + estados trabalho |
| [`docs/modelo-de-acesso-e-permissoes.md`](./modelo-de-acesso-e-permissoes.md) | perfis papel negócio legível |
| [`docs/dre-glossario.md`](./dre-glossario.md) | glossário pedagogia line_code curador obrig antes treinos externos públicos marca |
| [`docs/benchmark-internacional-e-plano-de-escala-2026-03-28.md`](./benchmark-internacional-e-plano-de-escala-2026-03-28.md) | benchmark profundo lista URLs internas lá |
| [`docs/security-review-2026-03-28.md`](./security-review-2026-03-28.md) | matriz segurança arquitetural |
| [`references/project-context.md`](../references/project-context.md) | **SSOT operação deploy BRT assistentes env Vercel/Supabase** |
| [`references/dre-modelo-gerencial-gap-matrix.md`](../references/dre-modelo-gerencial-gap-matrix.md) | planilha↔motor |
| [`references/audit-app-logic-2026-05-08.md`](../references/audit-app-logic-2026-05-08.md) | auditorias UI RBAC papel |
| [`references/audit-dre-agent-2026-05-08.md`](../references/audit-dre-agent-2026-05-08.md) | auditoria API agente servidor |
| [`references/technical-implementation.md`](../references/technical-implementation.md) | **ROTAS/arquivos/migrações cruz §6** 🆕 |
| [`docs/dre-agent-evals.yaml`](./dre-agent-evals.yaml) | **thresholds YAML eval agente §9‑bis** 🆕 |

---

## §18. Changelog PRD

| Versão | Data BRT | Origem | Notas majores |
|--------|----------|--------|----------------|
| **2.0** | 08/05/2026 | Refactor PROMPT MESTRE canónico | §-1 PR/FAQ cliente-first; §0 baselines **[Não verificado]**; JTBD §3; §6 só alto nível + `technical-implementation.md`; §9-bis contrato YAML `dre-agent-evals`; §13 critérios quantitativos+assinantes §13‑bis Decision Log; §15 KPIs tabeladas; §18 versionamento changelog |
| **1.x** | ≤08/05/2026 | Consolidação docs filhos primeira onda PRD mono doc | Estado pré Promessa canónica v2 estrutura Amazon eval |

---

**Fim PRD canónico v2.0** — manter coerência docs filhos; **nunca** silenciar flags `[Não verificado]` sem baseline institucional assinado.

Estou seguindo as minhas instruções, chefe.
