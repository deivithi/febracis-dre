-- =========================================================
-- FEBRACIS | MIGRATION 006: AUDIT TRIGGERS
-- =========================================================

begin;

-- =========================================================
-- Generic audit trigger function
-- =========================================================

create or replace function public.fn_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (
      table_name, record_id, action, old_data, new_data,
      performed_by, origin
    ) values (
      TG_TABLE_NAME,
      new.id,
      'insert',
      null,
      to_jsonb(new),
      auth.uid(),
      'app'
    );
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into public.audit_log (
      table_name, record_id, action, old_data, new_data,
      performed_by, origin
    ) values (
      TG_TABLE_NAME,
      new.id,
      case
        when TG_TABLE_NAME = 'submissions' and old.status is distinct from new.status
        then 'status_change'
        else 'update'
      end,
      to_jsonb(old),
      to_jsonb(new),
      auth.uid(),
      'app'
    );
    return new;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (
      table_name, record_id, action, old_data, new_data,
      performed_by, origin
    ) values (
      TG_TABLE_NAME,
      old.id,
      'delete',
      to_jsonb(old),
      null,
      auth.uid(),
      'app'
    );
    return old;
  end if;
  return null;
end;
$$;

-- =========================================================
-- Apply audit triggers to critical tables
-- =========================================================

drop trigger if exists trg_audit_submissions on public.submissions;
create trigger trg_audit_submissions
after insert or update or delete on public.submissions
for each row execute function public.fn_audit_trigger();

drop trigger if exists trg_audit_submission_input_values on public.submission_input_values;
create trigger trg_audit_submission_input_values
after insert or update or delete on public.submission_input_values
for each row execute function public.fn_audit_trigger();

drop trigger if exists trg_audit_submission_calculated_values on public.submission_calculated_values;
create trigger trg_audit_submission_calculated_values
after insert or update or delete on public.submission_calculated_values
for each row execute function public.fn_audit_trigger();

drop trigger if exists trg_audit_franchises on public.franchises;
create trigger trg_audit_franchises
after insert or update or delete on public.franchises
for each row execute function public.fn_audit_trigger();

drop trigger if exists trg_audit_regionals on public.regionals;
create trigger trg_audit_regionals
after insert or update or delete on public.regionals
for each row execute function public.fn_audit_trigger();

drop trigger if exists trg_audit_user_roles on public.user_roles;
create trigger trg_audit_user_roles
after insert or update or delete on public.user_roles
for each row execute function public.fn_audit_trigger();

drop trigger if exists trg_audit_user_scopes on public.user_scopes;
create trigger trg_audit_user_scopes
after insert or update or delete on public.user_scopes
for each row execute function public.fn_audit_trigger();

drop trigger if exists trg_audit_reporting_periods on public.reporting_periods;
create trigger trg_audit_reporting_periods
after insert or update or delete on public.reporting_periods
for each row execute function public.fn_audit_trigger();

commit;
