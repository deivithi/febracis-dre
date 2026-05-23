# Runbook — Outbox piloto (workflow submissões)

> **DDIA Caps 10–11** · Migration `025_outbox_events.sql` · Relay `api/outbox-dispatcher.ts`

**Última revisão:** 23/05/2026 BRT

---

## 1. O que faz

Transições de workflow em **`fn_set_submission_status`** escrevem na **mesma transação**:

1. `submissions` + `submission_status_history` + `period_franchise_status`
2. Linha em **`outbox_events`** (só `submitted`, `approved`, `pending_adjustment`)

O worker **`/api/outbox-dispatcher`** (relay outbox):

1. **Vercel Cron** `0 11 * * *` UTC (fallback diário — plano Hobby)
2. **Recomendado SLO ≤5 min:** workflow n8n `outbox-dispatcher-cron-v1.example.json` (schedule 5 min → GET dispatcher)
3. `fn_claim_outbox_events` (SKIP LOCKED)
2. POST para `OUTBOX_WEBHOOK_URL` **ou** log JSON (`log_only`)
3. `fn_complete_outbox_event` → `published` ou `failed` + backoff

KPIs/views **não** passam pelo outbox — permanecem síncronos em `fn_calculate_submission_dre`.

---

## 2. Deploy checklist

| Passo | Comando / ação |
|-------|----------------|
| 1. Migration | `npx supabase db push --linked` (projeto `vwxgrjjwbvdiaqxqbryk`) |
| 2. Env Vercel | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, opcional `OUTBOX_WEBHOOK_URL` |
| 3. Redeploy | `npm run build && npx vercel --prod --yes` |
| 4. Smoke manual | `curl -H "Authorization: Bearer $CRON_SECRET" https://febracis-dre.vercel.app/api/outbox-dispatcher` |

---

## 3. Mapeamento telemetria

| Status SQL | `event_type` | `telemetry_event` |
|------------|--------------|-------------------|
| `submitted` | `submission.submitted` | `submission_submitted_valid` |
| `approved` | `submission.approved` | `submission_approved` |
| `pending_adjustment` | `submission.returned` | `submission_returned_controller` |

Contrato: [`specs/001-febracis-dre-mvp/contracts/events-telemetry.json`](../specs/001-febracis-dre-mvp/contracts/events-telemetry.json)

---

## 4. Operação

### Ver fila pendente (service_role / SQL editor)

```sql
select id, event_type, status, retry_count, available_at, created_at
from public.outbox_events
where status in ('pending', 'failed')
order by available_at
limit 20;
```

### Reprocessar falha manualmente

```sql
update public.outbox_events
set status = 'pending', available_at = now()
where id = '<uuid>';
```

### Payload exemplo

```json
{
  "telemetry_event": "submission_submitted_valid",
  "submission_id": "...",
  "from_status": "draft",
  "to_status": "submitted",
  "period_label": "2026-05",
  "ebitda_2": 12345.67,
  "status_history_id": "..."
}
```

---

## 5. Idempotência

- **`idempotency_key`:** `submission_status:<history_uuid>` — uma linha por transição de histórico.
- **Consumer externo:** deve deduplicar por `outbox_id` ou `status_history_id` (PROD-02).

---

## 6. Troubleshooting

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Cron 401 | `CRON_SECRET` ausente ou divergente | Alinhar env Vercel |
| Claim 500 | Migration 017 não aplicada | `db push` |
| Eventos presos em `processing` | Worker morreu mid-batch | Reset manual para `failed` ou `pending` |
| Webhook 4xx/5xx | URL n8n inválida | Corrigir `OUTBOX_WEBHOOK_URL`; backoff automático |

---

## 7. Contrato webhook v1.0 (Item 5 DDIA)

| Artefacto | Path |
|-----------|------|
| Schema JSON | `specs/001-febracis-dre-mvp/contracts/outbox-webhook-v1.schema.json` |
| Doc humana | `specs/001-febracis-dre-mvp/contracts/outbox-webhook-v1.md` |
| Workflow n8n exemplo | `automacoes/febracis-dre/outbox-consumer-v1.example.json` |

**Activar:** definir `OUTBOX_WEBHOOK_URL` na Vercel com URL do webhook n8n. Sem URL → modo `log_only` (comportamento actual).

Headers enviados pelo dispatcher: `X-Febracis-Contract-Version`, `X-Febracis-Outbox-Event`, `X-Febracis-Outbox-Id`.

---

## 8. Próximos passos (fora do piloto)

- Métricas: contagem `published`/`failed` por dia
- Dedup persistente no n8n (Postgres/Redis)
- Não mover rascunho (`fn_save_submission_inputs`) — volume alto, sem efeito externo
