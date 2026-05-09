# Research — febracis-dre estado atual (08/05/2026 BRT)

**Repositório:** `febracis-dre` (clone analisado: `…/VS CODE/febracis-dre`)  
**PRD origem:** [`docs/PRD-canonical.md`](../../docs/PRD-canonical.md) **v2.2** — **não** existe `docs/PRD-febracis-dre.md` com esse nome; inputs do PROMPT MESTRE mapeiam para o ficheiro canónico.  
**SSOT operação:** [`references/project-context.md`](../../references/project-context.md)

---

## 0. Git e baseline repositório

| Comando / estado | Resultado |
|------------------|-----------|
| `git rev-parse --short HEAD` | `c4c598d` |
| `main...origin/main` | alinhado (sem commits à frente/atraso reportado) |
| `git status` (untracked) | `references/technical-implementation.md`, `scripts/generate-sidebar-logo.py` |
| `npm audit --omit=dev` (08/05/2026) | **2 moderate** (`langsmith`, `uuid` via langgraph) — **0 high/critical** nesta corrida |

---

## 1. Cobertura PRD ↔ Código (matriz)

Legenda: **%** = julgamento de cobertura funcional/UX relativa ao texto do PRD na secção indicada (não é cobertura de testes). **Risco** = impacto se for a produção sem fechar gap.

| Secção PRD | Tema | Status | Evidência (arquivo:âncora) | Risco produção |
|------------|------|--------|----------------------------|----------------|
| §6 / cockpit | Dashboard executivo multi-âmbito, holding filters, BRT default | 🟢 ~75% | `DashboardPage.tsx` — `holdingFiltersWithBrtDefault` `useMemo` ~`855`–`865`, `deriveHoldingView` ~`871`; `formatBrazilYearMonthLabel` import ~`41` | médio ([Inferência]: polish narrativo §-1 pode exigir mais) |
| §6 | Rotas SPA + RBAC UX | 🟢 ~85% | `App.tsx` `ProtectedRoute` + `allowedRoles` ~`91`–`143` (`submissions`, `assistant`, `workflow`, `franchises`, `audit`, `admin`) | baixo (RLS continua fonte de verdade) |
| §6.2 | Submissões workspace + assistente embutido | 🟡 ~60% | [`references/audit-app-logic-2026-05-08.md`](../../references/audit-app-logic-2026-05-08.md) §3; `SubmissionsPage.tsx`, `useSubmissionsWorkspace.ts`, `DreAssistantPanel.tsx` (índice em `technical-implementation.md`) | médio |
| §6.3 | Hub `/app/assistant` + `explain_only` em Dúvidas | 🟢 ~70% | `agentPermissions.ts` `shouldAssistantExplainOnly` ~`34`–`38`; `api/dre-agent.ts` `assistantProductTab` schema ~`82`–`90` | médio |
| §7 | Motor SQL canónico MC1/MC2/EBITDA | 🟢 ~80% | `supabase/migrations/004_calculation_engine.sql`; narrativa [`docs/logica-da-dre-e-do-workflow.md`](../../docs/logica-da-dre-e-do-workflow.md); gap granularidade [`references/dre-modelo-gerencial-gap-matrix.md`](../../references/dre-modelo-gerencial-gap-matrix.md) | médio (paridade planilha) |
| §8 | Arquitetura Vite/React/Supabase/Vercel | 🟢 alinhado | `package.json` scripts `dev`/`build`/`test`; `api/dre-agent.ts` serverless | baixo |
| §9 / §9-bis | Agente + behavioral contract | 🟡 ~55% | `api/dre-agent.ts` Zod + LangGraph + `validateAssistantFieldUpdates`; YAML 50 cenários [`docs/dre-agent-evals.yaml`](../../docs/dre-agent-evals.yaml); PRD §14/§9-bis **runner CI ↔ YAML ainda 🔴** | **alto** (governança percebida) |
| §11 | Segurança | 🟡 | [`docs/security-review-2026-03-28.md`](../../docs/security-review-2026-03-28.md); achados Major agente em [`references/audit-dre-agent-2026-05-08.md`](../../references/audit-dre-agent-2026-05-08.md) | médio–alto |
| §12 | Fuso BRT | 🟢 ~85% | `brazilTimezone.ts` `BRAZIL_IANA_TIMEZONE` ~`1`–`2`, `getBrazilCalendarDateParts` ~`21`–`30`; testes `tests/unit/brazil-timezone.test.ts`, `reporting-period-resolve.test.ts`, `formatters-brt.test.ts` | baixo |

**[Inferência]** Percentagens agregadas: UI/UX “visões” executive/holding/franquia descritas em profundidade no PRD ainda parecem **no início** face ao narrativo de lançamento — a matriz marca 🟡 onde falta polish fechado com produto.

---

## 2. Migrations × RLS × Models (auditoria)

1. **Duplicado de prefixo `015_`:** coexistem `supabase/migrations/015_harden_audit_log_insert.sql` e `supabase/migrations/015_agent_rate_limits.sql`. Ordem lexical e histórico `supabase migration list` em cada ambiente **devem** ser confrontados com [`references/project-context.md`](../../references/project-context.md) — risco de drift se um clone aplicou numa ordem e outro noutra.

2. **Cadeia documentada:** `001_foundation.sql` … `016_harden_audit_log_insert.sql` — **17** ficheiros `.sql` na pasta `supabase/migrations/` nesta revisão (`001` … `016` com duplo `015_*`). Confirmar `supabase migration list` em cada ambiente antes de operação em prod.

3. **RLS:** políticas base em [`supabase/migrations/002_rls_policies.sql`](../../supabase/migrations/002_rls_policies.sql) — helpers `is_admin()`, `has_network_scope()`, `can_access_franchise()`, `can_manage_review()` ~`11`–`82`; `enable row level security` massivo ~`88`–`115`. Migrações posteriores (`009_viewer_role`, `010_access_and_submission_workflows`, `011_submission_lock_and_dre_validation`, `013_access_directory_effective_scope`, harden audit) **empilham** comportamento; matriz completa exige leitura ficheiro a ficheiro na Fase SPEC.

4. **Models TypeScript vs DDL:** **não** há `src/types/database.generated.ts` no layout analisado; tipos partilhados em `src/features/shared/portal.types` (ex.: consumo em testes [`tests/unit/dre-agent-governance.test.ts`](../../tests/unit/dre-agent-governance.test.ts) ~`13`). **Gap:** ausência de geração automática Supabase → risco de coluna/migration não reflectida em TS até runtime.

---

## 3. Top 10 dívidas técnicas bloqueantes (impacto deploy / demo dono)

Ordenação por urgência para janela “produção na próxima semana”:

1. **Runner evals YAML × CI 🔴** — PRD §9-bis / §14: 50 cenários em [`docs/dre-agent-evals.yaml`](../../docs/dre-agent-evals.yaml); harness automatizado não equivalente aos cenários LLM end-to-end.
2. **Segurança assistente “Major”** — [`references/audit-dre-agent-2026-05-08.md`](../../references/audit-dre-agent-2026-05-08.md): chaves/defaults/OpenRouter fallback, rate-limit fail-open; roadmap R1–R6 no doc.
3. **Duas migrações `015_*`** — ver §2 item 1; bloqueante se novo ambiente aplicar migrações fora de ordem.
4. **`validate:settings` / `validate:phase1:local` sem ENV** — mesma auditoria §7 tabela; “agente fresco” não reproduz validação institucional sem `.env`/secrets.
5. **Playwright E2E auth skipped** — [`references/audit-app-logic-2026-05-08.md`](../../references/audit-app-logic-2026-05-08.md): 8 skipped sem `E2E_DRE_EMAIL` / `E2E_DRE_PASSWORD`.
6. **Paridade planilha × portal** — [`references/dre-modelo-gerencial-gap-matrix.md`](../../references/dre-modelo-gerencial-gap-matrix.md): eventos desagregados, agregações `people_total` / `cto_total`, etc.
7. **`technical-implementation.md` fora do Git** — drift documentação; quem faz clone não recebe índice de rotas atualizado até commit.
8. **Template PROMPT Fase 4 (Tailwind/shadcn)** vs **`package.json` real** — dependências são React 19 + Vite + TanStack + Zod + Recharts etc.; **sem** Tailwind/shadcn declarados. SPEC/rules não devem assumir stack inexistente.
9. **`npm audit` moderate (langsmith/uuid)** — não bloqueiam por severidade alta nesta corrida, mas §11 “zerado” depende política equipa aceitar moderate ou aplicar `npm audit fix` com regressão testada.
10. **Baseline §0.5 / telemetria PRD** — §0.5 marca baselines institucionais **[Não verificado]** até processo dados; métricas D+30 dependem instrumentação não auditada neste ficheiro.

---

## 4. Estado do agente IA vs §9-bis YAML

| BC | Regra (YAML) | Implementação observada |
|----|----------------|-------------------------|
| BC-01 | NUNCA gravar `fieldUpdates` em linha não editável | `validateAssistantFieldUpdates` partilhado cliente/servidor; testes [`dre-agent-governance.test.ts`](../../tests/unit/dre-agent-governance.test.ts) ~`69`; `api/dre-agent.ts` sanitização pós-LLM (fluxo ~`386` zona inferida por grep prévio — confirmar ao implementar SPEC) |
| BC-02 | NUNCA vazar dados fora do JWT | Cliente Supabase com JWT em `createSupabaseUserClient` ~`194`–`200`; revisão adversarial pendente suite YAML |
| BC-03 | NUNCA substituir motor Postgres | Prompts/indirection em `api/dre-agent.ts` — requer três na SPEC com citações de `fieldUpdates`/cálculo |
| BC-04 | NUNCA workflow só via LLM | [Inferência] transições devem estar em mutations/workflow UI — evidência em [`WorkflowPage.tsx`](../../src/features/workflow/WorkflowPage.tsx) (Fase seguinte linha:a linha) |
| BC-05..BC-07 | Bloqueios submissão / cross-franchise / jailbreak | Parcialmente coberto por permissões `canAssistantMutateSubmission`; **sem** corrida automatizada dos 50 YAML |

**Taxa YAML:** meta PRD `required_v1_pass_rate: 0.95` / `blocking_release_from_phase: 1` em [`docs/dre-agent-evals.yaml`](../../docs/dre-agent-evals.yaml) ~`16`–`18` — **[Não verificado]** PASS em CI para este snapshot.

---

## 5. Gaps de documentação encontrados

| Input PROMPT MESTRE | Situação |
|---------------------|----------|
| `docs/PRD-febracis-dre.md` | **Ausente.** Usar **`docs/PRD-canonical.md` v2.2** como substituto canónico. |
| Restantes docs em `docs/*.md` (visão, lógica, acesso, glossário, cockpit, plano, security, benchmark) | **Presentes** (lista em raiz [`docs/`](../../docs/) — conferir nomes exactos antes de automatizar links). |
| `references/project-context.md` | **Presente.** |
| `references/dre-modelo-gerencial-gap-matrix.md` | **Presente.** |
| `references/audit-app-logic-2026-05-08.md`, `references/audit-dre-agent-2026-05-08.md` | **Presentes.** |
| `references/technical-implementation.md` | **Presente no disco**, **untracked Git** → tratar como gap de reposição até `git add`. |

---

## 6. Próximos passos & readiness (produção + apresentação ao dono)

**Pressuposto PO:** ferramenta em **produção na próxima semana** com **demo ao decisor** (“dono”). **Frozen scope** recomendado: **segunda-feira BRT** da semana alvo (só P0/segurança/dados após freeze). **Demo ao dono** recomendada: **quarta-feira BRT** mesma semana (ajustar calendário institucional).

### 6.1 Checklist binário — “pronto para demo dono” (mínimo)

- [ ] URL produção atual (`project-context` / último `dpl_*`) abre login e **sem** regressão CSP/CORS já conhecidas.
- [ ] **2 contas demo** preparadas (ex.: franchise + holding ou controlador) com dados **limpos** (submissão rascunho + 1 período BRT coerente).
- [ ] Percurso **A** — Login → Dashboard → filtro holding/competência com default BRT (`DashboardPage.tsx` ~`855`–`872`).
- [ ] Percurso **B** — Submissões → grelha + KPI topo + gravar sem erro de RLS (`viewer` não entra neste percurso — alinhado audits).
- [ ] Percurso **C** — Assistente em **Dúvidas** (`assistantProductTab`) só `explain_only` — sem escritas quando não deve.
- [ ] **Não prometer na sala:** notificações inexistentes já marcadas como dev em audits; evaluator YAML completo; paridade linha-a-linha eventos da planilha.

### 6.2 Dependências operacionais

- Secrets Vercel (`OPENAI_*`, `OPENROUTER_*`, `SUPABASE_*`, etc.) conforme [`references/project-context.md`](../../references/project-context.md).
- Edge `ADMIN_PROVISION_ALLOWED_ORIGINS` (Supabase Dashboard) onde aplicável ao browser + CORS (`AGENTS.md` / policy Febracis no mono-repo).
- Comitar **`references/technical-implementation.md`** para qualquer onboarding externo.

### 6.3 Ponte para tarefas SPEC (Fase 2 — placeholders Txx)

| Prioridade | Tema | Origem dívidas | Nota para §7.2 SPEC |
|------------|------|----------------|---------------------|
| P0 | Resolver ambiguidade `015_*` + checklist `supabase db` | §2 | **T_migration_order** |
| P0 | R1 segurança agente (sem segredo no bundle / fail-open revisado) | §3 item 2 | **T_agent_secrets_rate_limit** |
| P1 | Credenciais E2E + 1 fluxo Playwright verde obrigatório pré-demo | §3 item 5 | **T_e2e_smoke_auth** |
| P1 | Decisão “moderate audit fix” OU aceite formal | §3 item 9 | **T_npm_audit_policy** |
| P2 | Esqueleto runner 5–10 cenários críticos YAML (subset) antes de CI completo | §3 item 1 | **T_eval_harness_stub** |

---

## 7. Comandos de verificação sugeridos (pós-merge deste artefacto)

| Comando | Objectivo |
|---------|-----------|
| `npm run lint` | ESLint |
| `npm run build` | TSC + Vite |
| `npm run test` | Vitest |
| `npx playwright test` | Smoke + opcionalmente auth se env |
| `npm run validate:settings` | Config acesso — requer env |
| `npm run smoke:prod` | Script existente conforme README/project-context |

---

*Documento gerado no âmbito Fase 1 (Discovery). **Gate:** OK humano obrigatório antes de SPEC.md (`specs/001-febracis-dre-mvp/SPEC.md`) e phases seguintes.*
