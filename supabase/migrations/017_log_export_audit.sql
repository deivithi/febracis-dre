-- RPC para auditoria de exportações (PDF/Excel).
-- INSERT direto em audit_log foi revogado para authenticated na migration 016;
-- esta função roda como security definer e registra evento sintético.

begin;

create or replace function public.log_export_audit(
  p_report_type text,
  p_filters jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    performed_by,
    origin
  )
  values (
    'export_report',
    gen_random_uuid(),
    'insert',
    null,
    jsonb_build_object(
      'report_type', p_report_type,
      'filters', coalesce(p_filters, '{}'::jsonb),
      'exported_at', to_jsonb(now())
    ),
    uid,
    'app'
  );
end;
$$;

comment on function public.log_export_audit(text, jsonb) is
  'Regista exportação PDF/XLSX no audit_log (após migration 016 — INSERT público bloqueado).';

grant execute on function public.log_export_audit(text, jsonb) to authenticated;

commit;
