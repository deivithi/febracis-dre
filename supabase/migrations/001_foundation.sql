-- =========================================================
-- FEBRACIS | SISTEMA GERENCIAL DE RESULTADO POR FRANQUIA
-- MIGRATION 001: FOUNDATION
-- =========================================================
-- Este script cria toda a estrutura base do banco:
-- - Tabelas de identidade e organização
-- - Tabelas de calendário e períodos
-- - Tabelas de eventos
-- - Tabelas de estrutura DRE
-- - Tabelas de submissão e input
-- - Tabelas de cálculo e resultado
-- - Tabelas de validação e workflow
-- - Tabela de auditoria
-- - Triggers de updated_at
-- - Índices estratégicos
-- =========================================================

begin;

-- =========================================================
-- 0) FUNÇÕES UTILITÁRIAS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    status,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'invited',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- 1) IDENTITY / ACCESS
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  phone text,
  status text not null default 'invited'
    check (status in ('active', 'inactive', 'invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, role_id)
);

create table if not exists public.regionals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  manager_profile_id uuid references public.profiles(id),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.franchises (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  trade_name text not null,
  legal_name text,
  cnpj text unique,
  regional_id uuid not null references public.regionals(id),
  city text,
  state text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'implementation', 'closed')),
  go_live_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_scopes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  scope_type text not null
    check (scope_type in ('franchise', 'regional', 'network')),
  franchise_id uuid references public.franchises(id) on delete cascade,
  regional_id uuid references public.regionals(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chk_user_scope_consistency check (
    (scope_type = 'franchise' and franchise_id is not null and regional_id is null)
    or (scope_type = 'regional' and regional_id is not null and franchise_id is null)
    or (scope_type = 'network' and regional_id is null and franchise_id is null)
  )
);

-- =========================================================
-- 2) PERIODS / CALENDAR
-- =========================================================

create table if not exists public.reporting_periods (
  id uuid primary key default gen_random_uuid(),
  year int not null check (year >= 2020 and year <= 2100),
  month int not null check (month between 1 and 12),
  label text generated always as (year::text || '-' || lpad(month::text, 2, '0')) stored,
  status text not null default 'open'
    check (status in ('open', 'under_review', 'closed', 'reopened')),
  open_at timestamptz,
  submission_deadline_at timestamptz,
  adjustment_deadline_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, month)
);

create table if not exists public.period_franchise_status (
  id uuid primary key default gen_random_uuid(),
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  status text not null default 'not_started'
    check (status in (
      'not_started', 'draft', 'submitted', 'under_review',
      'pending_adjustment', 'approved', 'closed'
    )),
  current_submission_id uuid,
  last_status_change_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporting_period_id, franchise_id)
);

-- =========================================================
-- 3) EVENTS
-- =========================================================

create table if not exists public.event_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  event_type_id uuid references public.event_types(id),
  name text not null,
  event_date date,
  status text not null default 'planned'
    check (status in ('planned', 'executed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 4) DRE STRUCTURE
-- =========================================================

create table if not exists public.dre_sections (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  display_order int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dre_lines (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.dre_sections(id) on delete restrict,
  code text not null unique,
  name text not null,
  description text,
  line_type text not null
    check (line_type in ('input', 'calculated', 'subtotal', 'indicator')),
  input_mode text
    check (input_mode in ('currency', 'percentage', 'integer', 'text', 'boolean') or input_mode is null),
  display_order int not null,
  is_active boolean not null default true,
  is_editable boolean not null default false,
  affects_dashboard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_dre_line_editable check (
    (line_type = 'input' and is_editable = true)
    or (line_type in ('calculated', 'subtotal', 'indicator') and is_editable = false)
  )
);

create table if not exists public.dre_line_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dre_line_group_items (
  id uuid primary key default gen_random_uuid(),
  dre_line_id uuid not null references public.dre_lines(id) on delete cascade,
  dre_line_group_id uuid not null references public.dre_line_groups(id) on delete cascade,
  unique (dre_line_id, dre_line_group_id)
);

-- =========================================================
-- 5) SUBMISSIONS / INPUTS / ATTACHMENTS
-- =========================================================

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  version_number int not null check (version_number >= 1),
  status text not null default 'draft'
    check (status in (
      'draft', 'submitted', 'under_review', 'pending_adjustment',
      'approved', 'closed', 'reopened', 'superseded'
    )),
  origin text not null default 'internal_app'
    check (origin in ('external_form', 'internal_app', 'admin_entry', 'import')),
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submission_input_values (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  dre_line_id uuid not null references public.dre_lines(id) on delete restrict,
  value_currency numeric(14,2),
  value_text text,
  value_boolean boolean,
  value_integer int,
  value_percentage numeric(8,4),
  entered_by uuid references public.profiles(id),
  entered_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, dre_line_id),
  constraint chk_submission_input_one_value check (
    (
      case when value_currency is not null then 1 else 0 end +
      case when value_text is not null then 1 else 0 end +
      case when value_boolean is not null then 1 else 0 end +
      case when value_integer is not null then 1 else 0 end +
      case when value_percentage is not null then 1 else 0 end
    ) <= 1
  )
);

create table if not exists public.submission_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  attachment_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 6) CALCULATION / OUTPUTS / KPI
-- =========================================================

create table if not exists public.calculation_rule_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null unique,
  description text,
  is_active boolean not null default false,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.calculation_rules (
  id uuid primary key default gen_random_uuid(),
  rule_version_id uuid not null references public.calculation_rule_versions(id) on delete cascade,
  result_line_id uuid not null references public.dre_lines(id) on delete cascade,
  rule_name text not null,
  rule_description text,
  expression_reference text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (rule_version_id, result_line_id)
);

create table if not exists public.calculation_rule_dependencies (
  id uuid primary key default gen_random_uuid(),
  calculation_rule_id uuid not null references public.calculation_rules(id) on delete cascade,
  source_line_id uuid not null references public.dre_lines(id) on delete cascade,
  dependency_type text not null
    check (dependency_type in ('sum', 'subtract', 'percentage_of', 'copy', 'derived')),
  created_at timestamptz not null default now()
);

create table if not exists public.submission_calculated_values (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  dre_line_id uuid not null references public.dre_lines(id) on delete restrict,
  calculation_rule_version_id uuid not null references public.calculation_rule_versions(id) on delete restrict,
  value_currency numeric(14,2) not null,
  percent_of_gross_revenue numeric(8,4),
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (submission_id, dre_line_id)
);

create table if not exists public.submission_kpis (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  gross_revenue numeric(14,2),
  mc1 numeric(14,2),
  mc2 numeric(14,2),
  ebitda_1 numeric(14,2),
  ebitda_2 numeric(14,2),
  marketing_pct numeric(8,4),
  default_pct numeric(8,4),
  tax_pct numeric(8,4),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 7) VALIDATION / WORKFLOW
-- =========================================================

create table if not exists public.validation_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  severity text not null
    check (severity in ('info', 'warning', 'blocking')),
  scope text not null
    check (scope in ('input', 'submission', 'period', 'attachment')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.submission_validation_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  validation_rule_id uuid not null references public.validation_rules(id) on delete restrict,
  status text not null
    check (status in ('passed', 'failed', 'warning')),
  message text,
  affected_line_id uuid references public.dre_lines(id) on delete set null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.submission_status_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id),
  reason text,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.submission_issues (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  issue_type text not null,
  severity text not null
    check (severity in ('low', 'medium', 'high', 'blocking')),
  description text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'dismissed')),
  opened_by uuid references public.profiles(id),
  opened_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.submission_approvals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  approval_step text not null,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz not null default now(),
  decision text not null
    check (decision in ('approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 8) AUDIT
-- =========================================================

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null
    check (action in ('insert', 'update', 'delete', 'status_change', 'recalculate')),
  old_data jsonb,
  new_data jsonb,
  performed_by uuid references public.profiles(id),
  performed_at timestamptz not null default now(),
  origin text not null
    check (origin in ('app', 'form_webhook', 'admin', 'function')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 9) FOREIGN KEY LATE BIND
-- =========================================================

alter table public.period_franchise_status
  drop constraint if exists period_franchise_status_current_submission_id_fkey;

alter table public.period_franchise_status
  add constraint period_franchise_status_current_submission_id_fkey
  foreign key (current_submission_id)
  references public.submissions(id)
  on delete set null;

-- =========================================================
-- 10) UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_regionals_updated_at on public.regionals;
create trigger trg_regionals_updated_at
before update on public.regionals
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_franchises_updated_at on public.franchises;
create trigger trg_franchises_updated_at
before update on public.franchises
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_reporting_periods_updated_at on public.reporting_periods;
create trigger trg_reporting_periods_updated_at
before update on public.reporting_periods
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_period_franchise_status_updated_at on public.period_franchise_status;
create trigger trg_period_franchise_status_updated_at
before update on public.period_franchise_status
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
before update on public.events
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_dre_lines_updated_at on public.dre_lines;
create trigger trg_dre_lines_updated_at
before update on public.dre_lines
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_submissions_updated_at on public.submissions;
create trigger trg_submissions_updated_at
before update on public.submissions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_submission_input_values_updated_at on public.submission_input_values;
create trigger trg_submission_input_values_updated_at
before update on public.submission_input_values
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_submission_kpis_updated_at on public.submission_kpis;
create trigger trg_submission_kpis_updated_at
before update on public.submission_kpis
for each row execute procedure public.set_updated_at();

-- =========================================================
-- 11) INDEXES
-- =========================================================

create index if not exists idx_user_roles_profile_id on public.user_roles(profile_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);
create index if not exists idx_user_scopes_profile_id on public.user_scopes(profile_id);
create index if not exists idx_user_scopes_franchise_id on public.user_scopes(franchise_id);
create index if not exists idx_user_scopes_regional_id on public.user_scopes(regional_id);
create index if not exists idx_franchises_regional_id on public.franchises(regional_id);
create index if not exists idx_franchises_status on public.franchises(status);
create index if not exists idx_reporting_periods_status on public.reporting_periods(status);
create index if not exists idx_period_franchise_status_franchise_id on public.period_franchise_status(franchise_id);
create index if not exists idx_events_franchise_id on public.events(franchise_id);
create index if not exists idx_events_reporting_period_id on public.events(reporting_period_id);
create index if not exists idx_dre_lines_section_id on public.dre_lines(section_id);
create index if not exists idx_dre_lines_line_type on public.dre_lines(line_type);
create index if not exists idx_submissions_franchise_id on public.submissions(franchise_id);
create index if not exists idx_submissions_reporting_period_id on public.submissions(reporting_period_id);
create index if not exists idx_submissions_status on public.submissions(status);
create index if not exists idx_submissions_franchise_period on public.submissions(franchise_id, reporting_period_id);
create index if not exists idx_submission_input_values_dre_line_id on public.submission_input_values(dre_line_id);
create index if not exists idx_submission_calculated_values_dre_line_id on public.submission_calculated_values(dre_line_id);
create index if not exists idx_submission_validation_results_submission_id on public.submission_validation_results(submission_id);
create index if not exists idx_submission_validation_results_status on public.submission_validation_results(status);
create index if not exists idx_audit_log_table_name on public.audit_log(table_name);
create index if not exists idx_audit_log_record_id on public.audit_log(record_id);
create index if not exists idx_audit_log_performed_at on public.audit_log(performed_at);

commit;
