# Gap: Despesas Variáveis e paridade com a planilha oficial (Descoberta — 2026-04-27)

**Status:** documento de descoberta para alinhamento com **Controladoria** antes de qualquer PR de alteração de `dre_lines` ou do motor SQL.

**Referências internas:**

- [`docs/logica-da-dre-e-do-workflow.md`](logica-da-dre-e-do-workflow.md)
- [`docs/benchmark-internacional-e-plano-de-escala-2026-03-28.md`](benchmark-internacional-e-plano-de-escala-2026-03-28.md) (planilha `Modelo DRE Gerencial.xlsx`)
- Migrations: [`003_seed_data.sql`](../supabase/migrations/003_seed_data.sql), [`011_submission_lock_and_dre_validation.sql`](../supabase/migrations/011_submission_lock_and_dre_validation.sql)

---

## 1. Contexto

O benchmark de 2026-03-28 registrou que, na planilha, a secao **Despesas Variáveis** corresponde a:

`Despesas Variaveis = taxa_cartoes + custo_logistico + locacao_sala`

No **estado atual do banco** (após a migration `011`), o produto já possui **linhas editáveis** nessa secao:

| `line_code` (app)   | Rótulo no app (migration 011)        | Analogia planilha (benchmark) |
|---------------------|--------------------------------------|------------------------------|
| `variable_card_fees` | Taxa com Cartões                     | taxa_cartoes                 |
| `variable_logistics` | Custo Logístico Variável             | custo_logistico              |
| `variable_room_rent`  | Locação de Sala                    | locacao_sala                 |

O subtotal `variable_expenses_total` continua **derivado** (soma dos três campos) no motor `fn_calculate_submission_dre` — alinhado à tese: **não é digitado manualmente**.

**Conclusão de escopo imediata:** o “gap” histórico (subtotal solto **sem** linhas de apoio no seed `003`) foi **endereçado na 011** para o núcleo `taxa + logística + sala`. O trabalho remanescente não é “inventar três linhas”, e sim **validar com a Controladoria** se a paridade com a planilha e com o **modo evento** está fechada, e o que ainda falta em UX/KPI (ex.: percentuais).

---

## 2. Tabela comparativa (planilha vs aplicação)

| Dimensão | Planilha (referência narrativa) | Aplicação (pós-011) | Observação |
|----------|---------------------------------|----------------------|------------|
| Linhas de entrada na secão “Despesas Variáveis” | Três entradas que somam o bloco | Três `line_code` `input` + `variable_expenses_total` subtotal | Paridade de **soma** alinhada ao texto do benchmark. |
| Ordem e nomenclatura | Nomes vêm do Excel | Nomes fixos no catálogo `dre_lines` | Divergência de **wording** não quebra cálculo; quebra expectativa de treinamento. |
| % da RBV | Presente de forma recorrente na planilha | Não mapeado neste doc (ver dashboards / KPI) | **Gap de produto** se a promessa for “igual à planilha” linha a linha. |
| Aba `Modelo Eventos` | Segundo modo operacional (36 linhas) | Portal focado no fluxo de submissão por competência/evento já existente, sem segunda “skin” de planilha | Pode exigir **regra de negócio** explícita: quando usar visão “evento” vs “gerencial”. |

---

## 3. Proposta de modelo (nenhuma implementação nesta fase)

1. **Manter** `variable_expenses_total` como subtotal somente derivado.
2. **Não** adicionar novas linhas editáveis sem decisão explícita da Controladoria (evita “frankenstein” de campos e retrabalho de treinamento).
3. Se a Controladoria exigir **mais** granularidade (ex.: separar adquirentes, taxa PIX, terceirizado X), o desenho seria: novas linhas `input` na secao `variable_expenses` + extensão de `fn_calculate_submission_dre` + ajuste de `drePreview` + validação `validation_rules`.

**Impacto mapeado (só após aprovação):**

- **Motor SQL** (`fn_calculate_submission_dre`): somar novos `line_code` no agregado `v_variable_expenses_total`.
- **Preview local** ([`drePreview.ts`](../src/features/submissions/drePreview.ts)): espelhar a mesma soma.
- **UI** ([`SubmissionsPage.tsx`](../src/features/submissions/SubmissionsPage.tsx) / tabela DRE): novas linhas vêm do catálogo; sem mudança de contrato do assistente (ele já consome o catálogo `input`).
- **Dados históricos:** submissões aprovadas com valores agregados num subtotal exigem **estratégia** (migrar para uma linha “Outros / legado” vs manter só total).

---

## 4. Perguntas para a Controladoria (reunião de fechamento)

1. A tríade `variable_card_fees` + `variable_logistics` + `variable_room_rent` está **aprovada** como espelho oficial da planilha para todas as unidades Brasil?
2. A planilha ou o procedimento operacional exige **mais** linhas neste bloco nos próximos 12 meses? Se sim, quais e em qual prioridade?
3. Os percentuais “% da RBV” da planilha devem aparecer **na tela de submissão** ou **apenas** no dashboard executivo (ou ambos)?
4. A aba / modo **“Modelo Eventos”** deve ser produto de primeira classe no portal (rotas, cópia, validação) ou continua **referência** apenas off-line?
5. Para submissões já **aprovadas** antes de qualquer expansão de linhas, qual regra: **não reabrir** salvo exceção, ou permitir ajuste com auditoria (já suportada pelo workflow)?

---

## 5. Critérios de aceite pro PR condicional (pós-OK)

- [ ] Assinatura do Deivithi + Controladoria no desenho de linhas (ou confirmação explícita de “nada a mudar”).
- [ ] Uma submissão de teste com valores nas três linhas bate com o Excel de referência **e** com `fn_calculate_submission_dre` (mesmos totais e MC2).
- [ ] `npm run validate:phase1:local` (ou suite equivalente) **verde** com credenciais de projeto.
- [ ] Nenhuma regressão: bloqueio de submissão, RLS, assistente (apenas `line_code` oficiais).

**Rastreio:** quando a Controladoria aprovar mudança estrutural, abrir o **“PR5”** dedicado (implementação) com migration numerada, sem misturar com rate limit/CI.

---

## 6. Riscos

- **Mapeamento incorreto** entre Excel e `line_code` treina o franqueado no erro — mitigação: glossário único (Guia) + amostra validada.
- **Escopo “dois modos de planilha”** (gerencial x evento) sem decisão gera **duas narrativas** no mesmo produto — mitigação: uma filosofia escolhida (ver AGENTS / integridade conceitual).

Nada a ser memorizado além do link deste arquivo e o estado **“aguardando OK Controladoria para PR5**”.
