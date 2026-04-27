# Operações pendentes — pós-migração Vercel (2026-04-27)

Este ficheiro consolida o que **não pôde ser concluído de forma autónima** (tokens em falta no ambiente do agente) e deve ser executado **uma vez** com credenciais válidas.

## Estado já verificado

- **Vercel:** projeto `febracis-dre` no team `richardrios10000-5421s-projects`, deploy de produção **READY** (`dpl_HK91SCXq2wRd8iNZWkqmSvnguYYd`).
- **URL estável (alias):** `https://febracis-dre-phi.vercel.app`
- **Build local:** `npm run lint`, `npm run test`, `npm run build` — verde nesta rodada.
- **Variáveis no projeto Vercel (novo):** **nenhuma** listada após o primeiro deploy; o portal **só fica operacional** após preencher a tabela abaixo (Production e Preview, conforme necessário).

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

## 2. Supabase — `supabase link` e migration 015 (rate limit)

**Requisito:** `supabase login` na máquina **ou** `SUPABASE_ACCESS_TOKEN` no ambiente (token de acesso pessoal na conta Supabase).

```bash
cd febracis-dre
npx supabase link --project-ref vwxgrjjwbvdiaqxqbryk
npx supabase db push --linked
npx supabase migration list --linked
```

Isto aplica `supabase/migrations/015_agent_rate_limits.sql` (RLS, `fn_agent_rate_check`, etc.).

**Alternativa (sem CLI):** no Supabase Studio → **SQL** → colar o conteúdo de `supabase/migrations/015_agent_rate_limits.sql` e executar (só se a equipa validar idempotência e ausência de divergência com a fila de migrations).

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
