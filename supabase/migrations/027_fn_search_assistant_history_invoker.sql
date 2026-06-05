begin;

-- =========================================================
-- 027 — fn_search_assistant_history: SECURITY DEFINER -> SECURITY INVOKER
-- Fecha os advisors anon/authenticated_security_definer_function_executable.
-- A função já filtra por profile_id = auth.uid() + can_access_franchise();
-- como INVOKER, a RLS de agent_messages/agent_sessions (014) reforça o
-- isolamento por pessoa sem depender do bypass de SECURITY DEFINER.
-- Alinha com fn_agent_historical_dre_context (migration 024), que já é INVOKER.
-- Postgres 15+ (search_path vazio + INVOKER).
-- =========================================================

create or replace function public.fn_search_assistant_history(
  p_franchise_id uuid,
  p_query text,
  p_limit integer default 3
)
returns table (
  content_excerpt text,
  session_id uuid,
  message_created_at timestamptz,
  rank real
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid;
  v_lim int;
  v_q tsquery;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Nao autenticado';
  end if;

  if not public.can_access_franchise(p_franchise_id) then
    raise exception 'Acesso negado a franquia';
  end if;

  v_lim := least(greatest(coalesce(p_limit, 3), 1), 10);

  if p_query is null or btrim(p_query) = '' then
    return;
  end if;

  v_q := plainto_tsquery('portuguese', p_query);

  return query
  select
    left(m.content, 480) as content_excerpt,
    m.session_id,
    m.created_at as message_created_at,
    ts_rank(to_tsvector('portuguese', m.content), v_q) as rank
  from public.agent_messages m
  join public.agent_sessions s on s.id = m.session_id
  where s.profile_id = v_uid
    and s.franchise_id = p_franchise_id
    and m.role in ('user', 'assistant')
    and to_tsvector('portuguese', m.content) @@ v_q
  order by ts_rank(to_tsvector('portuguese', m.content), v_q) desc, m.created_at desc
  limit v_lim;
end;
$$;

revoke all on function public.fn_search_assistant_history(uuid, text, integer) from public;
grant execute on function public.fn_search_assistant_history(uuid, text, integer) to authenticated;
grant execute on function public.fn_search_assistant_history(uuid, text, integer) to service_role;

commit;
