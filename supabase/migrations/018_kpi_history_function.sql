-- =========================================================
-- FEBRACIS | MIGRATION 018: Histórico de KPI (sparkline)
-- =========================================================
-- Últimos N períodos com competência visível ao JWT via vw_franchise_dashboard (RLS / security_invoker).
-- Métricas financeiras (RBV, MC1, MC2, EBITDA 2): somente linhas approved (valor coerente com rollups executivos).
-- approved_submission_count: unidades distintas com submission_status = approved na competência.
-- adjustment_pipeline_count: funil revisão + ajuste (submitted, under_review, pending_adjustment).
-- Escopo:
--   p_franchise_id não nulo → série da unidade;
--   caso contrário, p_regional_id não nulo → agrega a regional;
--   ambos nulos → agrega rede visível ao utilizador (holding / controladoria / rede completa permitida pelo RLS).

begin;

create or replace function public.get_kpi_history(
  p_franchise_id uuid default null,
  p_metric text default null,
  p_periods_count int default 6,
  p_regional_id uuid default null
)
returns table (
  period_label text,
  period_year integer,
  period_month integer,
  value numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if p_metric is null
     or p_metric not in (
       'gross_revenue',
       'mc1',
       'mc2',
       'ebitda_2',
       'approved_submission_count',
       'adjustment_pipeline_count'
     ) then
    raise exception 'metric_invalid'
      using errcode = '22023',
      message = 'Métrica inválida para get_kpi_history.';
  end if;

  if p_periods_count < 1 or p_periods_count > 24 then
    raise exception 'periods_out_of_range'
      using errcode = '22023',
      message = 'p_periods_count deve estar entre 1 e 24.';
  end if;

  return query
  with scoped as (
    select fd.*
    from public.vw_franchise_dashboard fd
    where (p_franchise_id is null or fd.franchise_id = p_franchise_id)
      and (
        p_franchise_id is not null
        or p_regional_id is null
        or fd.regional_id = p_regional_id
      )
  ),
  ranked_periods as (
    select distinct s.period_year, s.period_month, s.period_label
    from scoped s
  ),
  last_n_periods as (
    select rp.period_year, rp.period_month, rp.period_label
    from ranked_periods rp
    order by rp.period_year desc, rp.period_month desc
    limit p_periods_count
  ),
  periods_chrono as (
    select ln.period_year, ln.period_month, ln.period_label
    from last_n_periods ln
    order by ln.period_year asc, ln.period_month asc
  )
  select
    pc.period_label::text,
    pc.period_year::integer,
    pc.period_month::integer,
    coalesce(
      case p_metric
        when 'gross_revenue' then
          sum(
            case
              when s.submission_status = 'approved' then coalesce(s.gross_revenue, 0)::numeric
              else 0::numeric
            end
          )
        when 'mc1' then
          sum(
            case
              when s.submission_status = 'approved' then coalesce(s.mc1, 0)::numeric
              else 0::numeric
            end
          )
        when 'mc2' then
          sum(
            case
              when s.submission_status = 'approved' then coalesce(s.mc2, 0)::numeric
              else 0::numeric
            end
          )
        when 'ebitda_2' then
          sum(
            case
              when s.submission_status = 'approved' then coalesce(s.ebitda_2, 0)::numeric
              else 0::numeric
            end
          )
        when 'approved_submission_count' then
          count(distinct case when s.submission_status = 'approved' then s.franchise_id end)::numeric
        when 'adjustment_pipeline_count' then
          count(
            distinct case
              when s.submission_status in ('submitted', 'under_review', 'pending_adjustment') then s.franchise_id
            end
          )::numeric
      end,
      0::numeric
    ) as value
  from periods_chrono pc
  left join scoped s
    on s.period_year = pc.period_year and s.period_month = pc.period_month
  group by pc.period_year, pc.period_month, pc.period_label
  order by pc.period_year asc, pc.period_month asc;
end;
$$;

comment on function public.get_kpi_history(uuid, text, int, uuid) is
'Série cronológica (mais antigo → mais recente) dos últimos N períodos no escopo. SECURITY INVOKER + vw_franchise_dashboard preservam RLS.';

grant execute on function public.get_kpi_history(uuid, text, integer, uuid) to authenticated;

commit;
