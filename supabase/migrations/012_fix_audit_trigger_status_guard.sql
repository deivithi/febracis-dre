-- =========================================================
-- FEBRACIS | MIGRATION 012: AUDIT TRIGGER STATUS GUARD
-- =========================================================

begin;

create or replace function public.fn_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text := 'update';
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
    if TG_TABLE_NAME = 'submissions' then
      v_action := case
        when old.status is distinct from new.status then 'status_change'
        else 'update'
      end;
    end if;

    insert into public.audit_log (
      table_name, record_id, action, old_data, new_data,
      performed_by, origin
    ) values (
      TG_TABLE_NAME,
      new.id,
      v_action,
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

commit;
