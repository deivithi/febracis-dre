-- =========================================================
-- FEBRACIS | MIGRATION 021: Tendência multi-franquia (EBITDA/MC)
-- =========================================================
-- Séries mensais por franquia com valores **apenas** de submissões
-- `approved`, coerente com get_kpi_history / rollups executivos.
-- SECURITY INVOKER + vw_franchise_dashboard preservam RLS (mesmo padrão de fetchDashboardSnapshot).

begin;

create or replace function public.get_franchise_metric_trend(
  p_region_id uuid default null,
  p_franchise_ids uuid[] default null,
  p_months int default 12,
  p_metric text default null
)
returns table (
  franchise_id uuid,
  franchise_name text,
  regional_id uuid,
  period_month date,
  metric_value numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if p_metric is null
     or p_metric not in ('ebitda_1', 'ebitda_2', 'mc1', 'mc2') then
    raise exception 'metric_invalid'
      using errcode = '22023',
      message = 'Métrica inválida para get_franchise_metric_trend (use ebitda_1, ebitda_2, mc1, mc2).';
  end if;

  if p_months < 1 or p_months > 36 then
    raise exception 'months_out_of_range'
      using errcode = '22023',
      message = 'p_months deve estar entre 1 e 36.';
  end if;

  return query
  with scoped as (
    select fd.*
    from public.vw_franchise_dashboard fd
    where (p_region_id is null or fd.regional_id = p_region_id)
      and (
        p_franchise_ids is null
        or cardinality(p_franchise_ids) = 0
        or fd.franchise_id = any (p_franchise_ids)
      )
      and fd.submission_status = 'approved'
  ),
  ranked_periods as (
    select distinct s.period_year, s.period_month
    from scoped s
  ),
  last_n_periods as (
    select rp.period_year, rp.period_month
    from ranked_periods rp
    order by rp.period_year desc, rp.period_month desc
    limit p_months
  ),
  periods_chrono as (
    select ln.period_year, ln.period_month
    from last_n_periods ln
    order by ln.period_year asc, ln.period_month asc
  )
  select
    s.franchise_id,
    s.franchise_name::text,
    s.regional_id,
    make_date(s.period_year, s.period_month, 1)::date as period_month,
    case p_metric
      when 'ebitda_1' then coalesce(s.ebitda_1, 0)::numeric
      when 'ebitda_2' then coalesce(s.ebitda_2, 0)::numeric
      when 'mc1' then coalesce(s.mc1, 0)::numeric
      when 'mc2' then coalesce(s.mc2, 0)::numeric
    end as metric_value
  from periods_chrono pc
  inner join scoped s
    on s.period_year = pc.period_year
    and s.period_month = pc.period_month
  order by pc.period_year asc, pc.period_month asc, s.franchise_name asc;
end;
$$;

comment on function public.get_franchise_metric_trend(uuid, uuid[], integer, text) is
'Tendência por franquia (apenas submissões approved). SECURITY INVOKER + vw_franchise_dashboard.';

grant execute on function public.get_franchise_metric_trend(uuid, uuid[], integer, text) to authenticated;

commit;
