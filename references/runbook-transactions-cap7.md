# Runbook — Transacções e write skew (DDIA Cap. 7)

> Migration **018** · PROD-05/PROD-07 · Isolation **READ COMMITTED** (default Postgres/Supabase)

**Última revisão:** 23/05/2026 BRT

---

## 1. Isolation level por fluxo

| Fluxo | Isolation | Mecanismo anti write-skew | Revision optimista |
|-------|-----------|---------------------------|-------------------|
| Salvar rascunho | READ COMMITTED | `SELECT … FOR UPDATE` + bump `revision` | `p_expected_revision` opcional |
| Enviar submissão | READ COMMITTED | Lock na linha + status guard | idem |
| Revisão controladoria | READ COMMITTED | Lock + transição via `fn_set_submission_status` | idem |
| Transição status / outbox | READ COMMITTED | `FOR UPDATE` em `fn_set_submission_status` | bump automático |
| Nova versão (franchise×período) | READ COMMITTED | `pg_advisory_xact_lock(hashtext…)` | N/A |
| KPIs / views dashboard | Mesma TX do save | `fn_calculate_submission_dre` síncrono | N/A |

**Não usamos** `SERIALIZABLE` global — custo desnecessário; locks por submissão cobrem o risco real.

---

## 2. Coluna `submissions.revision`

- Incrementa em: save, mudança de status (submit/approve/return/review).
- Cliente envia `p_expected_revision` nas RPCs; mismatch → `CONCURRENT_MODIFICATION`.
- `NULL` no param = só lock pessimista (compat rollout).

---

## 3. RPCs alteradas (018)

| Função | Novo parâmetro |
|--------|----------------|
| `fn_save_submission_inputs` | `p_expected_revision bigint default null` |
| `fn_submit_submission` | `p_expected_revision bigint default null` |
| `fn_review_submission` | `p_expected_revision bigint default null` |
| `fn_require_submission_row_lock` | helper interno |
| `fn_create_submission_version` | advisory lock |

Resposta JSON inclui `revision` quando aplicável.

---

## 4. Frontend

- `fetchSubmissionWorkspace` lê `revision`.
- `saveSubmissionInputs` / `submitSubmission` / `reviewSubmission` enviam revision.
- Erro `CONCURRENT_MODIFICATION` → mensagem amigável + refetch (`submissionConcurrency.ts`).

---

## 5. Cenários de teste manual

1. **Duas abas — save:** editar linhas diferentes, salvar quase ao mesmo tempo → segunda aba deve ver conflito ou serializar via lock.
2. **Save + submit:** submit enquanto outro save corre → um bloqueia até o outro terminar; status final coerente.
3. **Dois revisores:** aprovar e devolver em paralelo → um ganha; o outro falha com status inválido ou conflito de revision.

---

## 6. Deploy

1. Aplicar **017** (outbox) se ainda pendente, depois **018**.
2. `npx supabase db push --linked`
3. Redeploy frontend (passa revision nas RPCs).

---

## 7. Referências

- [`../supabase/migrations/018_submission_concurrency.sql`](../supabase/migrations/018_submission_concurrency.sql)
- Outbox: [`runbook-outbox-pilot.md`](./runbook-outbox-pilot.md)
- DDIA catálogo: [`../../docs/architecture/ddia/projects/febracis-dre.md`](../../docs/architecture/ddia/projects/febracis-dre.md)
