begin;

drop function if exists public.fn_agent_weekly_feedback_digest(uuid);

drop index if exists public.idx_agent_messages_verify_learn;
drop index if exists public.idx_agent_messages_payload_feedback;

-- Restaura função histórico como SECURITY DEFINER (equiv. migration 023) para rollback limpo

drop function if exists public.fn_agent_historical_dre_context(uuid, uuid, integer);

drop view if exists public.vw_agent_historical_dre_context cascade;

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

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

revoke all on function public.fn_agent_historical_dre_context(uuid, uuid, integer) from public;
grant execute on function public.fn_agent_historical_dre_context(uuid, uuid, integer) to authenticated;
grant execute on function public.fn_agent_historical_dre_context(uuid, uuid, integer) to service_role;

drop index if exists public.idx_assistant_persona_memory_kind_lookup;
drop index if exists public.idx_assistant_persona_memory_franchise_owner;

commit;
