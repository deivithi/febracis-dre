# Operações pendentes — pós-migração Vercel (2026-04-27)

Este ficheiro consolida o que **não pôde ser concluído de forma autónoma** (tokens em falta no ambiente do agente) e deve ser executado **uma vez** com credenciais válidas.

## Checklist — app verde no browser

1. **Vercel Production:** `VITE_SUPABASE_ANON_KEY` + `OPENROUTER_API_KEY` → **redeploy** (CLI ou *Redeploy* no dashboard se `deploy --prod` falhar).
2. **Supabase:** token CLI (`login` ou `SUPABASE_ACCESS_TOKEN`) → `link` → **`db push`** (migration **015** no remoto).
3. **Smoke:** secção 4 deste ficheiro (login, LLM, 429, CORS).

## Status (2026-04-27 — agente)

| Item | Estado |
|------|--------|
| `.env.local` no workspace | **Ausente** — criar a partir de [`.env.example`](../.env.example) **ou** `vercel env pull` na conta legada / copiar chaves do Supabase (Settings → API) e OpenRouter. |
| Vercel Production envs | **7/9** presentes: `VITE_SUPABASE_URL`, `OPENROUTER_MODEL`, `OPENROUTER_APP_URL`, `AGENT_RATE_LIMIT_*` (3), `ADMIN_PROVISION_ALLOWED_ORIGINS`. **Faltam** `VITE_SUPABASE_ANON_KEY` e `OPENROUTER_API_KEY` (adicionar manualmente; não inventar). |
| Vercel Preview envs | **Pendente** — o projeto **não tem Git ligado**; a CLI não aplica `preview` com branch. Ligar Git no dashboard **ou** duplicar variáveis no Preview quando a UI permitir. |
| `npx vercel deploy --prod` | **Falhou** no remoto (mensagem vazia / `deploy_failed`). Workaround: *Redeploy* no dashboard após segredos **ou** `vercel build --prod` + inspecionar logs do *deployment* na dashboard. |
| `supabase link` / `db push` | **Bloqueado** — *Access token not provided* (`supabase login` ou `SUPABASE_ACCESS_TOKEN`). |
| `supabase secrets set` (CORS) | **Pendente** do passo acima. |
| Migration 015 | **Pendente** no remoto. **SQL canónico:** [`supabase/migrations/015_agent_rate_limits.sql`](../supabase/migrations/015_agent_rate_limits.sql) (alternativa: SQL Editor no Studio, com validação de idempotência). |

## Estado já verificado

- **Vercel:** projeto `febracis-dre` no team `richardrios10000-5421s-projects`, deploy **READY** documentado (`dpl_HK91SCXq2wRd8iNZWkqmSvnguYYd`); tentativas de deploy via CLI (`deploy --prod`, `--prebuilt`) falharam; alias continua a servir tráfego.
- **URL estável (alias):** `https://febracis-dre-phi.vercel.app` — smoke: HTML 200, `#root` presente; `POST /api/dre-agent` → **401** sem `Authorization` (esperado).
- **Build local:** `npm run lint`, `npm run test`, `npm run build` — verde; `vercel build --prod` (após `vercel pull --yes --environment production`) — verde.
- **Variáveis no projeto Vercel (novo):** tabela de status acima; o portal **só fica plenamente operacional** após `VITE_SUPABASE_ANON_KEY` (e `OPENROUTER_API_KEY` se quiser LLM) + **redeploy** que embuta os `VITE_*` no bundle.

## 1. Vercel — variáveis de ambiente (obrigatório)

No dashboard do projeto ou via CLI: `npx vercel@latest env add` (repetir por variável e por ambiente).

| Variável | Notas |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://vwxgrjjwbvdiaqxqbryk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | chave anónima do projeto Supabase `vwxgrjjwbvdiaqxqbryk` |
| `OPENROUTER_API_KEY` | chave OpenRouter (ou vazio = fallback local no handler) |
| `OPENROUTER_MODEL` | ex.: `openrouter/free` (alinhado ao histórico de produção documentado) |
| `OPENROUTER_APP_URL` | `https://febracis-dre-phi.vercel.app` |
| `AGENT_RATE_LIMIT_ENABLED` | `true` |
| `AGENT_RATE_LIMIT_PER_MINUTE` | `30` |
| `AGENT_RATE_LIMIT_WINDOW_SECONDS` | `60` |
| `ADMIN_PROVISION_ALLOWED_ORIGINS` | `https://febracis-dre-phi.vercel.app,http://localhost:5173` |

Após alterar variáveis: **redeploy** (`npx vercel@latest deploy --prod --yes` na raiz do repositório) ou *Redeploy* no dashboard.

## 1b. Smoke de bundle (produção e CI)

Na raiz `febracis-dre`:

```bash
npm run smoke:prod
# ou, para falhar o job se o alias público não tiver Supabase embutido (cmd.exe):
set SMOKE_STRICT=1 && node scripts/smoke-prod-bundle.mjs
# PowerShell:
# $env:SMOKE_STRICT = "1"; node scripts/smoke-prod-bundle.mjs
```

Variável opcional: `SMOKE_PROD_URL` (default `https://febracis-dre-phi.vercel.app`). Saída inclui `hasUrl`, `hasProjectRefInBundle`, `hasFallbackStrings`, status HTTP por asset e hash curto (`sha256_16`) por chunk.

Gate local do `dist` após build (quando `VITE_*` estão no ambiente do Node ou `FORCE_VERIFY_DIST=1`):

```bash
npm run verify:dist
```

## 2. Supabase — `supabase link` e migrations **015** + **016**

**Requisito:** `supabase login` na máquina **ou** `SUPABASE_ACCESS_TOKEN` no ambiente (token de acesso pessoal na conta Supabase).

```bash
cd febracis-dre
npx supabase link --project-ref vwxgrjjwbvdiaqxqbryk
npx supabase db push --linked
npx supabase migration list --linked
```

Isto aplica, entre outras, `supabase/migrations/015_agent_rate_limits.sql` (rate limit do assistente) e `supabase/migrations/016_harden_audit_log_insert.sql` (hardening de `audit_log`), conforme a fila local do repositório.

**Alternativa (sem CLI):** no Supabase Studio → **SQL** → colar e executar cada ficheiro em `supabase/migrations/` ainda não aplicado (validar idempotência e ordem com a equipa).

## 3. Supabase — secret CORS (Edge Function `admin-provision-user`)

Com CLI ligada ao projeto remoto:

```bash
npx supabase secrets set ADMIN_PROVISION_ALLOWED_ORIGINS="https://febracis-dre-phi.vercel.app,http://localhost:5173" --project-ref vwxgrjjwbvdiaqxqbryk
```

Ou: Dashboard → Edge Functions → secrets do projeto.

## 4. Smoke pós-secrets (checklist mínima)

- Login na URL de produção (com `VITE_*` configurados).
- Assistente responde em modo `llm` (se houver `OPENROUTER_API_KEY`).
- `POST /api/dre-agent` com volume acima do limite devolve **429** + `Retry-After` (após migration 015 e gate ativo).
- Aprovisionamento em Admin não falha por CORS (com secret no passo 3).

## 5. GitHub — ligação ao projeto Vercel (opcional)

O deploy por CLI mostrou: *Failed to connect deivithi/febracis-dre* — o repositório privado pode exigir autorização OAuth da Vercel ao GitHub. Ligar no dashboard Vercel → Project → Git para CI/CD e preview por PR, se desejado.
