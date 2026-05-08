# Dashboard `/app/dashboard` — matriz escopo × blocos × CTAs × estados

Fonte canónica: `src/features/dashboard/DashboardPage.tsx`, `fetchDashboardSnapshot` em `src/features/shared/portal.api.ts`.

| Escopo | Blocos UI (ordem) | CTAs (hero) | Estados vazios / erro |
|--------|-------------------|-------------|------------------------|
| **franquia** | `DashboardHero`; `KpiCards` (`buildFranchiseKpis`); `FranchiseDashboardView` — DRE oficial + status + últimas DREs | Primário: admin → `/app/admin`; senão → `/app/submissions` (ícone operacional). Secundário: `canManageReview` → `/app/workflow`; senão → **refetch** dashboard (`queryClient.invalidateQueries ['dashboard']`) | Sem `latestFranchise`: empty-state “Sem DRE neste período”. Hero: métricas “em andamento”; “aguardando revisão” só com copy explícito quando não gerem falsa impressão (`canManageReview`). |
| **regional** | Hero; `buildRegionalKpis`; comparativo tabela + resumo + top 5 | Mesmo par hero | Sem `latestRegional`: empty-state “Ainda não há números da regional”. Linhas período filtradas por `regional_id`. |
| **holding** | Hero; **`KpiCards` únicos = totais do recorte filtrado** (competência + regional + unidade; sem segunda faixa de KPIs); `HoldingCockpitView` — filtros + radar + lateral | Mesmo par hero | Sem `latestNetwork`: card empty “Consolidado da rede ainda indisponível”; KPIs vazios. Recorte sem linhas: empty na tabela + mensagens laterais coerentes. |
| **controladoria** | Hero; `buildNetworkKpis`; `PendingReviewsCard` + críticas + resumo fila + últimas DREs | Mesmo par hero | `pendingReviews` vazio → mensagem de sucesso inline. Lista críticas pode ser top 5 vazias se sem linhas. |

## React Query

- `queryKey`: `['dashboard', scope, franchiseIdsCsv, regionalIdsCsv]` — invalidação desde `WorkflowPage` mantém o mesmo formato.

## Dados (`fetchDashboardSnapshot`)

- Views: `vw_franchise_dashboard`, `vw_regional_dashboard`, `vw_network_dashboard`, `vw_current_submissions`, `vw_pending_reviews` (revisões condicionadas a permissão).

Atualizado com o redesign executivo P0/P1 — **08/05/2026 BRT**.
