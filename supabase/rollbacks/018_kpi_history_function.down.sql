-- Rollback migration 018: remove get_kpi_history

begin;

revoke execute on function public.get_kpi_history(uuid, text, integer, uuid) from authenticated;

drop function if exists public.get_kpi_history(uuid, text, integer, uuid);

commit;
