# Matriz: planilha «Modelo DRE Gerencial» × catálogo do portal

Fonte da planilha analisada: `Modelo DRE Gerencial.xlsx`, aba **Modelo DRE** (extração via `xlsx-cli`, valores de exemplo na coluna C).

## Resumo executivo

| Tema | Conclusão |
|------|-----------|
| **Estrutura de totais** | A planilha replica a cadeia **RBV → deduções → MC1 → despesas → MC2 → pessoas/CTO/utilities/gerais → EBITDA 1 → impostos → EBITDA 2**, alinhada à narrativa do motor em `docs/logica-da-dre-e-do-workflow.md`. |
| **Granularidade** | A planilha desagrega **Pessoas** (salários, comissões, encargos, etc.) e **CTO / utilities / despesas gerais** em várias linhas. O produto atual usa **campos agregados** (`people_total`, `cto_total`, `utilities_services_total`, `general_expenses_total`) por linha editável no Supabase. |
| **Eventos** | Planilha: bloco **Despesas Eventos** (treinador, locação, decoração, alimentação, brindes, logístico). No app: `event_trainer_cost` existe; outras linhas de evento podem estar no catálogo com outros códigos ou ainda concentradas — validar `dre_lines` em produção. |
| **Labels** | Pequenas diferenças de nomenclatura (ex.: «Custo logísitco» na planilha vs `variable_logistics` no código) — impacto só de UX/copy, não de lógica se o mapeamento contábil estiver fechado com a controladoria. |

## Mapeamento explícito (planilha → `FIELD_GUIDES` / códigos típicos)

| Rótulo na planilha (col. B) | Código / agregado no app | Notas |
|-----------------------------|--------------------------|--------|
| (=) RBV | `gross_revenue` | OK |
| (-) Descontos \| Devoluções | `discounts_returns` | OK |
| (-) Split Holding | `split_holding` | OK |
| (-) Cispay | `cispay` | OK |
| (-) Comissão ED | `ed_commission` | OK |
| (-) Taxa de franquias | `franchise_fee` | OK |
| (=) Margem Bruta MC 1 | *(calculado)* | Motor SQL / preview |
| (-) Custo Treinador | `event_trainer_cost` | OK |
| (-) Locação de espaço / Decoração / Alimentação / Brindes / Custo Logístico (evento) | *detalhe evento* | Planilha detalhada; app pode não ter 1:1 — checar `dre_lines`. |
| (-) Taxa com cartões | `variable_card_fees` | OK |
| (-) Custo logísitco (variável) | `variable_logistics` | Typo na planilha apenas. |
| (-) Locação sala | `variable_room_rent` | OK |
| Marketing digital / brindes / regional / off line | `marketing_digital`, `marketing_gifts`, `marketing_regional`, `marketing_offline` | OK |
| Perda de devedores / recuperação | `default_gross`, `default_recovery` | OK |
| MC 2 | *(calculado)* | Motor |
| Pessoas (várias sublinhas) | `people_total` | **Gap de granularidade**: planilha detalha; app agrega. |
| CTO (várias sublinhas) | `cto_total` | Idem. |
| UTILIDADES E SERVIÇO | `utilities_services_total` | Idem. |
| DESPESAS GERAIS | `general_expenses_total` | Idem. |
| Ebtida 1 | *(calculado)* | Planilha: `C28 - pessoas - CTO - utilities - gerais` coerente com narrativa EBITDA 1. |
| Impostos | `taxes` | OK |
| Ebtida 2 | *(calculado)* | OK |

## Próximos passos recomendados

1. **Export único de verdade**: alinhar com controladoria se a captura no portal deve permanecer **agregada** (menos fricção para o franqueado) ou se haverá **segunda fase** com sublinhas espelhando a planilha.
2. **Seeds / `dre_lines`**: comparar a lista real na base Supabase com a coluna B da planilha e ajustar `description` exibida no editor.
3. **`FIELD_GUIDES`**: enriquecer `help` onde a planilha tiver notas ou fórmulas que expliquem o signo (+/-).

## Segunda aba

**Modelo Eventos** — não detalhada nesta matriz; sugerido mesmo processo de extração quando o escopo de eventos for prioridade.
