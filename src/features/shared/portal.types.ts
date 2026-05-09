import type { FranchiseRecord, RegionalRecord, RoleRecord } from '../auth/auth.types';

export type NumericValue = number | string | null;

/** Métricas suportadas por `get_kpi_history` (sparklines do cockpit). */
export const KPI_SPARKLINE_METRICS = [
  'gross_revenue',
  'mc1',
  'mc2',
  'ebitda_2',
  'approved_submission_count',
  'adjustment_pipeline_count',
] as const;

export type KpiSparklineMetric = (typeof KPI_SPARKLINE_METRICS)[number];

/** Ponto cronológico retornado pelo RPC `get_kpi_history` (Supabase pode devolver `value` como string). */
export interface KpiHistoryPoint {
  period_label: string;
  period_year: number;
  period_month: number;
  value: number | string;
}

export type FranchiseMetricTrendMetric = 'ebitda_1' | 'ebitda_2' | 'mc1' | 'mc2';

/** Linha retornada por `get_franchise_metric_trend` (apenas submissões aprovadas). */
export interface FranchiseMetricTrendRow {
  franchise_id: string;
  franchise_name: string;
  regional_id: string;
  /** Primeiro dia do mês competência (ISO). */
  period_month: string;
  metric_value: number | string;
}

export interface CurrentSubmissionRow {
  submission_id: string;
  franchise_id: string;
  reporting_period_id: string;
  version_number: number;
  status: string;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  franchise_name: string;
  franchise_code: string;
  regional_id: string;
  regional_name: string;
  period_label: string;
  period_year: number;
  period_month: number;
}

export interface DreStatementRow {
  submission_id: string;
  franchise_id: string;
  reporting_period_id: string;
  section_code: string;
  section_name: string;
  section_order: number;
  line_code: string;
  line_name: string;
  line_type: string;
  line_order: number;
  value_currency: NumericValue;
  percent_of_gross_revenue: NumericValue;
}

export interface FranchiseDashboardRow {
  submission_id: string;
  franchise_id: string;
  franchise_name: string;
  franchise_code: string;
  regional_id: string;
  regional_name: string;
  period_label: string;
  period_year: number;
  period_month: number;
  submission_status: string;
  gross_revenue: NumericValue;
  mc1: NumericValue;
  mc2: NumericValue;
  ebitda_1: NumericValue;
  ebitda_2: NumericValue;
  marketing_pct: NumericValue;
  default_pct: NumericValue;
  tax_pct: NumericValue;
  mc1_pct: NumericValue;
  mc2_pct: NumericValue;
  ebitda1_pct: NumericValue;
  ebitda2_pct: NumericValue;
}

export interface RegionalDashboardRow {
  regional_id: string;
  regional_name: string;
  period_year: number;
  period_month: number;
  period_label: string;
  total_franchises: number;
  approved_count: number;
  pending_count: number;
  total_gross_revenue: NumericValue;
  total_mc1: NumericValue;
  total_mc2: NumericValue;
  total_ebitda_1: NumericValue;
  total_ebitda_2: NumericValue;
  avg_mc1_pct: NumericValue;
  avg_mc2_pct: NumericValue;
  avg_ebitda1_pct: NumericValue;
  avg_ebitda2_pct: NumericValue;
  avg_marketing_pct: NumericValue;
  avg_default_pct: NumericValue;
}

export interface NetworkDashboardRow {
  period_year: number;
  period_month: number;
  period_label: string;
  total_franchises: number;
  total_regionals: number;
  approved_count: number;
  pending_count: number;
  total_gross_revenue: NumericValue;
  total_mc1: NumericValue;
  total_mc2: NumericValue;
  total_ebitda_1: NumericValue;
  total_ebitda_2: NumericValue;
  avg_mc1_pct: NumericValue;
  avg_ebitda2_pct: NumericValue;
  min_ebitda2_pct: NumericValue;
  max_ebitda2_pct: NumericValue;
}

export interface PendingReviewRow {
  submission_id: string;
  franchise_id: string;
  franchise_name: string;
  franchise_code: string;
  regional_name: string;
  period_label: string;
  submission_status: string;
  submitted_at: string | null;
  gross_revenue: NumericValue;
  ebitda_2: NumericValue;
  ebitda2_pct: NumericValue;
  open_issues_count: number;
}

export interface AuditLogRow {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  performed_at: string;
  origin: string;
}

export interface FranchiseListRow extends FranchiseRecord {
  city: string | null;
  state: string | null;
}

export interface ReportingPeriodRow {
  id: string;
  label: string;
  status: string;
  year: number;
  month: number;
  submission_deadline_at: string | null;
  adjustment_deadline_at: string | null;
}

export interface DashboardSnapshot {
  franchiseRows: FranchiseDashboardRow[];
  regionalRows: RegionalDashboardRow[];
  networkRows: NetworkDashboardRow[];
  currentSubmissions: CurrentSubmissionRow[];
  pendingReviews: PendingReviewRow[];
  currentDre: DreStatementRow[];
  latestFranchise: FranchiseDashboardRow | null;
  previousFranchise: FranchiseDashboardRow | null;
  latestRegional: RegionalDashboardRow | null;
  previousRegional: RegionalDashboardRow | null;
  latestNetwork: NetworkDashboardRow | null;
  previousNetwork: NetworkDashboardRow | null;
}

export interface AdminSnapshot {
  franchises: FranchiseListRow[];
  regionals: RegionalRecord[];
  roles: RoleRecord[];
  openPeriods: ReportingPeriodRow[];
  userCount: number;
  periodCount: number;
  submissionsCount: number;
  currentSubmissionCount: number;
  pendingReviewsCount: number;
}

export interface AdminActionResult {
  message: string;
  deleted_submissions?: number;
  deleted_franchises?: number;
  deleted_regionals?: number;
  regionals?: number;
  franchises?: number;
  periods?: number;
  current_submissions?: number;
  previous_submissions?: number;
}

export interface UserAccessDirectoryRow {
  profile_id: string;
  full_name: string;
  email: string;
  profile_status: string;
  created_at: string;
  updated_at: string;
  role_code: string | null;
  role_name: string | null;
  scope_type: 'franchise' | 'regional' | 'network' | null;
  franchise_id: string | null;
  regional_id: string | null;
  franchise_name: string | null;
  franchise_code: string | null;
  regional_name: string | null;
  regional_code: string | null;
}

export interface AdminUserAccessPayload {
  profileId: string;
  fullName: string;
  status: 'active' | 'inactive' | 'invited';
  roleCode: string;
  scopeType: 'franchise' | 'regional' | 'network';
  franchiseId?: string | null;
  regionalId?: string | null;
}

export interface AdminUserProvisionPayload {
  email: string;
  fullName: string;
  password?: string | null;
  status: 'active' | 'inactive' | 'invited';
  roleCode: string;
  scopeType: 'franchise' | 'regional' | 'network';
  franchiseId?: string | null;
  regionalId?: string | null;
}

export interface AdminUserProvisionResult {
  ok: boolean;
  created: boolean;
  invited: boolean;
  profileId: string;
  message: string;
}

export interface EventOptionRow {
  id: string;
  name: string;
  status: string;
  event_date: string | null;
  franchise_id: string;
  reporting_period_id: string;
}

export interface SubmissionEditorRecord {
  id: string;
  franchise_id: string;
  reporting_period_id: string;
  event_id: string | null;
  version_number: number;
  status: string;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
}

/** Resumo de uma linha em `submissions` (cadeia de versões por franquia + competência). */
export interface SubmissionVersionSummaryRow {
  id: string;
  franchise_id: string;
  reporting_period_id: string;
  version_number: number;
  status: string;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface DreInputCatalogLine {
  id: string;
  section_code: string;
  section_name: string;
  section_order: number;
  line_code: string;
  line_name: string;
  description: string | null;
  line_order: number;
  input_mode: string | null;
  value_currency: NumericValue;
  notes: string | null;
}

export interface SubmissionKpiRow {
  submission_id: string;
  gross_revenue: NumericValue;
  mc1: NumericValue;
  mc2: NumericValue;
  ebitda_1: NumericValue;
  ebitda_2: NumericValue;
  marketing_pct: NumericValue;
  default_pct: NumericValue;
  tax_pct: NumericValue;
  updated_at: string;
}

export interface ValidationResultRow {
  id: string;
  submission_id: string;
  validation_rule_id: string;
  status: string;
  message: string | null;
  detected_at: string;
  rule_code: string;
  rule_name: string;
  severity: string;
}

export interface SubmissionIssueRow {
  id: string;
  submission_id: string;
  issue_type: string;
  severity: string;
  description: string;
  status: string;
  opened_at: string;
  resolved_at: string | null;
}

export interface SubmissionHistoryRow {
  id: string;
  submission_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  changed_at: string;
  changed_by: string | null;
}

export interface SubmissionWorkspaceSnapshot {
  submission: SubmissionEditorRecord | null;
  inputLines: DreInputCatalogLine[];
  kpis: SubmissionKpiRow | null;
  dreStatement: DreStatementRow[];
  validationResults: ValidationResultRow[];
  issues: SubmissionIssueRow[];
  history: SubmissionHistoryRow[];
}

export interface AgentSessionRow {
  id: string;
  profile_id: string;
  submission_id: string | null;
  franchise_id: string;
  reporting_period_id: string;
  assistant_mode: string;
  title: string | null;
  status: 'active' | 'archived';
  summary: string | null;
  state_json: Record<string, unknown>;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentMessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  citations: Array<{
    title: string;
    source: string;
    excerpt?: string;
  }>;
  payload: Record<string, unknown>;
  created_at: string;
}
