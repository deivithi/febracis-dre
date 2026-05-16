# Glossário DRE — Febracis (alinhamento controladoria + portal)

Este documento alinha a linguagem das **abas Submissões** e **Assistente DRE** com a ordem típica da demonstração do resultado no Brasil e com referências **sectoriais de franquia**. **Última curadoria humana institucional (Controladoria + Financeiro) é obrigatória** antes de uso externo, treino de rede ou fixação oficial de nomenclatura.

## 1. Ordem oficial e referências (alto nível)

| Referência | Uso neste portal |
|------------|-------------------|
| **Lei das S.A. 6.404/76**, art. 187 | Ordem obrigatória da DRA/DRE corporativa |
| **NBC TG 26** (R5, CFC) | Convergência conceitual com IFRS na apresentação do resultado |
| **IFRS — Conceptual Framework** | Linguagem consistente para receita real vs. outros fluxos económicos |
| **Setoriais de franquia (IFB, SBVC, trade press)** | Contexto típico: RBV, margens contribuição MC1/MC2, royalties, royalties variados em eventos |

## 2. Linhas editáveis (por `line_code`)

| `line_code` | Nome típico | Nota pedagógica |
|-------------|-------------|----------------|
| `gross_revenue` | Receita bruta | Base antes de todas as deduções e custos diretos da unidade |
| `discounts_returns` | Descontos e devoluções | Reduz RBV até “receita líquida comercial”; evitar lançamentos que pertençam a marketing |
| `split_holding` | Split Holding | Deducível da base corrente segundo política grupo/holding definida pela Febracis |
| `cispay` | Cispay | Custo tecnológico de pagamentos variável |
| `ed_commission` | Comissão ED | Custos relacionados aos executivos de desenvolvimento vinculados ao período |
| `franchise_fee` | Taxa franquia / royalties | Custos obrigacionais típicos de contratos de franchise |
| `event_trainer_cost` | Facilitadores / Treinadores | Custos específicos de eventos (Método CIS e similares) |
| `variable_card_fees`, `variable_logistics`, `variable_room_rent` | Despesas variáveis não-evento | Complementares ao bloco variável oficial |
| `marketing_*` | Marketing | Digital, offline, regional, brindes — micro-segmentação pela controladoria |
| `default_gross`, `default_recovery` | Inadimplência | Bruto menos recuperações para inad implência líquida operacional |
| `people_total` | Folha / pessoas | Bloco próprio dentro de estruturas em “structure”; fase própria no stepper guiado |
| `cto_total`, `utilities_services_total`, `general_expenses_total` | Estrutura / administrativo | Custos estruturais da unidade fora das variáveis e marketing |
| `taxes` | Impostos | Antes do EBITDA 2 oficial no motor |
| (linhas resultado) | MC1, MC2, EBITDA | Calculadas pela engine SQL — apenas leitura no UI |

### Texto corrido (~1 linha cada, didática rápida)

- **RBV**: faturação bruta do período, sem netting de impostos comerciais.
- **Deducões RBV**: o que habitualmente aparece antes do CMV/MC1 quando o catálogo for reduzido a deduções de venda líquida.
- **Custos variáveis de evento**: treinamento, sala, infraestrutura que escala diretamente com evento (não marca fixa estrutura).
- **Custos variáveis de operação**: matéria que segue volumetria diferente dos eventos.
- **Marketing**: investimento de demanda direta ao pipeline comercial reconhecível no período.
- **Inadimplência**: bruto + recuperações separados por transparência de créditos.
- **Folha CLT**: pessoas da unidade, sem duplicidade com freelancers se estiverem segregados pela controladoria.
- **Administrativos / CTO / utilities**: suporte estrutura de operação física/digital.
- **Impostos**: tributos antes do resultado EBITDA 2.
- **MC2 · EBITDA**: fechamentos finais automatizados; qualquer duvida volta para tributos/pré resultado.

### Assistência técnica (portal / agente)

- Os blocos opcionais injetados no prompt (ex.: `referencia_historica_franquia(...)`, persona compacta) são **filtro servidor + RLS**: só entram valores da **mesma franquia** e com **marcador de texto não confiável**. Mesmo assim, qualquer discrepância com a prévia/UI deve resolver-se contra o **motor DRE oficial** e os valores gravados em `submission_input_values`.
- **DRE-ISA (estado ideal):** metas declarativas (`marketing_pct_rbv_target`, `ebitda_target_pct_of_gross`) persistidas em `assistant_persona_memory` com kind `dre_ideal_state` quando a funcionalidade está ativa no servidor.
- **Memória persona:** factos de baixo cardinalidade por `profile_id` + `franchise_id`; TTL opcional via env (`DRE_AGENT_PERSONA_TTL_DAYS`).
- **Digest semanal:** RPC `fn_agent_weekly_feedback_digest` — agrega humor declarado em mensagens com schema `assistant_feedback_capture` (últimos 7 dias).

---

**Última curadoria automatizada técnica (IA + agente FE):** ajustes finais de produto ficam sempre com Human-in-the-loop (Controladoria + Financeiro).
