# RUNBOOK — febracis-dre (incidentes e recuperação)

## Âmbito

Procedimento curto para **Sev 1–3** no portal (`febracis-dre.vercel.app`), Postgres Supabase e funções serverless em `api/*`.

## Severidades (orientação)

| Sev | Exemplo | Primeira ação |
|-----|---------|----------------|
| 1 | Login/auth globalmente quebrado, dados inconsistentes expostos | Bloquear rota/feature na Vercel ou rollback deploy imediato + comunicação stakeholder |
| 2 | Assistente DRE 5xx sustentado, motor submissões ok | Rollback Vercel + verificar logs Supabase / RPC agente |
| 3 | UX degradada, workaround existe | Ticket + correção em branch |

## Vercel — Instant Rollback

1. Dashboard projeto **`febracis-dre`** → **Deployments** → último deployment **Ready** anterior à regressão → **Promote to Production**.
2. Confirmar alias **`febracis-dre.vercel.app`** e smoke manual (`/` + `/app/submissions`).
3. Registar hash/deploy anterior útil em `references/project-context.md` (último `dpl_*` estável).

## Supabase — migrações e rollback SQL

1. Backup obrigatório antes de DDL em produção (Supabase Dashboard → Database → Backup ou política institucional).
2. Ordem de **ativação**: migrations ascendentes em `supabase/migrations/` (`supabase db push --linked` ou fluxo acordado).
3. **Reverter**: usar **somente** o par `.down.sql` correspondente em `supabase/rollbacks/` aplicado manualmente (`psql`) conforme [`references/ops-supabase-prod-migration-runbook.md`](references/ops-supabase-prod-migration-runbook.md). Validar pares com `npm run validate:migrations`.

## Pós-recuperação

- `npm run lint`, `npm run build`, `npm test`.
- Smoke prod opcional: [`tests/README-prod-pilot-smoke.md`](tests/README-prod-pilot-smoke.md).
- Agente DRE: eval live opt-in [`tests/integration/README-dre-agent-live-evals.md`](tests/integration/README-dre-agent-live-evals.md).
