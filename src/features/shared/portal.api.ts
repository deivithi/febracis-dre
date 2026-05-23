import { supabase } from '../../lib/supabase';
import type { AccessProfile, RegionalRecord, RoleRecord } from '../auth/auth.types';
import type {
  AgentMessageRow,
  AgentSessionRow,
  AdminActionResult,
  AdminSnapshot,
  AdminUserAccessPayload,
  AdminUserProvisionPayload,
  AdminUserProvisionResult,
  AuditLogRow,
  CurrentSubmissionRow,
  DreInputCatalogLine,
  DreStatementRow,
  EventOptionRow,
  FranchiseDashboardRow,
  FranchiseListRow,
  FranchiseMetricTrendMetric,
  FranchiseMetricTrendRow,
  KpiHistoryPoint,
  KpiSparklineMetric,
  NetworkDashboardRow,
  PendingReviewRow,
  RegionalDashboardRow,
  ReportingPeriodRow,
  SubmissionEditorRecord,
  SubmissionHistoryRow,
  SubmissionIssueRow,
  SubmissionKpiRow,
  SubmissionVersionSummaryRow,
  SubmissionWorkspaceSnapshot,
  UserAccessDirectoryRow,
  ValidationResultRow,
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Segurança PostgREST/Supabase: chunk em linhas até teto máximo por snapshot.
 * Cache do cockpit: staleTime/gcTime da leitura executiva ficam na useQuery em DashboardPage.tsx (não aqui).
 */
const DASHBOARD_PAGE_SIZE = 1000;
const DASHBOARD_FRANCHISE_ROWS_CAP = 50_000;
const DASHBOARD_REGIONAL_ROWS_CAP = 50_000;

/**
 * `fetchDashboardSnapshot` e leituras associadas usam sempre o cliente Supabase
 * da aplicação (anon + JWT do utilizador). Não há service role no browser.
 *
 * Escopo explícito: `applyScopedFilters` (franquia > regional > rede). O RLS
 * das tabelas base e `security_invoker` nas vistas restringem o que o JWT vê.
 *
 * Rollups executivos em `vw_regional_dashboard` / `vw_network_dashboard`:
 * MC1/MC2/EBITDA e receita agregada somente com `submission_status` na allowlist
 * oficial (`EXECUTIVE_KPI_SUBMISSION_STATUSES` em `dashboardQuery.ts`; migração
 * `018_executive_kpi_official_statuses_only.sql`). Rascunhos (`draft`) e
 * `reopened` não entram. O cockpit holding alinha KPIs via
 * `filterFranchiseRowsForExecutiveRollup`.
 */

async function readVwFranchiseDashboard(access: AccessProfile): Promise<FranchiseDashboardRow[]> {
  const multiEntityDashboard =
    access.dashboardScope === 'holding' ||
    access.dashboardScope === 'controladoria' ||
    access.dashboardScope === 'regional';

  const scopedBase = () => {
    const q = supabase
      .from('vw_franchise_dashboard')
      .select('*')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .order('franchise_code', { ascending: true });

    return applyScopedFilters(q, access);
  };

  if (!multiEntityDashboard) {
    return readRows<FranchiseDashboardRow>(
      asQueryResult(scopedBase().limit(96)),
      'os dados de franquia do dashboard',
    );
  }

  const result: FranchiseDashboardRow[] = [];
  let offset = 0;

  while (result.length < DASHBOARD_FRANCHISE_ROWS_CAP) {
    const to = offset + DASHBOARD_PAGE_SIZE - 1;
    const page = await readRows<FranchiseDashboardRow>(
      asQueryResult(scopedBase().range(offset, to)),
      'os dados de franquia do dashboard',
    );

    result.push(...page);

    if (page.length < DASHBOARD_PAGE_SIZE) {
      break;
    }

    offset += DASHBOARD_PAGE_SIZE;
  }

  return result;
}

async function readVwRegionalDashboard(access: AccessProfile): Promise<RegionalDashboardRow[]> {
  const scopedBase = () => {
    const q = supabase
      .from('vw_regional_dashboard')
      .select('*')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .order('regional_name', { ascending: true });

    return applyScopedFilters(q, access, 'regional_id', 'regional_id');
  };

  const needsPagedRegional =
    access.dashboardScope === 'regional' ||
    access.dashboardScope === 'holding' ||
    access.dashboardScope === 'controladoria';

  if (!needsPagedRegional) {
    return [];
  }

  const result: RegionalDashboardRow[] = [];
  let offset = 0;

  while (result.length < DASHBOARD_REGIONAL_ROWS_CAP) {
    const to = offset + DASHBOARD_PAGE_SIZE - 1;
    const page = await readRows<RegionalDashboardRow>(
      asQueryResult(scopedBase().range(offset, to)),
      'os dados regionais do dashboard',
    );

    result.push(...page);

    if (page.length < DASHBOARD_PAGE_SIZE) {
      break;
    }

    offset += DASHBOARD_PAGE_SIZE;
  }

  return result;
}

export async function fetchKpiHistory(options: {
  franchiseId?: string | null;
  regionalId?: string | null;
  metric: KpiSparklineMetric;
  periodsCount?: number;
}): Promise<KpiHistoryPoint[]> {
  const { data, error } = await supabase.rpc('get_kpi_history', {
    p_franchise_id: options.franchiseId ?? null,
    p_metric: options.metric,
    p_periods_count: options.periodsCount ?? 6,
    p_regional_id: options.regionalId ?? null,
  });

  if (error) {
    throw new Error(`Não foi possível carregar o histórico do indicador. ${error.message}`);
  }

  return (data ?? []) as KpiHistoryPoint[];
}

export async function fetchFranchiseMetricTrend(options: {
  regionId?: string | null;
  franchiseIds?: string[] | null;
  months?: number;
  metric: FranchiseMetricTrendMetric;
}): Promise<FranchiseMetricTrendRow[]> {
  const ids =
    options.franchiseIds != null && options.franchiseIds.length > 0 ? options.franchiseIds : null;

  const { data, error } = await supabase.rpc('get_franchise_metric_trend', {
    p_region_id: options.regionId ?? null,
    p_franchise_ids: ids,
    p_months: options.months ?? 12,
    p_metric: options.metric,
  });

  if (error) {
    throw new Error(`Não foi possível carregar a tendência do indicador. ${error.message}`);
  }

  return (data ?? []) as FranchiseMetricTrendRow[];
}

export async function fetchDashboardSnapshot(access: AccessProfile) {
  const franchiseRowsPromise = readVwFranchiseDashboard(access);

  const regionalRowsPromise =
    access.dashboardScope === 'regional' ||
    access.dashboardScope === 'holding' ||
    access.dashboardScope === 'controladoria'
      ? readVwRegionalDashboard(access)
      : Promise.resolve<RegionalDashboardRow[]>([]);

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

  const [franchiseRows, regionalRows, networkRows, currentSubmissions, pendingReviews] =
    await Promise.all([
      franchiseRowsPromise,
      regionalRowsPromise,
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

/** DRE oficial por submissão (uso em modo comparativo franquia ou telas que precisam de histórico). */
export async function fetchDreStatementForSubmission(submissionId: string): Promise<DreStatementRow[]> {
  return readRows<DreStatementRow>(
    asQueryResult(
      supabase
        .from('vw_submission_dre_statement')
        .select('*')
        .eq('submission_id', submissionId)
        .order('section_order', { ascending: true })
        .order('line_order', { ascending: true }),
    ),
    'a DRE detalhada da submissão',
  );
}

export async function fetchCurrentSubmissions(access: AccessProfile) {
  let query = supabase
    .from('vw_current_submissions')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  query = applyScopedFilters(query, access).limit(60);

  return readRows<CurrentSubmissionRow>(asQueryResult(query), 'as submissões correntes');
}

export async function fetchPendingReviews() {
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

export async function fetchAccessibleFranchises(access: AccessProfile) {
  let query = supabase
    .from('franchises')
    .select('id, code, trade_name, regional_id, status, city, state')
    .order('code', { ascending: true });

  if (access.franchiseIds.length) {
    query = query.in('id', access.franchiseIds);
  } else if (access.regionalIds.length) {
    query = query.in('regional_id', access.regionalIds);
  }

  return readRows<FranchiseListRow>(asQueryResult(query), 'as franquias disponíveis');
}

export async function fetchReportingPeriods() {
  return readRows<ReportingPeriodRow>(
    asQueryResult(
      supabase
        .from('reporting_periods')
        .select('id, label, status, year, month, submission_deadline_at, adjustment_deadline_at')
        .order('year', { ascending: false })
        .order('month', { ascending: false }),
    ),
    'as competências',
  );
}

export async function fetchEventsForSelection(franchiseId: string, reportingPeriodId: string) {
  return readRows<EventOptionRow>(
    asQueryResult(
      supabase
        .from('events')
        .select('id, name, status, event_date, franchise_id, reporting_period_id')
        .eq('franchise_id', franchiseId)
        .eq('reporting_period_id', reportingPeriodId)
        .order('event_date', { ascending: false }),
    ),
    'os eventos da competência',
  );
}

export async function fetchAuditEntries(limit = 50) {
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
  const [franchises, regionals, roles, profiles, periods, submissions, currentSubmissions, pendingReviews] =
    await Promise.all([
      readRows<FranchiseListRow>(
        asQueryResult(
          supabase
            .from('franchises')
            .select('id, code, trade_name, regional_id, status, city, state')
            .order('code', { ascending: true }),
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
      readRows<{ id: string }>(
        asQueryResult(supabase.from('submissions').select('id')),
        'as submissões cadastradas',
      ),
      readRows<{ submission_id: string }>(
        asQueryResult(supabase.from('vw_current_submissions').select('submission_id')),
        'as submissões correntes',
      ),
      readRows<{ submission_id: string }>(
        asQueryResult(supabase.from('vw_pending_reviews').select('submission_id')),
        'a fila de revisão',
      ),
    ]);

  return {
    franchises,
    regionals,
    roles,
    userCount: profiles.length,
    periodCount: periods.length,
    submissionsCount: submissions.length,
    currentSubmissionCount: currentSubmissions.length,
    pendingReviewsCount: pendingReviews.length,
    openPeriods: periods.filter((period) => period.status !== 'closed'),
  };
}

export async function fetchUserAccessDirectory() {
  return readRows<UserAccessDirectoryRow>(
    asQueryResult(
      supabase
        .from('vw_user_access_directory')
        .select('*')
        .order('full_name', { ascending: true }),
    ),
    'o diretório de acessos',
  );
}

async function callAdminFunction(
  functionName: 'fn_admin_seed_demo_environment' | 'fn_admin_reset_demo_environment',
  label: string,
) {
  const { data, error } = await supabase.rpc(functionName);

  if (error) {
    throw new Error(`Não foi possível ${label}. ${error.message}`);
  }

  return (data ?? { message: 'Operação concluída.' }) as AdminActionResult;
}

export function seedDemoEnvironment() {
  return callAdminFunction(
    'fn_admin_seed_demo_environment',
    'preparar o ambiente de demonstração',
  );
}

export function resetDemoEnvironment() {
  return callAdminFunction(
    'fn_admin_reset_demo_environment',
    'zerar o ambiente de demonstração',
  );
}

export async function upsertExistingUserAccess(payload: AdminUserAccessPayload) {
  const { data, error } = await supabase.rpc('fn_admin_upsert_user_access', {
    p_profile_id: payload.profileId,
    p_full_name: payload.fullName,
    p_status: payload.status,
    p_role_code: payload.roleCode,
    p_scope_type: payload.scopeType,
    p_franchise_id: payload.franchiseId ?? null,
    p_regional_id: payload.regionalId ?? null,
  });

  if (error) {
    throw new Error(`Não foi possível atualizar o acesso. ${error.message}`);
  }

  return data as { message: string };
}

export async function provisionUserAccess(payload: AdminUserProvisionPayload) {
  const { data, error } = await supabase.functions.invoke('admin-provision-user', {
    body: {
      email: payload.email,
      fullName: payload.fullName,
      password: payload.password ?? null,
      status: payload.status,
      roleCode: payload.roleCode,
      scopeType: payload.scopeType,
      franchiseId: payload.franchiseId ?? null,
      regionalId: payload.regionalId ?? null,
    },
  });

  if (error) {
    throw new Error(`Não foi possível provisionar o usuário. ${error.message}`);
  }

  const result = data as AdminUserProvisionResult | { error?: string };

  if ('error' in result && result.error) {
    throw new Error(result.error);
  }

  return result as AdminUserProvisionResult;
}

export async function fetchSubmissionScopeMeta(submissionId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, franchise_id, reporting_period_id, version_number')
    .eq('id', submissionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível localizar a submissão. ${error.message}`);
  }

  return data as {
    id: string;
    franchise_id: string;
    reporting_period_id: string;
    version_number: number;
  } | null;
}

export async function fetchSubmissionVersionsForPeriod(
  franchiseId: string,
  reportingPeriodId: string,
): Promise<SubmissionVersionSummaryRow[]> {
  return readRows<SubmissionVersionSummaryRow>(
    asQueryResult(
      supabase
        .from('submissions')
        .select('id, franchise_id, reporting_period_id, version_number, status, notes, submitted_at, created_at')
        .eq('franchise_id', franchiseId)
        .eq('reporting_period_id', reportingPeriodId)
        .order('version_number', { ascending: false }),
    ),
    'o histórico de versões da competência',
  );
}

export async function restoreSubmissionInputsFromVersion(
  targetSubmissionId: string,
  sourceSubmissionId: string,
) {
  const { data, error } = await supabase.rpc('fn_restore_submission_inputs_from_version', {
    p_target_submission_id: targetSubmissionId,
    p_source_submission_id: sourceSubmissionId,
  });

  if (error) {
    throw new Error(`Não foi possível restaurar a versão. ${error.message}`);
  }

  return data as { ok: boolean; submission_id: string; message: string };
}

export async function ensureSubmissionVersion(
  franchiseId: string,
  reportingPeriodId: string,
  eventId?: string | null,
) {
  const { data, error } = await supabase.rpc('fn_create_submission_version', {
    p_franchise_id: franchiseId,
    p_reporting_period_id: reportingPeriodId,
    p_event_id: eventId ?? null,
  });

  if (error) {
    throw new Error(`Não foi possível preparar a submissão. ${error.message}`);
  }

  return data as {
    submission_id: string;
    version_number: number;
    status: string;
    reused: boolean;
  };
}

export async function fetchSubmissionWorkspace(submissionId: string): Promise<SubmissionWorkspaceSnapshot> {
  const submissionResult = await supabase
    .from('submissions')
    .select('id, franchise_id, reporting_period_id, event_id, version_number, revision, status, notes, submitted_at, created_at')
    .eq('id', submissionId)
    .maybeSingle();

  if (submissionResult.error) {
    throw new Error(`Não foi possível carregar a submissão. ${submissionResult.error.message}`);
  }

  const submission = (submissionResult.data ?? null) as SubmissionEditorRecord | null;

  if (!submission) {
    return {
      submission: null,
      inputLines: [],
      kpis: null,
      dreStatement: [],
      validationResults: [],
      issues: [],
      history: [],
    };
  }

  const [
    sections,
    lines,
    inputValues,
    kpiResult,
    dreStatement,
    validationRows,
    issues,
    history,
  ] = await Promise.all([
    readRows<{ id: string; code: string; name: string; display_order: number }>(
      asQueryResult(
        supabase
          .from('dre_sections')
          .select('id, code, name, display_order')
          .order('display_order', { ascending: true }),
      ),
      'as seções da DRE',
    ),
    readRows<{
      id: string;
      section_id: string;
      code: string;
      name: string;
      description: string | null;
      display_order: number;
      input_mode: string | null;
    }>(
      asQueryResult(
        supabase
          .from('dre_lines')
          .select('id, section_id, code, name, description, display_order, input_mode')
          .eq('line_type', 'input')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
      ),
      'as linhas editáveis da DRE',
    ),
    readRows<{ dre_line_id: string; value_currency: number | null; notes: string | null }>(
      asQueryResult(
        supabase
          .from('submission_input_values')
          .select('dre_line_id, value_currency, notes')
          .eq('submission_id', submissionId),
      ),
      'os inputs salvos da submissão',
    ),
    supabase
      .from('submission_kpis')
      .select('submission_id, gross_revenue, mc1, mc2, ebitda_1, ebitda_2, marketing_pct, default_pct, tax_pct, updated_at')
      .eq('submission_id', submissionId)
      .maybeSingle(),
    readRows<DreStatementRow>(
      asQueryResult(
        supabase
          .from('vw_submission_dre_statement')
          .select('*')
          .eq('submission_id', submissionId)
          .order('section_order', { ascending: true })
          .order('line_order', { ascending: true }),
      ),
      'a DRE oficial da submissão',
    ),
    readRows<{
      id: string;
      submission_id: string;
      validation_rule_id: string;
      status: string;
      message: string | null;
      detected_at: string;
      validation_rules: {
        code: string;
        name: string;
        severity: string;
      } | null;
    }>(
      asQueryResult(
        supabase
          .from('submission_validation_results')
          .select(`
            id,
            submission_id,
            validation_rule_id,
            status,
            message,
            detected_at,
            validation_rules!inner (
              code,
              name,
              severity
            )
          `)
          .eq('submission_id', submissionId)
          .order('detected_at', { ascending: false }),
      ),
      'as validações da submissão',
    ),
    readRows<SubmissionIssueRow>(
      asQueryResult(
        supabase
          .from('submission_issues')
          .select('id, submission_id, issue_type, severity, description, status, opened_at, resolved_at')
          .eq('submission_id', submissionId)
          .order('opened_at', { ascending: false }),
      ),
      'as pendências da submissão',
    ),
    readRows<SubmissionHistoryRow>(
      asQueryResult(
        supabase
          .from('submission_status_history')
          .select('id, submission_id, from_status, to_status, reason, changed_at, changed_by')
          .eq('submission_id', submissionId)
          .order('changed_at', { ascending: false }),
      ),
      'o histórico da submissão',
    ),
  ]);

  if (kpiResult.error) {
    throw new Error(`Não foi possível carregar os KPIs da submissão. ${kpiResult.error.message}`);
  }

  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const inputMap = new Map(inputValues.map((value) => [value.dre_line_id, value]));

  const inputLines: DreInputCatalogLine[] = lines
    .map((line) => {
      const section = sectionMap.get(line.section_id);
      const value = inputMap.get(line.id);

      return {
        id: line.id,
        section_code: section?.code ?? 'section',
        section_name: section?.name ?? 'Seção',
        section_order: section?.display_order ?? 999,
        line_code: line.code,
        line_name: line.name,
        description: line.description,
        line_order: line.display_order,
        input_mode: line.input_mode,
        value_currency: value?.value_currency ?? null,
        notes: value?.notes ?? null,
      };
    })
    .sort((left, right) => {
      if (left.section_order !== right.section_order) {
        return left.section_order - right.section_order;
      }

      return left.line_order - right.line_order;
    });

  const normalizedValidationResults: ValidationResultRow[] = validationRows.map((row) => ({
    id: row.id,
    submission_id: row.submission_id,
    validation_rule_id: row.validation_rule_id,
    status: row.status,
    message: row.message,
    detected_at: row.detected_at,
    rule_code: row.validation_rules?.code ?? 'rule',
    rule_name: row.validation_rules?.name ?? 'Regra',
    severity: row.validation_rules?.severity ?? 'info',
  }));

  return {
    submission,
    inputLines,
    kpis: (kpiResult.data ?? null) as SubmissionKpiRow | null,
    dreStatement,
    validationResults: normalizedValidationResults,
    issues,
    history,
  };
}

export async function saveSubmissionInputs(
  submissionId: string,
  inputs: Array<{ line_code: string; value_currency: number | null; notes?: string | null }>,
  notes?: string | null,
  expectedRevision?: number | null,
) {
  const { data, error } = await supabase.rpc('fn_save_submission_inputs', {
    p_submission_id: submissionId,
    p_inputs: inputs,
    p_notes: notes ?? null,
    p_expected_revision: expectedRevision ?? null,
  });

  if (error) {
    throw new Error(`Não foi possível salvar o rascunho. ${error.message}`);
  }

  return data as {
    submission_id?: string;
    status?: string;
    message: string;
    validation_count: number;
    revision: number;
    kpis?: {
      gross_revenue?: number;
      mc1?: number;
      mc2?: number;
      ebitda_1?: number;
      ebitda_2?: number;
    };
  };
}

export async function submitSubmission(
  submissionId: string,
  notes?: string | null,
  expectedRevision?: number | null,
) {
  const { data, error } = await supabase.rpc('fn_submit_submission', {
    p_submission_id: submissionId,
    p_notes: notes ?? null,
    p_expected_revision: expectedRevision ?? null,
  });

  if (error) {
    throw new Error(`Não foi possível enviar a submissão. ${error.message}`);
  }

  return data as {
    ok: boolean;
    status: string;
    revision?: number;
    blocking_errors?: number;
    message: string;
  };
}

export async function reviewSubmission(
  submissionId: string,
  action: 'start_review' | 'approve' | 'request_adjustment',
  reason?: string | null,
  expectedRevision?: number | null,
) {
  const { data, error } = await supabase.rpc('fn_review_submission', {
    p_submission_id: submissionId,
    p_action: action,
    p_reason: reason ?? null,
    p_expected_revision: expectedRevision ?? null,
  });

  if (error) {
    throw new Error(`Não foi possível concluir a ação da controladoria. ${error.message}`);
  }

  return data as {
    status: string;
    message: string;
    revision?: number;
  };
}

export async function getOrCreateAgentSession(
  submissionId: string,
  franchiseId: string,
  reportingPeriodId: string,
  assistantMode = 'guided_dre',
) {
  const { data, error } = await supabase.rpc('fn_agent_get_or_create_session', {
    p_submission_id: submissionId,
    p_franchise_id: franchiseId,
    p_reporting_period_id: reportingPeriodId,
    p_assistant_mode: assistantMode,
  });

  if (error) {
    throw new Error(`Nao foi possivel abrir o assistente. ${error.message}`);
  }

  const result = data as {
    session_id: string;
    assistant_mode: string;
    status: string;
  };

  const sessionResult = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('id', result.session_id)
    .maybeSingle();

  if (sessionResult.error || !sessionResult.data) {
    throw new Error(
      `Nao foi possivel carregar a sessao do assistente. ${
        sessionResult.error?.message ?? 'Sessao nao encontrada.'
      }`,
    );
  }

  return sessionResult.data as AgentSessionRow;
}

export async function fetchAgentMessages(sessionId: string) {
  return readRows<AgentMessageRow>(
    asQueryResult(
      supabase
        .from('agent_messages')
        .select('id, session_id, role, content, citations, payload, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }),
    ),
    'as mensagens do assistente',
  );
}

export async function appendAgentMessage(
  sessionId: string,
  role: AgentMessageRow['role'],
  content: string,
  options?: {
    citations?: AgentMessageRow['citations'];
    payload?: AgentMessageRow['payload'];
  },
) {
  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      citations: options?.citations ?? [],
      payload: options?.payload ?? {},
    })
    .select('id, session_id, role, content, citations, payload, created_at')
    .single();

  if (error) {
    throw new Error(`Nao foi possivel registrar a mensagem do assistente. ${error.message}`);
  }

  await supabase
    .from('agent_sessions')
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return data as AgentMessageRow;
}

export async function updateAgentSessionState(
  sessionId: string,
  stateJson: Record<string, unknown>,
  summary?: string | null,
) {
  const { data, error } = await supabase
    .from('agent_sessions')
    .update({
      state_json: stateJson,
      summary: summary ?? null,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Nao foi possivel atualizar o estado do assistente. ${error.message}`);
  }

  return data as AgentSessionRow;
}

export function formatApiError(error: unknown, fallback: string) {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Sem ligação ao servidor — verifique a rede e tente novamente.';
  }

  if (typeof error === 'object' && error !== null) {
    const rec = error as Record<string, unknown>;
    const code = typeof rec.code === 'string' ? rec.code : '';
    const status = typeof rec.status === 'number' ? rec.status : undefined;

    if (code === 'UPSTREAM_TIMEOUT') {
      return 'O assistente demorou — tente novamente em alguns segundos.';
    }
    if (status === 401) {
      return 'Sessão expirada — entre novamente.';
    }
    if (status === 403) {
      return 'Sem permissão para esta operação.';
    }
  }

  const msg = getErrorMessage(error, fallback);
  if (/UPSTREAM_TIMEOUT/i.test(msg)) {
    return 'O assistente demorou — tente novamente em alguns segundos.';
  }
  return msg;
}
