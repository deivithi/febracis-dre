begin;

-- =========================================================
-- 024 — Histórico DRE sob SECURITY INVOKER + digest semanal + índices persona
-- Requer Postgres 15+ (view com security_invoker).
-- =========================================================

-- Índices auxiliares (idempotentes)
create index if not exists idx_assistant_persona_memory_franchise_owner
  on public.assistant_persona_memory(franchise_id, profile_id)
  where deleted_at is null;

create index if not exists idx_assistant_persona_memory_kind_lookup
  on public.assistant_persona_memory(kind, key)
  where deleted_at is null;

create index if not exists idx_agent_messages_payload_feedback
  on public.agent_messages(session_id)
  where (payload ? 'assistant_feedback_capture');

create index if not exists idx_agent_messages_verify_learn
  on public.agent_messages(created_at desc)
  where role = 'system' and content = '[verify_and_learn]';

-- ------------------------------------------------------------
-- Vista: apenas submissões aprovadas — RLS das tabelas base aplica como invoker
-- ------------------------------------------------------------
drop view if exists public.vw_agent_historical_dre_context cascade;

create view public.vw_agent_historical_dre_context
with (security_invoker = true) as
select distinct on (s.reporting_period_id)
  s.franchise_id,
  s.reporting_period_id,
  s.id as submission_id,
  s.version_number,
  rp.label as period_ym,
  rp.year as period_year,
  rp.month as period_month,
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
where s.status = 'approved'
order by s.reporting_period_id, s.version_number desc;

-- ------------------------------------------------------------
-- RPC histórico: SECURITY INVOKER — sem bypass RLS
-- ------------------------------------------------------------
create or replace function public.fn_agent_historical_dre_context(
  p_franchise_id uuid,
  p_current_reporting_period_id uuid,
  p_months_back integer default 3
)
returns jsonb
language plpgsql
stable
security invoker
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
    from public.vw_agent_historical_dre_context v
    where v.franchise_id = p_franchise_id
      and v.reporting_period_id <> p_current_reporting_period_id
    order by v.period_year desc, v.period_month desc
    limit p_months_back
  ) h;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

revoke all on function public.fn_agent_historical_dre_context(uuid, uuid, integer) from public;
grant execute on function public.fn_agent_historical_dre_context(uuid, uuid, integer) to authenticated;
grant execute on function public.fn_agent_historical_dre_context(uuid, uuid, integer) to service_role;

-- ------------------------------------------------------------
-- Digest semanal: feedback declarado pelo utilizador (payload em agent_messages)
-- ------------------------------------------------------------
create or replace function public.fn_agent_weekly_feedback_digest(p_franchise_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_pos int := 0;
  v_neg int := 0;
  v_tot int := 0;
  v_latest timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  if not public.can_access_franchise(p_franchise_id) then
    raise exception 'Acesso negado a franquia';
  end if;

  select count(*) filter (where lower((payload->>'mood')) = 'positivo'),
         count(*) filter (where lower((payload->>'mood')) = 'negativo'),
         count(*),
         max(m.created_at)
    into v_pos, v_neg, v_tot, v_latest
    from public.agent_messages m
    join public.agent_sessions s on s.id = m.session_id
    where s.franchise_id = p_franchise_id
      and s.profile_id = auth.uid()
      and coalesce((m.payload->>'schema')::text, '') = 'assistant_feedback_capture'
      and m.payload ? 'mood'
      and m.created_at >= (now() at time zone 'utc') - interval '7 days';

  return jsonb_strip_nulls(
    jsonb_build_object(
      'window_days', 7,
      'franchise_id', p_franchise_id,
      'positivo_ct', coalesce(v_pos, 0),
      'negativo_ct', coalesce(v_neg, 0),
      'samples_ct', least(coalesce(v_tot, 0), 50),
      'captured_through', case when v_latest is null then null else to_jsonb(to_char(v_latest, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) end
    )
  );
end;
$$;

revoke all on function public.fn_agent_weekly_feedback_digest(uuid) from public;
grant execute on function public.fn_agent_weekly_feedback_digest(uuid) to authenticated;
grant execute on function public.fn_agent_weekly_feedback_digest(uuid) to service_role;

commit;
