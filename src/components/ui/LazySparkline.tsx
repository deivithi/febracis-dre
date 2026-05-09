/**
 * Sparklines do dashboard usam o gráfico lazy em `KpiCard`.
 * O carregamento dos dados (`get_kpi_history`) fica condicionado à visibilidade do cartão —
 * ver `ExecutiveKpiGrid` + `kpiSparkline.ts` no painel executivo.
 */
export const LAZY_SPARKLINE_NOTE =
  'RPC get_kpi_history só corre quando o KPI visível (IntersectionObserver).';
