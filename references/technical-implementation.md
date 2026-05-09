# Referência técnica cruzada — PRD × código (`febracis-dre`)

**Propósito:** mapeamento **implementação física** (rotas, módulos, hooks, migrações) referenciado pelo [`docs/PRD-canonical.md`](../docs/PRD-canonical.md). Este ficheiro **não** substitui [`references/project-context.md`](./project-context.md) para deploy/env/últimos `dpl_*`.

---

## 1. Rotas SPA (`src/App.tsx`)

| Rota público | Componente lazy | Notas |
|--------------|-----------------|-------|
| `/`, `/login` | `LoginPage` | Entrada |

| Rota sob `/app` | Componente | `allowedRoles` (quando aplicável) |
|----------------|------------|-----------------------------------|
| `dashboard` | `DashboardPage` | herdado shell |
| `guide` | `GuidePage` | — |
| `forbidden` | `AccessDeniedPage` | — |
| `submissions` | `SubmissionsPage` | `franchise_user`, `regional_manager`, `finance_controller`, `executive`, `system_admin` |
| `assistant` | `AssistantPage` | igual a `submissions` |
| `workflow` | `WorkflowPage` | `finance_controller`, `executive`, `system_admin` |
| `franchises` | `FranchisesPage` | `regional_manager`, `finance_controller`, `executive`, `system_admin` |
| `audit` | `AuditPage` | `finance_controller`, `executive`, `system_admin` |
| `admin` | `AdminPage` | `system_admin` apenas |

Guarda genérica: `ProtectedRoute`, `AuthProvider`; layout `AppLayout`. **Papéis no React são UX** — RLS + API são verdade segurança (ver [`docs/security-review-2026-03-28.md`](../docs/security-review-2026-03-28.md)).

*(O papel `executive` aparece nas rotas do código-fonte atual; narração de negócio em [`docs/modelo-de-acesso-e-permissoes.md`](../docs/modelo-de-acesso-e-permissoes.md) pode usar vocabulário ligeiramente diferente — alinhar em revisão Produto × Eng.)*

---

## 2. Dashboard executivo (`PRD-canonical` §6 alto nível)

| Aspecto | Onde está |
|---------|-----------|
| Vista por papel (franchise / regional / holding / controladoria) | [`src/features/dashboard/DashboardPage.tsx`](../src/features/dashboard/DashboardPage.tsx) |
| Cockpit Holding, filtros competência/regional/unidade | `HoldingCockpitView.tsx`, mesmo parent |
| Derivação competência BRT com filtro vazio | `holdingFiltersWithBrtDefault` em **`DashboardPage.tsx`** (`useMemo`, sem `useEffect` de escrita em estado derivado para lint) |
| Grid KPI executivo | `ExecutiveKpiGrid` (imports no `DashboardPage`) |
| Frescor / headline escopo | funções/layout partilhadas no mesmo domínio `features/dashboard/` |

---

## 3. Submissões e cockpit unidade (`PRD` §6.2)

| Aspecto | Onde está |
|---------|-----------|
| Página workspace | [`src/features/submissions/SubmissionsPage.tsx`](../src/features/submissions/SubmissionsPage.tsx) |
| Estado workspace (períodos, âncoras `submission`) | [`src/features/submissions/useSubmissionsWorkspace.ts`](../src/features/submissions/useSubmissionsWorkspace.ts) — `resolveDefaultReportingPeriod` para default competência |
| Painel assistente incorporado | `DreAssistantPanel.tsx`, `dreAssistant.ts` |
| KPIs topo / rail / progresso (`draft-validation`) | `SubmissionsPage` + CSS `SubmissionsPage.css` |

---

## 4. Hub Assistente (`PRD` §6.3)

| Aspecto | Onde está |
|---------|-----------|
| Rota `/app/assistant` | `AssistantPage.tsx` |
| Payload `assistantProductTab` modo dúvidas | contrato cliente → **`api/dre-agent.ts`** (servidor interpreta `explain_only`) |

---

## 5. API serverless agente + motor DRE backend

| Artefacto | Caminho |
|-----------|---------|
| Handler POST assistente | [`api/dre-agent.ts`](../api/dre-agent.ts) |
| Validações / governança (Zod, rate limit opcional RPC) | idem + migrations **`015_*`**, **`016_*`** conforme [`project-context`](./project-context.md) |
| Edge admin provision usuários | `supabase/functions/admin-provision-user/` |

---

## 6. Motor SQL e seeds (`PRD` §7)

Definido sob `supabase/migrations/` — cadeia oficial em [`docs/logica-da-dre-e-do-workflow.md`](../docs/logica-da-dre-e-do-workflow.md).

---

## 7. Fuso BRT (`PRD` §12 — comportamento produto aqui ficam só ficheiros)

| Utilidade | Caminho |
|-----------|---------|
| Constante IANA Brasil + partes de calendário | [`src/utils/brazilTimezone.ts`](../src/utils/brazilTimezone.ts) |
| Resolver período relatório default | [`src/utils/reportingPeriodResolve.ts`](../src/utils/reportingPeriodResolve.ts) |
| `formatDate` / `formatDateTime` TZ fixa | [`src/utils/formatters.ts`](../src/utils/formatters.ts) |
| Testes regressão BRT | [`tests/unit/brazil-timezone.test.ts`](../tests/unit/brazil-timezone.test.ts), `reporting-period-resolve.test.ts`, `formatters-brt.test.ts` |

---

## 8. Evals agente (contrato comportamental YAML)

Esqueleto e catálogo de falhas: [`docs/dre-agent-evals.yaml`](../docs/dre-agent-evals.yaml).

Suite Vitest relacionada governance: exemplos sob `tests/unit/` (ex. `dre-agent-governance` citado na security-review).

---

*Última revisão técnica do índice: 09/02/2026 BRT — go-live/demo: [`go-live-trilha-a-checklist.md`](./go-live-trilha-a-checklist.md); UX/ondas PRD: [`ux-excellence-roadmap.md`](./ux-excellence-roadmap.md). Atualizar sempre que criar rota nova ou refactor pesado.*
