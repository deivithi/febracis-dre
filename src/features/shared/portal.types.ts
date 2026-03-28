import type { FranchiseRecord, RegionalRecord, RoleRecord } from '../auth/auth.types';

export type NumericValue = number | string | null;

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
}
