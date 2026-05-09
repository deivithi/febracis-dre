# Baseline UI/UX Dashboard (pré-refactor)

Registo operacional antes da auditoria pré-A2 (09/05/2026). Medição manual recomendada pós-implementação.

## RPCs no mount (Network)

| Chamada | Antes | Alvo pós-refactor |
|--------|--------|-------------------|
| `fetchDashboardSnapshot` | 1 por visita ao Dashboard | 1 (mantém) |
| `get_kpi_history` (RPC) | até 4 em paralelo no mount | 0 até KPIs visíveis (IntersectionObserver) |
| `POST /api/dre-insights` | 1 com token | 0 até painel Insights visível |

## Bundle (referência)

Executar após `npm run build`: inspecionar `dist/assets/index-*.js` e chunks do dashboard. Alvo: chunk inicial do dashboard mais leve (CustomizableDashboard lazy, recharts isolado).

## Viewports de screenshot manual

- 1366×768: cabeçalho + KPIs + início do conteúdo do escopo na primeira dobra.
- 360×800: sem scroll horizontal; KPIs com snap horizontal se aplicável.

## Quatro escopos

Smoke manual em conta franchise / regional / holding / controladoria após deploy.
