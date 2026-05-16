# Migração Postgres — Supabase produção (Febracis DRE)

**Projeto referência:** `vwxgrjjwbvdiaqxqbryk` (URL canónica em `references/project-context.md` e `.env.example`).

## Antes de aplicar

1. **Backup** completo ou snapshot point-in-time conforme política Febracis.
2. Validar pares migration/rollback localmente: `npm run validate:migrations`.
3. Ler o ficheiro SQL da migration (`supabase/migrations/NNN_*.sql`) e o rollback espelho (`supabase/rollbacks/NNN_*.down.sql`).

## Aplicar (linked CLI — exemplo)

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push --linked
```

Confirmar no Dashboard: **Database → Migrations** ou query em `pg_catalog` conforme procedimento interno.

## Migration 024 — agente (SECURITY INVOKER + digest)

Objetivos:

- Vista `vw_agent_historical_dre_context` com `security_invoker` (Postgres 15+).
- `fn_agent_historical_dre_context` como **SECURITY INVOKER** (sem elevação implícita).
- `fn_agent_weekly_feedback_digest(uuid)` — métricas declarativas de feedback na última semana.

Verificação rápida (como utilizador autenticado com acesso à franquia):

```sql
select public.fn_agent_historical_dre_context(
  '<uuid_franquia>'::uuid,
  '<uuid_periodo_corrente>'::uuid,
  3
);

select public.fn_agent_weekly_feedback_digest('<uuid_franquia>'::uuid);
```

Esperado: JSON/array JSONB sem erro de permissão; digest com `window_days`, contagens e `captured_through` ou null.

## Rollback

1. Executar **na ordem inversa** o conteúdo de `supabase/rollbacks/024_agent_security_invoker_and_digest.down.sql` (ou script equivalente em psql).
2. Repetir smoke das RPCs acima.
3. Documentar incidente e novo estado em `references/project-context.md`.
