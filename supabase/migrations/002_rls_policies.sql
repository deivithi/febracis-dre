-- =========================================================
-- FEBRACIS | MIGRATION 002: RLS POLICIES
-- =========================================================

begin;

-- =========================================================
-- HELPER FUNCTIONS FOR RLS
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid()
      and r.code = 'system_admin'
  );
$$;

create or replace function public.has_network_scope()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_scopes us
    where us.profile_id = auth.uid()
      and us.scope_type = 'network'
  );
$$;

create or replace function public.can_access_franchise(p_franchise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin()
    or public.has_network_scope()
    or exists (
      select 1 from public.user_scopes us
      where us.profile_id = auth.uid()
        and us.scope_type = 'franchise'
        and us.franchise_id = p_franchise_id
    )
    or exists (
      select 1 from public.user_scopes us
      join public.franchises f on f.regional_id = us.regional_id
      where us.profile_id = auth.uid()
        and us.scope_type = 'regional'
        and f.id = p_franchise_id
    );
$$;

create or replace function public.can_manage_review()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.profile_id = auth.uid()
        and r.code in ('finance_controller', 'executive', 'system_admin')
    );
$$;

-- =========================================================
-- ENABLE RLS ON ALL TABLES
-- =========================================================

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.regionals enable row level security;
alter table public.franchises enable row level security;
alter table public.user_scopes enable row level security;
alter table public.reporting_periods enable row level security;
alter table public.period_franchise_status enable row level security;
alter table public.event_types enable row level security;
alter table public.events enable row level security;
alter table public.dre_sections enable row level security;
alter table public.dre_lines enable row level security;
alter table public.dre_line_groups enable row level security;
alter table public.dre_line_group_items enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_input_values enable row level security;
alter table public.submission_attachments enable row level security;
alter table public.calculation_rule_versions enable row level security;
alter table public.calculation_rules enable row level security;
alter table public.calculation_rule_dependencies enable row level security;
alter table public.submission_calculated_values enable row level security;
alter table public.submission_kpis enable row level security;
alter table public.validation_rules enable row level security;
alter table public.submission_validation_results enable row level security;
alter table public.submission_status_history enable row level security;
alter table public.submission_issues enable row level security;
alter table public.submission_approvals enable row level security;
alter table public.audit_log enable row level security;

-- =========================================================
-- PROFILES
-- =========================================================

create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_self_or_admin"
on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- =========================================================
-- ROLES / USER_ROLES / USER_SCOPES
-- =========================================================

create policy "roles_read_authenticated"
on public.roles for select to authenticated using (true);

create policy "user_roles_read_self_or_admin"
on public.user_roles for select to authenticated
using (profile_id = auth.uid() or public.is_admin());

create policy "user_roles_admin_write"
on public.user_roles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "user_scopes_read_self_or_admin"
on public.user_scopes for select to authenticated
using (profile_id = auth.uid() or public.is_admin());

create policy "user_scopes_admin_write"
on public.user_scopes for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- REGIONALS
-- =========================================================

create policy "regionals_read_by_scope"
on public.regionals for select to authenticated
using (
  public.is_admin()
  or public.has_network_scope()
  or manager_profile_id = auth.uid()
  or exists (
    select 1 from public.user_scopes us
    where us.profile_id = auth.uid()
      and us.scope_type = 'regional'
      and us.regional_id = regionals.id
  )
  or exists (
    select 1 from public.user_scopes us
    join public.franchises f on f.id = us.franchise_id
    where us.profile_id = auth.uid()
      and us.scope_type = 'franchise'
      and f.regional_id = regionals.id
  )
);

create policy "regionals_admin_write"
on public.regionals for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- FRANCHISES
-- =========================================================

create policy "franchises_read_by_scope"
on public.franchises for select to authenticated
using (public.can_access_franchise(id));

create policy "franchises_admin_write"
on public.franchises for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- REPORTING PERIODS
-- =========================================================

create policy "reporting_periods_read_authenticated"
on public.reporting_periods for select to authenticated using (true);

create policy "reporting_periods_admin_write"
on public.reporting_periods for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- PERIOD FRANCHISE STATUS
-- =========================================================

create policy "period_franchise_status_read_by_scope"
on public.period_franchise_status for select to authenticated
using (public.can_access_franchise(franchise_id));

create policy "period_franchise_status_write_review"
on public.period_franchise_status for all to authenticated
using (public.can_manage_review()) with check (public.can_manage_review());

-- =========================================================
-- EVENT TYPES / EVENTS
-- =========================================================

create policy "event_types_read_authenticated"
on public.event_types for select to authenticated using (true);

create policy "event_types_admin_write"
on public.event_types for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "events_read_by_scope"
on public.events for select to authenticated
using (public.can_access_franchise(franchise_id));

create policy "events_insert_by_scope"
on public.events for insert to authenticated
with check (public.can_access_franchise(franchise_id));

create policy "events_update_by_scope"
on public.events for update to authenticated
using (public.can_access_franchise(franchise_id))
with check (public.can_access_franchise(franchise_id));

-- =========================================================
-- DRE CATALOG (read-only for non-admins)
-- =========================================================

create policy "dre_sections_read" on public.dre_sections for select to authenticated using (true);
create policy "dre_lines_read" on public.dre_lines for select to authenticated using (true);
create policy "dre_line_groups_read" on public.dre_line_groups for select to authenticated using (true);
create policy "dre_line_group_items_read" on public.dre_line_group_items for select to authenticated using (true);

create policy "dre_sections_admin_write" on public.dre_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "dre_lines_admin_write" on public.dre_lines for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "dre_line_groups_admin_write" on public.dre_line_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "dre_line_group_items_admin_write" on public.dre_line_group_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- SUBMISSIONS
-- =========================================================

create policy "submissions_read_by_scope"
on public.submissions for select to authenticated
using (public.can_access_franchise(franchise_id));

create policy "submissions_insert_by_scope"
on public.submissions for insert to authenticated
with check (public.can_access_franchise(franchise_id));

create policy "submissions_update_by_scope_or_review"
on public.submissions for update to authenticated
using (public.can_access_franchise(franchise_id) or public.can_manage_review())
with check (public.can_access_franchise(franchise_id) or public.can_manage_review());

-- =========================================================
-- SUBMISSION INPUT VALUES
-- =========================================================

create policy "siv_read_by_scope"
on public.submission_input_values for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_input_values.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "siv_insert_by_scope"
on public.submission_input_values for insert to authenticated
with check (exists (
  select 1 from public.submissions s
  where s.id = submission_input_values.submission_id
    and public.can_access_franchise(s.franchise_id)
    and s.status in ('draft', 'reopened', 'pending_adjustment')
));

create policy "siv_update_by_scope"
on public.submission_input_values for update to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_input_values.submission_id
    and public.can_access_franchise(s.franchise_id)
    and s.status in ('draft', 'reopened', 'pending_adjustment')
))
with check (exists (
  select 1 from public.submissions s
  where s.id = submission_input_values.submission_id
    and public.can_access_franchise(s.franchise_id)
    and s.status in ('draft', 'reopened', 'pending_adjustment')
));

-- =========================================================
-- ATTACHMENTS
-- =========================================================

create policy "attachments_read_by_scope"
on public.submission_attachments for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_attachments.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "attachments_insert_by_scope"
on public.submission_attachments for insert to authenticated
with check (exists (
  select 1 from public.submissions s
  where s.id = submission_attachments.submission_id
    and public.can_access_franchise(s.franchise_id)
    and s.status in ('draft', 'reopened', 'pending_adjustment')
));

-- =========================================================
-- CALCULATION (read-only except via functions)
-- =========================================================

create policy "calc_rule_versions_read" on public.calculation_rule_versions for select to authenticated using (true);
create policy "calc_rules_read" on public.calculation_rules for select to authenticated using (true);
create policy "calc_rule_deps_read" on public.calculation_rule_dependencies for select to authenticated using (true);

create policy "calc_rule_versions_admin_write" on public.calculation_rule_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "calc_rules_admin_write" on public.calculation_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "calc_rule_deps_admin_write" on public.calculation_rule_dependencies for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "scv_read_by_scope"
on public.submission_calculated_values for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_calculated_values.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "scv_write_review"
on public.submission_calculated_values for all to authenticated
using (public.can_manage_review()) with check (public.can_manage_review());

create policy "kpis_read_by_scope"
on public.submission_kpis for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_kpis.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "kpis_write_review"
on public.submission_kpis for all to authenticated
using (public.can_manage_review()) with check (public.can_manage_review());

-- =========================================================
-- VALIDATION
-- =========================================================

create policy "validation_rules_read" on public.validation_rules for select to authenticated using (true);
create policy "validation_rules_admin_write" on public.validation_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "svr_read_by_scope"
on public.submission_validation_results for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_validation_results.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "svr_write_review"
on public.submission_validation_results for all to authenticated
using (public.can_manage_review()) with check (public.can_manage_review());

-- =========================================================
-- WORKFLOW
-- =========================================================

create policy "ssh_read_by_scope"
on public.submission_status_history for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_status_history.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "ssh_write_review"
on public.submission_status_history for all to authenticated
using (public.can_manage_review()) with check (public.can_manage_review());

create policy "issues_read_by_scope"
on public.submission_issues for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_issues.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "issues_write_review"
on public.submission_issues for all to authenticated
using (public.can_manage_review()) with check (public.can_manage_review());

create policy "approvals_read_by_scope"
on public.submission_approvals for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_approvals.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "approvals_write_review"
on public.submission_approvals for all to authenticated
using (public.can_manage_review()) with check (public.can_manage_review());

-- =========================================================
-- AUDIT LOG
-- =========================================================

create policy "audit_log_read_review"
on public.audit_log for select to authenticated
using (public.can_manage_review());

create policy "audit_log_insert_any"
on public.audit_log for insert to authenticated
with check (true);

commit;
