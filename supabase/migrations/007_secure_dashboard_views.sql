-- =========================================================
-- FEBRACIS | MIGRATION 007: SECURE DASHBOARD VIEWS
-- =========================================================
-- Views no schema público precisam obedecer RLS quando acessadas
-- por clientes autenticados. Em Postgres 15+, usamos security_invoker.

begin;

do $$
begin
  if current_setting('server_version_num')::int >= 150000 then
    execute 'alter view public.vw_current_submissions set (security_invoker = true)';
    execute 'alter view public.vw_submission_dre_statement set (security_invoker = true)';
    execute 'alter view public.vw_franchise_dashboard set (security_invoker = true)';
    execute 'alter view public.vw_regional_dashboard set (security_invoker = true)';
    execute 'alter view public.vw_network_dashboard set (security_invoker = true)';
    execute 'alter view public.vw_pending_reviews set (security_invoker = true)';
  end if;
end $$;

commit;
