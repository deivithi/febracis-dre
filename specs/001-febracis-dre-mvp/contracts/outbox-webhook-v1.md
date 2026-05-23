# Contrato webhook outbox v1.0 — febracis-dre

> **Encoding & evolution (DDIA Cap. 4)** — contrato versionado para consumidores n8n / agregadores.

**Versão:** `1.0`  
**Última revisão:** 23/05/2026 BRT  
**Schema:** [`outbox-webhook-v1.schema.json`](./outbox-webhook-v1.schema.json)  
**Produtor:** `POST /api/outbox-dispatcher` → `OUTBOX_WEBHOOK_URL`  
**Telemetria alinhada:** [`events-telemetry.json`](./events-telemetry.json)

---

## Versionamento

| Regra | Detalhe |
|-------|---------|
| Campo canónico | `contract_version: "1.0"` no body JSON |
| Header opcional | `X-Febracis-Contract-Version: 1.0` |
| Header evento | `X-Febracis-Outbox-Event`, `X-Febracis-Outbox-Id` |
| Breaking change | Novo major (`2.0`), URL webhook separada ou branch n8n explícita |
| Backward compatible | Novos campos opcionais em `payload` — OK em v1.x |

---

## Dedup (PROD-02)

Consumidor **deve** tratar como idempotente usando, por ordem de preferência:

1. `outbox_id` (UUID único por evento)
2. `payload.status_history_id` (uma transição de workflow)
3. Hash estável de `event_type` + `submission_id` + `payload.changed_at` (fallback fraco)

---

## Mapeamento eventos

| `event_type` | `telemetry_event` |
|--------------|-------------------|
| `submission.submitted` | `submission_submitted_valid` |
| `submission.approved` | `submission_approved` |
| `submission.pending_adjustment` | `submission_returned_controller` |

---

## Exemplo payload

```json
{
  "contract_version": "1.0",
  "source": "febracis-dre-outbox",
  "outbox_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_type": "submission.submitted",
  "telemetry_event": "submission_submitted_valid",
  "payload": {
    "telemetry_event": "submission_submitted_valid",
    "submission_id": "11111111-1111-1111-1111-111111111111",
    "from_status": "draft",
    "to_status": "submitted",
    "reason": "Submissao enviada pela unidade.",
    "changed_by": "22222222-2222-2222-2222-222222222222",
    "changed_at": "2026-05-23T21:00:00.000Z",
    "franchise_id": "33333333-3333-3333-3333-333333333333",
    "franchise_name": "Franquia Demo",
    "reporting_period_id": "44444444-4444-4444-4444-444444444444",
    "period_label": "2026-05",
    "ebitda_2": 12345.67,
    "status_history_id": "55555555-5555-5555-5555-555555555555"
  },
  "retry_count": 1,
  "dispatched_at": "2026-05-23T21:05:00.000Z"
}
```

---

## n8n — checklist consumidor

1. Webhook node aceita POST JSON.
2. IF node: `{{ $json.contract_version }} === '1.0'` — senão route erro/DLQ.
3. Dedup node (Postgres/Redis/Code): insert `outbox_id` unique.
4. Switch em `telemetry_event` para ramificações CRM/Slack/Telemetry.
5. Error workflow com alerta Telegram (skill `error-alerting`).

Workflow exemplo: [`../../../../automacoes/febracis-dre/outbox-consumer-v1.example.json`](../../../../automacoes/febracis-dre/outbox-consumer-v1.example.json)

---

## Evolução planeada v1.1 (non-breaking)

- Campo opcional `payload.version_number` (int)
- Campo opcional `environment`: `production` | `preview`

## v2.0 (breaking — ADR antes)

- Renomear `telemetry_event` → `analytics_name`
- Envelope CloudEvents wrapper
