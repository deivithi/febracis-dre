-- =============================================================
-- FEBRACIS | MIGRATION 015: Agent rate limits (assistant DRE API)
-- =============================================================

begin;

create table if not exists public.agent_rate_limits (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (profile_id, window_start)
);

create index if not exists idx_agent_rate_limits_profile_window
  on public.agent_rate_limits (profile_id, window_start desc);

alter table public.agent_rate_limits enable row level security;

drop policy if exists "agent_rate_limits_select_self_or_admin" on public.agent_rate_limits;
create policy "agent_rate_limits_select_self_or_admin"
on public.agent_rate_limits for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "agent_rate_limits_no_direct_write" on public.agent_rate_limits;
create policy "agent_rate_limits_no_direct_write"
on public.agent_rate_limits for all
to authenticated
using (false)
with check (false);

-- Contagem por janela fixa (epoch alinhado a p_window_seconds). Escrita apenas via RPC (security definer).
create or replace function public.fn_agent_rate_check(
  p_limit integer,
  p_window_seconds integer
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_bucket timestamptz;
  v_count integer;
  v_allowed boolean;
  v_retry integer;
begin
  v_profile_id := auth.uid();
  if v_profile_id is null then
    return json_build_object(
      'allowed', false,
      'retryAfterSeconds', 0,
      'reason', 'not_authenticated'
    );
  end if;

  if p_limit < 1 or p_window_seconds < 1 then
    return json_build_object(
      'allowed', true,
      'retryAfterSeconds', 0,
      'reason', 'invalid_params_disabled'
    );
  end if;

  v_bucket := to_timestamp(
    floor(extract(epoch from now())::numeric / p_window_seconds::numeric) * p_window_seconds::numeric
  );

  insert into public.agent_rate_limits (profile_id, window_start, count)
  values (v_profile_id, v_bucket, 1)
  on conflict (profile_id, window_start)
  do update set count = public.agent_rate_limits.count + 1
  returning count into v_count;

  v_allowed := v_count <= p_limit;
  v_retry := case
    when v_allowed then 0
    else greatest(1, p_window_seconds)
  end;

  return json_build_object(
    'allowed', v_allowed,
    'retryAfterSeconds', v_retry,
    'reason', case when v_allowed then 'ok' else 'rate_limited' end
  );
end;
$$;

revoke all on function public.fn_agent_rate_check(integer, integer) from public;
grant execute on function public.fn_agent_rate_check(integer, integer) to authenticated;
grant execute on function public.fn_agent_rate_check(integer, integer) to service_role;

commit;
