begin;

-- =========================================================
-- Memória persona cross-sessão (containment: franchise_id + profile_id)
-- =========================================================

create table if not exists public.assistant_persona_memory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  kind text not null check (kind in (
    'preference', 'fact', 'recurrent_doubt', 'pace', 'dre_ideal_state'
  )),
  key text not null,
  value jsonb not null,
  confidence numeric not null default 0.6
    check (confidence >= 0 and confidence <= 1),
  source_message_id uuid references public.agent_messages(id) on delete set null,
  source_submission_id uuid references public.submissions(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_seen_at timestamptz not null default now(),
  unique (profile_id, franchise_id, kind, key)
);

create index if not exists idx_assistant_persona_memory_profile_franchise
  on public.assistant_persona_memory(profile_id, franchise_id)
  where deleted_at is null;

create index if not exists idx_assistant_persona_memory_expires
  on public.assistant_persona_memory(expires_at)
  where deleted_at is null;

drop trigger if exists trg_assistant_persona_memory_updated_at on public.assistant_persona_memory;
create trigger trg_assistant_persona_memory_updated_at
before update on public.assistant_persona_memory
for each row execute procedure public.set_updated_at();

alter table public.assistant_persona_memory enable row level security;

drop policy if exists "assistant_persona_select_scope" on public.assistant_persona_memory;
create policy "assistant_persona_select_scope"
on public.assistant_persona_memory for select to authenticated
using (
  profile_id = auth.uid()
  and public.can_access_franchise(franchise_id)
  and deleted_at is null
);

drop policy if exists "assistant_persona_insert_owner" on public.assistant_persona_memory;
create policy "assistant_persona_insert_owner"
on public.assistant_persona_memory for insert to authenticated
with check (
  profile_id = auth.uid()
  and public.can_access_franchise(franchise_id)
);

drop policy if exists "assistant_persona_update_owner" on public.assistant_persona_memory;
create policy "assistant_persona_update_owner"
on public.assistant_persona_memory for update to authenticated
using (
  profile_id = auth.uid()
  and public.can_access_franchise(franchise_id)
)
with check (
  profile_id = auth.uid()
  and public.can_access_franchise(franchise_id)
);

drop policy if exists "assistant_persona_delete_owner" on public.assistant_persona_memory;
create policy "assistant_persona_delete_owner"
on public.assistant_persona_memory for delete to authenticated
using (
  profile_id = auth.uid()
  and public.can_access_franchise(franchise_id)
);

-- =========================================================
-- FTS em mensagens do assistente (cross-sessão na mesma franquia)
-- =========================================================

create index if not exists idx_agent_messages_content_fts
  on public.agent_messages
  using gin (to_tsvector('portuguese', content));

-- =========================================================
-- RPC: histórico de DREs aprovadas (mesma franquia, competências anteriores)
-- =========================================================

create or replace function public.fn_agent_historical_dre_context(
  p_franchise_id uuid,
  p_current_reporting_period_id uuid,
  p_months_back integer default 3
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_rows jsonb := '[]'::jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Nao autenticado';
  end if;

  if not public.can_access_franchise(p_franchise_id) then
    raise exception 'Acesso negado a franquia';
  end if;

  if p_months_back < 1 or p_months_back > 12 then
    raise exception 'p_months_back invalido';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'period_ym', h.period_ym,
        'period_year', h.period_year,
        'period_month', h.period_month,
        'submission_id', h.submission_id,
        'gross_revenue', h.gross_revenue,
        'marketing_total_approx', h.marketing_total_approx,
        'mc1', h.mc1,
        'mc2', h.mc2,
        'ebitda_1', h.ebitda_1,
        'ebitda_2', h.ebitda_2
      )
      order by h.period_year desc, h.period_month desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select *
    from (
      select distinct on (s.reporting_period_id)
        rp.label as period_ym,
        rp.year as period_year,
        rp.month as period_month,
        s.id as submission_id,
        sk.gross_revenue,
        case
          when sk.gross_revenue > 0 and sk.marketing_pct is not null
          then round((sk.gross_revenue * sk.marketing_pct / 100)::numeric, 2)
          else null
        end as marketing_total_approx,
        sk.mc1,
        sk.mc2,
        sk.ebitda_1,
        sk.ebitda_2
      from public.submissions s
      join public.reporting_periods rp on rp.id = s.reporting_period_id
      left join public.submission_kpis sk on sk.submission_id = s.id
      where s.franchise_id = p_franchise_id
        and s.reporting_period_id <> p_current_reporting_period_id
        and s.status = 'approved'
      order by s.reporting_period_id, s.version_number desc
    ) u
    order by u.period_year desc, u.period_month desc
    limit p_months_back
  ) h;

  return v_rows;
end;
$$;

revoke all on function public.fn_agent_historical_dre_context(uuid, uuid, integer) from public;
grant execute on function public.fn_agent_historical_dre_context(uuid, uuid, integer) to authenticated;
grant execute on function public.fn_agent_historical_dre_context(uuid, uuid, integer) to service_role;

-- =========================================================
-- RPC: busca textual em histórico (dados não confiáveis no prompt)
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
security definer
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
