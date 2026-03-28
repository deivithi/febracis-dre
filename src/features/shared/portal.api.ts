import { supabase } from '../../lib/supabase';
import type { AccessProfile, RegionalRecord, RoleRecord } from '../auth/auth.types';
import type {
  AdminSnapshot,
  AuditLogRow,
  CurrentSubmissionRow,
  DashboardSnapshot,
  DreStatementRow,
  FranchiseDashboardRow,
  FranchiseListRow,
  NetworkDashboardRow,
  PendingReviewRow,
  RegionalDashboardRow,
  ReportingPeriodRow,
} from './portal.types';

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

function asQueryResult<T>(query: unknown) {
  return query as QueryResult<T>;
}

function emptyRows<T>() {
  return Promise.resolve({ data: [] as T[], error: null }) as QueryResult<T>;
}

async function readRows<T>(query: QueryResult<T>, label: string): Promise<T[]> {
  const { data, error } = await query;

  if (error) {
    throw new Error(`Não foi possível carregar ${label}. ${error.message}`);
  }

  return data ?? [];
}

function applyScopedFilters<TQuery extends { in: (column: string, values: string[]) => TQuery }>(
  query: TQuery,
  access: AccessProfile,
  franchiseColumn = 'franchise_id',
  regionalColumn = 'regional_id',
): TQuery {
  if (access.franchiseIds.length) {
    return query.in(franchiseColumn, access.franchiseIds);
  }

  if (access.regionalIds.length) {
    return query.in(regionalColumn, access.regionalIds);
  }

  return query;
}

export async function fetchDashboardSnapshot(access: AccessProfile): Promise<DashboardSnapshot> {
  let franchiseQuery = supabase
    .from('vw_franchise_dashboard')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  franchiseQuery = applyScopedFilters(franchiseQuery, access).limit(24);

  const regionalQuery =
    access.dashboardScope === 'regional' ||
    access.dashboardScope === 'holding' ||
    access.dashboardScope === 'controladoria'
      ? applyScopedFilters(
          supabase
            .from('vw_regional_dashboard')
            .select('*')
            .order('period_year', { ascending: false })
            .order('period_month', { ascending: false }),
          access,
          'regional_id',
          'regional_id',
        ).limit(24)
      : emptyRows<RegionalDashboardRow>();

  const networkQuery =
    access.dashboardScope === 'holding' || access.dashboardScope === 'controladoria'
      ? supabase
          .from('vw_network_dashboard')
          .select('*')
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
          .limit(12)
      : emptyRows<NetworkDashboardRow>();

  let submissionsQuery = supabase
    .from('vw_current_submissions')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  submissionsQuery = applyScopedFilters(submissionsQuery, access).limit(36);

  const pendingReviewsQuery = access.canManageReview
    ? supabase
        .from('vw_pending_reviews')
        .select('*')
        .order('submitted_at', { ascending: true })
        .limit(20)
    : emptyRows<PendingReviewRow>();

  const [franchiseRows, regionalRows, networkRows, currentSubmissions, pendingReviews] = await Promise.all([
    readRows<FranchiseDashboardRow>(asQueryResult(franchiseQuery), 'os dados de franquia do dashboard'),
    readRows<RegionalDashboardRow>(asQueryResult(regionalQuery), 'os dados regionais do dashboard'),
    readRows<NetworkDashboardRow>(asQueryResult(networkQuery), 'o consolidado da holding'),
    readRows<CurrentSubmissionRow>(asQueryResult(submissionsQuery), 'as submissões correntes'),
    readRows<PendingReviewRow>(asQueryResult(pendingReviewsQuery), 'a fila de revisão'),
  ]);

  const latestFranchise = franchiseRows[0] ?? null;
  const currentDre = latestFranchise
    ? await readRows<DreStatementRow>(
        asQueryResult(
          supabase
            .from('vw_submission_dre_statement')
            .select('*')
            .eq('submission_id', latestFranchise.submission_id)
            .order('section_order', { ascending: true })
            .order('line_order', { ascending: true }),
        ),
        'a DRE detalhada da última submissão',
      )
    : [];

  return {
    franchiseRows,
    regionalRows,
    networkRows,
    currentSubmissions,
    pendingReviews,
    currentDre,
    latestFranchise,
    previousFranchise: franchiseRows[1] ?? null,
    latestRegional: regionalRows[0] ?? null,
    previousRegional: regionalRows[1] ?? null,
    latestNetwork: networkRows[0] ?? null,
    previousNetwork: networkRows[1] ?? null,
  };
}

export async function fetchCurrentSubmissions(access: AccessProfile): Promise<CurrentSubmissionRow[]> {
  let query = supabase
    .from('vw_current_submissions')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  query = applyScopedFilters(query, access).limit(60);

  return readRows<CurrentSubmissionRow>(asQueryResult(query), 'as submissões correntes');
}

export async function fetchPendingReviews(): Promise<PendingReviewRow[]> {
  return readRows<PendingReviewRow>(
    asQueryResult(
      supabase
        .from('vw_pending_reviews')
        .select('*')
        .order('submitted_at', { ascending: true })
        .limit(50),
    ),
    'a fila de revisão',
  );
}

export async function fetchAccessibleFranchises(access: AccessProfile): Promise<FranchiseListRow[]> {
  let query = supabase
    .from('franchises')
    .select('id, code, trade_name, regional_id, status, city, state')
    .order('trade_name', { ascending: true });

  if (access.franchiseIds.length) {
    query = query.in('id', access.franchiseIds);
  } else if (access.regionalIds.length) {
    query = query.in('regional_id', access.regionalIds);
  }

  return readRows<FranchiseListRow>(asQueryResult(query), 'as franquias disponíveis');
}

export async function fetchAuditEntries(limit = 50): Promise<AuditLogRow[]> {
  return readRows<AuditLogRow>(
    asQueryResult(
      supabase
        .from('audit_log')
        .select('id, table_name, record_id, action, performed_at, origin')
        .order('performed_at', { ascending: false })
        .limit(limit),
    ),
    'o log de auditoria',
  );
}

export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  const [franchises, regionals, roles, profiles, periods] = await Promise.all([
    readRows<FranchiseListRow>(
      asQueryResult(
        supabase
          .from('franchises')
          .select('id, code, trade_name, regional_id, status, city, state')
          .order('trade_name', { ascending: true }),
      ),
      'as franquias',
    ),
    readRows<RegionalRecord>(
      asQueryResult(
        supabase
          .from('regionals')
          .select('id, code, name')
          .order('name', { ascending: true }),
      ),
      'as regionais',
    ),
    readRows<RoleRecord>(
      asQueryResult(
        supabase
          .from('roles')
          .select('id, code, name, description')
          .order('name', { ascending: true }),
      ),
      'os papéis cadastrados',
    ),
    readRows<{ id: string }>(
      asQueryResult(supabase.from('profiles').select('id')),
      'os usuários cadastrados',
    ),
    readRows<ReportingPeriodRow>(
      asQueryResult(
        supabase
          .from('reporting_periods')
          .select('id, label, status, year, month, submission_deadline_at, adjustment_deadline_at')
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
      ),
      'as competências',
    ),
  ]);

  return {
    franchises,
    regionals,
    roles,
    userCount: profiles.length,
    openPeriods: periods.filter((period) => period.status !== 'closed'),
  };
}
