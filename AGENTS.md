# AGENTS.md — febracis-dre

Instruções **específicas** desta pasta; combinam com o @AGENTS.md na raiz do workspace.

## Stack

- Vite, React 19, TypeScript, Supabase, TanStack, Zod; testes com Vitest/Playwright conforme `package.json`.

## Deploy e contexto

- **Vercel (build do front):** defina `VITE_APP_MODE` (`production` | `demo` | `development`) em *Settings → Environment Variables*; `demo` exibe a faixa amarela e corresponde a dados de apresentação — produção canónica usa `production`.
- Política de deploy Vercel, Supabase, variáveis sensíveis e **roteiros de demo** estão consolidados em **`references/project-context.md`** — sempre como primeira leitura após mexer neste projeto.
- Raiz no disco pode ser `C:\Users\PC\Documents\VS CODE\febracis-dre` ou `...\OneDrive\...\febracis-dre`; validar com `git remote -v` (deve apontar para `deivithi/febracis-dre`).

## Protocolo de encerramento (agentes IA — obrigatório)

Ao **terminar** implementação ou ajustes que devam refletir no produto/repo remoto, **executar sempre a lista abaixo sem pedir confirmação** ao utilizador (salvo quando ele tiver declarado só leitura ou bloqueado publish).

1. Atualizar **`references/project-context.md`** e, quando couber, `references/demo-ceo-roteiro.md` ou `docs/*`.
2. No monorepo Cursor: **`.cursor/skills/stack-febracis-dre/SKILL.md`** e **`.cursor/rules/stack-febracis-dre.mdc`**.
3. Skill global **`C:\Users\PC\.codex\skills\febracis-dre-especialista\SKILL.md`** — manter mesmo protocolo/checkpoint de deploy.
4. **Git:** `npm run build` + `npm run test` (se tocaram assistente, `api/*`, auth ou regras críticas) → commit → **`git push origin main`**.
5. **Vercel:** `npx vercel --prod --yes` (team **`deivithis-projects`**); regressar ao `project-context.md` para nota do último `dpl_*` Ready.

Lista completa e excepções na secção **“Protocolo de encerramento obrigatório”** do `references/project-context.md`.

## Comandos úteis

- `npm run dev`, `npm run build`, `npm run lint`, `npm run test`, `npm run test:coverage`, `npm run test:e2e` (defina `E2E=0` para ignorar E2E), `npm run smoke:prod`, `npm run smoke:staging` (imprime ponteiro para [`tests/README-staging-smoke.md`](./tests/README-staging-smoke.md)), scripts `validate:*` quando aplicável.
- **Cabeçalhos / CSP SPA + aceite curl/Lighthouse:** `npm run verify:security-headers` (com `VERIFY_SECURITY_HEADERS_URL` ou prévia na porta `4173`); checklist em [`docs/security-headers-acceptance.md`](docs/security-headers-acceptance.md).
- **Testes RLS (Supabase real):** com `SUPABASE_SERVICE_ROLE_KEY` + URL e anon (`SUPABASE_*` ou `VITE_SUPABASE_*`), rode `npm run test:rls`. Sem secrets o Vitest marca o ficheiro como skipped e `npm run test` continua verde. Detalhes: [`tests/README-rls.md`](./tests/README-rls.md).
- **Prévia de submissões:** com inputs gravados sincronizados com o último fetch, a UI usa `vw_submission_dre_statement` (motor `fn_calculate_submission_dre`) como fonte da prévia; não é necessária variável de ambiente extra — requer sessão Supabase válida como o resto do portal.

### Migrações e rollbacks (`*.down.sql`)

- **Validação de pares:** `npm run validate:migrations` — exige um `supabase/rollbacks/<mesmo stem>.down.sql` para cada `supabase/migrations/*.sql` (corrido no CI).
- **`down` não é aplicado pelo Supabase CLI** nos deploys remotos habituais; os ficheiros em `supabase/rollbacks/` servem recuperação/local/DR aplicados manualmente (`psql`) por ordem numérica **inversa**.
- **Teste ciclo down+replay (só máquina com Docker stack + psql):** `SUPABASE_DB_ROLLBACK_TEST=1 npm run test:rollback:local` (ou `test:db-rollback`). Opcional `TARGET=015`. Sem a variável, o script **termina logo** (exit 0) para não partir clones sem infraestrutura.

## Mapa de atividades (U01–U30 e Guia G01–G15)

- **U01–U30:** tabela **evidence-based** (etiquetas `Uxx` no código ou SQL) em [`references/project-context.md`](./references/project-context.md#mapa-de-atividades-u01u30).
- **Guia G01–G15** (`/app/guide`): mapa e âncoras em [`references/project-context.md`](./references/project-context.md) — secção **Mapa de atividades — Guia**. Ao fechar batch UX da Guia, actualizar **só** lá (com comentários `Gxx` no código como prova).

## Referências

- **Incidentes / rollback:** [`RUNBOOK.md`](./RUNBOOK.md) — ciclo Sev, Vercel Instant Rollback, Supabase/`supabase/rollbacks`, smoke pós-recuperação.
- **Smoke manual produção (piloto 1 franquia, Maria, `draft` → `submitted`):** [`tests/README-prod-pilot-smoke.md`](./tests/README-prod-pilot-smoke.md).
- **Migração Postgres produção (Supabase `vwxgrjjwbvdiaqxqbryk`):** [`references/ops-supabase-prod-migration-runbook.md`](./references/ops-supabase-prod-migration-runbook.md) — backup obrigatório, `db push --linked`, verificação e aceite.
- **PRD canónico único de produto+arquitetura (consolidado):** [`docs/PRD-canonical.md`](./docs/PRD-canonical.md) — ler antes de grandes épicos; operação/deploy continua dominada por `references/project-context.md`.
- **Postgres / RLS (contrato base com o remoto):** [`references/technical-implementation.md`](./references/technical-implementation.md).
- Regras com glob no monorepo: `.cursor/rules/stack-febracis-dre.mdc`
