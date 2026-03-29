-- =========================================================
-- FEBRACIS | MIGRATION 013: ACCESS DIRECTORY EFFECTIVE SCOPE
-- =========================================================

begin;

create or replace view public.vw_user_access_directory
with (security_invoker = true) as
select
  p.id as profile_id,
  p.full_name,
  p.email,
  p.status as profile_status,
  p.created_at,
  p.updated_at,
  r.code as role_code,
  r.name as role_name,
  coalesce(
    us.scope_type,
    case
      when r.code = 'system_admin' then 'network'
      else null
    end
  ) as scope_type,
  us.franchise_id,
  coalesce(us.regional_id, f.regional_id) as regional_id,
  f.trade_name as franchise_name,
  f.code as franchise_code,
  coalesce(reg_scope.name, reg_franchise.name) as regional_name,
  coalesce(reg_scope.code, reg_franchise.code) as regional_code
from public.profiles p
left join lateral (
  select ur.role_id
  from public.user_roles ur
  where ur.profile_id = p.id
  order by ur.created_at desc
  limit 1
) latest_role on true
left join public.roles r on r.id = latest_role.role_id
left join lateral (
  select us.id, us.scope_type, us.franchise_id, us.regional_id
  from public.user_scopes us
  where us.profile_id = p.id
  order by us.created_at desc
  limit 1
) us on true
left join public.franchises f on f.id = us.franchise_id
left join public.regionals reg_scope on reg_scope.id = us.regional_id
left join public.regionals reg_franchise on reg_franchise.id = f.regional_id;

commit;
