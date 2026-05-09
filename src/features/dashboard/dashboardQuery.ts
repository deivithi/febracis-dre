import type { AccessProfile, DashboardScope } from '../auth/auth.types';
import type { FranchiseDashboardRow } from '../shared/portal.types';

/**
 * Estados de submissão que entram em **KPIs financeiros executivos** (MC1, MC2,
 * EBITDA1/2, receita agregada nas vistas regionais/rede e cockpit holding).
 *
 * Alinha ao `CHECK` de `submissions.status` (`001_foundation.sql`) excluindo
 * `draft` e `reopened` (rascunho reaberto / fora do pipeline oficial).
 * `superseded` permanece na lista para simetria tipada; `vw_current_submissions`
 * já exclui superseded, portanto não aparece nas linhas das vistas.
 *
 * Banco: migração `018`; somatórios usam `submission_status in (...)`.
 * App: filtros client-side antes de rollup local (`filterFranchiseRowsForExecutiveRollup`).
 */
export const EXECUTIVE_KPI_SUBMISSION_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'pending_adjustment',
  'closed',
  'superseded',
] as const;

export type ExecutiveKpiSubmissionStatus = (typeof EXECUTIVE_KPI_SUBMISSION_STATUSES)[number];

const OFFICIAL_SET: ReadonlySet<string> = new Set(EXECUTIVE_KPI_SUBMISSION_STATUSES);

export function isIncludedInExecutiveFinancialRollup(submissionStatus: string): boolean {
  return OFFICIAL_SET.has(submissionStatus);
}

/** Lista para `.in('submission_status', …)` no cliente Supabase, quando aplicável. */
export function executiveKpiSubmissionStatusesForSupabase(): ExecutiveKpiSubmissionStatus[] {
  return [...EXECUTIVE_KPI_SUBMISSION_STATUSES];
}

export function filterFranchiseRowsForExecutiveRollup<T extends { submission_status: string }>(
  rows: T[],
): T[] {
  return rows.filter((row) => isIncludedInExecutiveFinancialRollup(row.submission_status));
}

/**
 * KPIs da franquia: usa a competência mais recente com estado oficial; comparação
 * com o período anterior também só considera linhas oficiais (ordem igual a `snapshot.franchiseRows`).
 */
export function pickOfficialFranchiseRowsForExecutiveKpis(
  rows: FranchiseDashboardRow[],
): { current: FranchiseDashboardRow | null; previous: FranchiseDashboardRow | null } {
  const official = filterFranchiseRowsForExecutiveRollup(rows);
  return {
    current: official[0] ?? null,
    previous: official[1] ?? null,
  };
}

export type DashboardScopedColumn = 'franchise_id' | 'regional_id';

/**
 * Forma RLS-safe das leituras `portal.api` / PostgREST: escopo resolve a coluna
 * do `. in (...)` (ou ausência = rede visível ao JWT).
 */
export type DashboardQueryPlan = {
  dashboardScope: DashboardScope;
  scopedColumn: DashboardScopedColumn | null;
  scopedIds: string[];
};

export function buildDashboardQueryPlan(
  access: Pick<AccessProfile, 'dashboardScope' | 'franchiseIds' | 'regionalIds'>,
): DashboardQueryPlan {
  if (access.franchiseIds.length > 0) {
    return {
      dashboardScope: access.dashboardScope,
      scopedColumn: 'franchise_id',
      scopedIds: access.franchiseIds,
    };
  }

  if (access.regionalIds.length > 0) {
    return {
      dashboardScope: access.dashboardScope,
      scopedColumn: 'regional_id',
      scopedIds: access.regionalIds,
    };
  }

  return {
    dashboardScope: access.dashboardScope,
    scopedColumn: null,
    scopedIds: [],
  };
}
