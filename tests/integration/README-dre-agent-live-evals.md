# Evals «live» do agente DRE (opt‑in)

- **Por padrão** não faz chamadas HTTP reais contra `/api/dre-agent`.
- Para desenvolver cenários ligados ao ambiente staging/produção, defina **`DRE_AGENT_LIVE_EVAL=1`** e preencha:

| Variável | Descrição |
|----------|-----------|
| `DRE_AGENT_EVAL_JWT` | JWT Supabase do utilizador (apenas o token, sem prefixo `Bearer `). |
| `DRE_AGENT_EVAL_SESSION_ID` | UUID de `agent_sessions` alinhado à submissão. |
| `DRE_AGENT_EVAL_SUBMISSION_ID` | UUID da submissão em contexto. |
| `DRE_AGENT_EVAL_API_URL` | Opcional; defeito `https://febracis-dre.vercel.app/api/dre-agent` (previews/staging: sobrescrever). |

- **Nunca** gravar secrets no repo.
- **Smoke SQL (digest semanal)** — após aplicar migração `024_*`, num cliente SQL autenticado como utilizador com `can_access_franchise`:

```sql
select public.fn_agent_weekly_feedback_digest('<uuid_franquia>'::uuid);
```

Esperado: JSON com `window_days`, contagens de humor (`positivo_ct` / `negativo_ct`) e `captured_through` ou null quando não há amostras.
