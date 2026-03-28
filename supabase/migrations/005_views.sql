-- =========================================================
-- FEBRACIS | MIGRATION 005: VIEWS
-- =========================================================

begin;

-- =========================================================
-- View: Submissão corrente por franquia/período
-- =========================================================

create or replace view public.vw_current_submissions
with (security_invoker = true) as
select
  s.id as submission_id,
  s.franchise_id,
  s.reporting_period_id,
  s.version_number,
  s.status,
  s.submitted_by,
  s.submitted_at,
  s.created_at,
  f.trade_name as franchise_name,
  f.code as franchise_code,
  f.regional_id,
  r.name as regional_name,
  rp.label as period_label,
  rp.year as period_year,
  rp.month as period_month
from public.submissions s
join public.franchises f on f.id = s.franchise_id
join public.regionals r on r.id = f.regional_id
join public.reporting_periods rp on rp.id = s.reporting_period_id
where s.status != 'superseded'
  and s.version_number = (
    select max(s2.version_number)
    from public.submissions s2
    where s2.franchise_id = s.franchise_id
      and s2.reporting_period_id = s.reporting_period_id
      and s2.status != 'superseded'
  );

-- =========================================================
-- View: DRE completa (inputs + calculados) por submissão
-- =========================================================

create or replace view public.vw_submission_dre_statement
with (security_invoker = true) as
select
  s.id as submission_id,
  s.franchise_id,
  s.reporting_period_id,
  ds.code as section_code,
  ds.name as section_name,
  ds.display_order as section_order,
  dl.code as line_code,
  dl.name as line_name,
  dl.line_type,
  dl.display_order as line_order,
  coalesce(siv.value_currency, scv.value_currency) as value_currency,
  case
    when dl.line_type = 'input' and siv.value_currency is not null and sk.gross_revenue > 0
    then round((siv.value_currency / sk.gross_revenue * 100)::numeric, 2)
    else scv.percent_of_gross_revenue
  end as percent_of_gross_revenue
from public.submissions s
cross join public.dre_lines dl
join public.dre_sections ds on ds.id = dl.section_id
left join public.submission_input_values siv
  on siv.submission_id = s.id and siv.dre_line_id = dl.id
left join public.submission_calculated_values scv
  on scv.submission_id = s.id and scv.dre_line_id = dl.id
left join public.submission_kpis sk on sk.submission_id = s.id
where dl.is_active = true
order by ds.display_order, dl.display_order;

-- =========================================================
-- View: Dashboard da Franquia
-- =========================================================

create or replace view public.vw_franchise_dashboard
with (security_invoker = true) as
select
  cs.submission_id,
  cs.franchise_id,
  cs.franchise_name,
  cs.franchise_code,
  cs.regional_id,
  cs.regional_name,
  cs.period_label,
  cs.period_year,
  cs.period_month,
  cs.status as submission_status,
  sk.gross_revenue,
  sk.mc1,
  sk.mc2,
  sk.ebitda_1,
  sk.ebitda_2,
  sk.marketing_pct,
  sk.default_pct,
  sk.tax_pct,
  case when sk.gross_revenue > 0 then round((sk.mc1 / sk.gross_revenue * 100)::numeric, 2) else 0 end as mc1_pct,
  case when sk.gross_revenue > 0 then round((sk.mc2 / sk.gross_revenue * 100)::numeric, 2) else 0 end as mc2_pct,
  case when sk.gross_revenue > 0 then round((sk.ebitda_1 / sk.gross_revenue * 100)::numeric, 2) else 0 end as ebitda1_pct,
  case when sk.gross_revenue > 0 then round((sk.ebitda_2 / sk.gross_revenue * 100)::numeric, 2) else 0 end as ebitda2_pct
from public.vw_current_submissions cs
left join public.submission_kpis sk on sk.submission_id = cs.submission_id;

-- =========================================================
-- View: Dashboard Regional (agregado)
-- =========================================================

create or replace view public.vw_regional_dashboard
with (security_invoker = true) as
select
  fd.regional_id,
  fd.regional_name,
  fd.period_year,
  fd.period_month,
  fd.period_label,
  count(distinct fd.franchise_id) as total_franchises,
  count(distinct case when fd.submission_status = 'approved' then fd.franchise_id end) as approved_count,
  count(distinct case when fd.submission_status in ('submitted', 'under_review') then fd.franchise_id end) as pending_count,
  sum(fd.gross_revenue) as total_gross_revenue,
  sum(fd.mc1) as total_mc1,
  sum(fd.mc2) as total_mc2,
  sum(fd.ebitda_1) as total_ebitda_1,
  sum(fd.ebitda_2) as total_ebitda_2,
  avg(fd.mc1_pct) as avg_mc1_pct,
  avg(fd.mc2_pct) as avg_mc2_pct,
  avg(fd.ebitda1_pct) as avg_ebitda1_pct,
  avg(fd.ebitda2_pct) as avg_ebitda2_pct,
  avg(fd.marketing_pct) as avg_marketing_pct,
  avg(fd.default_pct) as avg_default_pct
from public.vw_franchise_dashboard fd
group by fd.regional_id, fd.regional_name, fd.period_year, fd.period_month, fd.period_label;

-- =========================================================
-- View: Dashboard da Rede (consolidado holding)
-- =========================================================

create or replace view public.vw_network_dashboard
with (security_invoker = true) as
select
  fd.period_year,
  fd.period_month,
  fd.period_label,
  count(distinct fd.franchise_id) as total_franchises,
  count(distinct fd.regional_id) as total_regionals,
  count(distinct case when fd.submission_status = 'approved' then fd.franchise_id end) as approved_count,
  count(distinct case when fd.submission_status in ('draft', 'pending_adjustment') then fd.franchise_id end) as pending_count,
  sum(fd.gross_revenue) as total_gross_revenue,
  sum(fd.mc1) as total_mc1,
  sum(fd.mc2) as total_mc2,
  sum(fd.ebitda_1) as total_ebitda_1,
  sum(fd.ebitda_2) as total_ebitda_2,
  avg(fd.mc1_pct) as avg_mc1_pct,
  avg(fd.ebitda2_pct) as avg_ebitda2_pct,
  min(fd.ebitda2_pct) as min_ebitda2_pct,
  max(fd.ebitda2_pct) as max_ebitda2_pct
from public.vw_franchise_dashboard fd
group by fd.period_year, fd.period_month, fd.period_label;

-- =========================================================
-- View: Fila de revisão (controladoria)
-- =========================================================

create or replace view public.vw_pending_reviews
with (security_invoker = true) as
select
  cs.submission_id,
  cs.franchise_id,
  cs.franchise_name,
  cs.franchise_code,
  cs.regional_name,
  cs.period_label,
  cs.status as submission_status,
  cs.submitted_at,
  sk.gross_revenue,
  sk.ebitda_2,
  case when sk.gross_revenue > 0 then round((sk.ebitda_2 / sk.gross_revenue * 100)::numeric, 2) else 0 end as ebitda2_pct,
  (select count(*) from public.submission_issues si
   where si.submission_id = cs.submission_id and si.status = 'open') as open_issues_count
from public.vw_current_submissions cs
left join public.submission_kpis sk on sk.submission_id = cs.submission_id
where cs.status in ('submitted', 'under_review');

commit;
