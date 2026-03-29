begin;

create or replace function public.is_submission_editable_status(p_status text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_status, '') in ('draft', 'reopened', 'pending_adjustment');
$$;

update public.dre_lines
set
  display_order = 90,
  description = 'Subtotal automático das despesas variáveis informadas pela unidade'
where code = 'variable_expenses_total';

insert into public.dre_lines (
  section_id, code, name, description, line_type, input_mode,
  display_order, is_active, is_editable, affects_dashboard
)
select
  s.id,
  x.code,
  x.name,
  x.description,
  'input',
  'currency',
  x.display_order,
  true,
  true,
  true
from public.dre_sections s
join (
  values
    ('event_expenses', 'event_trainer_cost', 'Custo Treinador', 'Custo do treinador ou facilitador do evento', 5),
    ('variable_expenses', 'variable_card_fees', 'Taxa com Cartões', 'Taxas variáveis de adquirência e meios de pagamento', 10),
    ('variable_expenses', 'variable_logistics', 'Custo Logístico Variável', 'Custos logísticos variáveis fora do bloco de evento', 20),
    ('variable_expenses', 'variable_room_rent', 'Locação de Sala', 'Locações variáveis complementares ao período', 30),
    ('marketing', 'marketing_gifts', 'Brindes de Marketing', 'Brindes e materiais promocionais de marketing', 15),
    ('marketing', 'marketing_offline', 'Marketing Offline', 'Ações offline, mídia local e ativações físicas', 30)
) as x(section_code, code, name, description, display_order)
  on s.code = x.section_code
on conflict (code) do update
set
  section_id = excluded.section_id,
  name = excluded.name,
  description = excluded.description,
  line_type = excluded.line_type,
  input_mode = excluded.input_mode,
  display_order = excluded.display_order,
  is_active = true,
  is_editable = true,
  affects_dashboard = true;

revoke insert, update, delete on public.events from anon, authenticated;
revoke insert, update, delete on public.submissions from anon, authenticated;
revoke insert, update, delete on public.submission_input_values from anon, authenticated;
revoke insert, update, delete on public.submission_attachments from anon, authenticated;
revoke insert, update, delete on public.submission_calculated_values from anon, authenticated;
revoke insert, update, delete on public.submission_kpis from anon, authenticated;
revoke insert, update, delete on public.submission_validation_results from anon, authenticated;
revoke insert, update, delete on public.submission_status_history from anon, authenticated;
revoke insert, update, delete on public.period_franchise_status from anon, authenticated;
revoke insert, update, delete on public.submission_approvals from anon, authenticated;
revoke insert, update, delete on public.submission_issues from anon, authenticated;

create or replace function public.fn_calculate_submission_dre(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_franchise_id uuid;
  v_rule_version_id uuid;
  v_gross_revenue numeric(14,2) := 0;
  v_discounts_returns numeric(14,2) := 0;
  v_split_holding numeric(14,2) := 0;
  v_cispay numeric(14,2) := 0;
  v_ed_commission numeric(14,2) := 0;
  v_franchise_fee numeric(14,2) := 0;
  v_event_trainer_cost numeric(14,2) := 0;
  v_event_space_rent numeric(14,2) := 0;
  v_event_decoration numeric(14,2) := 0;
  v_event_food numeric(14,2) := 0;
  v_event_gifts numeric(14,2) := 0;
  v_event_audiovisual numeric(14,2) := 0;
  v_event_logistics numeric(14,2) := 0;
  v_variable_card_fees numeric(14,2) := 0;
  v_variable_logistics numeric(14,2) := 0;
  v_variable_room_rent numeric(14,2) := 0;
  v_marketing_digital numeric(14,2) := 0;
  v_marketing_gifts numeric(14,2) := 0;
  v_marketing_regional numeric(14,2) := 0;
  v_marketing_offline numeric(14,2) := 0;
  v_default_gross numeric(14,2) := 0;
  v_default_recovery numeric(14,2) := 0;
  v_people_total numeric(14,2) := 0;
  v_cto_total numeric(14,2) := 0;
  v_utilities_services numeric(14,2) := 0;
  v_general_expenses numeric(14,2) := 0;
  v_taxes numeric(14,2) := 0;
  v_deductions_total numeric(14,2);
  v_mc1 numeric(14,2);
  v_event_expenses_total numeric(14,2);
  v_variable_expenses_total numeric(14,2);
  v_marketing_total numeric(14,2);
  v_default_net numeric(14,2);
  v_mc2 numeric(14,2);
  v_ebitda_1 numeric(14,2);
  v_ebitda_2 numeric(14,2);
begin
  select s.franchise_id into v_franchise_id
  from public.submissions s
  where s.id = p_submission_id;

  if v_franchise_id is null then
    raise exception 'Submissao nao encontrada: %', p_submission_id;
  end if;

  select crv.id into v_rule_version_id
  from public.calculation_rule_versions crv
  where crv.is_active = true
  order by crv.effective_from desc
  limit 1;

  select
    coalesce(max(case when dl.code = 'gross_revenue' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'discounts_returns' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'split_holding' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'cispay' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'ed_commission' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'franchise_fee' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'event_trainer_cost' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'event_space_rent' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'event_decoration' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'event_food' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'event_gifts' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'event_audiovisual' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'event_logistics' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'variable_card_fees' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'variable_logistics' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'variable_room_rent' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'marketing_digital' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'marketing_gifts' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'marketing_regional' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'marketing_offline' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'default_gross' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'default_recovery' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'people_total' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'cto_total' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'utilities_services_total' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'general_expenses_total' then siv.value_currency end), 0),
    coalesce(max(case when dl.code = 'taxes' then siv.value_currency end), 0)
  into
    v_gross_revenue, v_discounts_returns, v_split_holding, v_cispay, v_ed_commission, v_franchise_fee,
    v_event_trainer_cost, v_event_space_rent, v_event_decoration, v_event_food, v_event_gifts, v_event_audiovisual, v_event_logistics,
    v_variable_card_fees, v_variable_logistics, v_variable_room_rent,
    v_marketing_digital, v_marketing_gifts, v_marketing_regional, v_marketing_offline,
    v_default_gross, v_default_recovery, v_people_total, v_cto_total, v_utilities_services, v_general_expenses, v_taxes
  from public.dre_lines dl
  left join public.submission_input_values siv
    on siv.dre_line_id = dl.id
   and siv.submission_id = p_submission_id;

  v_deductions_total := v_discounts_returns + v_split_holding + v_cispay + v_ed_commission + v_franchise_fee;
  v_mc1 := v_gross_revenue - v_deductions_total;

  v_event_expenses_total := v_event_trainer_cost + v_event_space_rent + v_event_decoration + v_event_food
    + v_event_gifts + v_event_audiovisual + v_event_logistics;
  v_variable_expenses_total := v_variable_card_fees + v_variable_logistics + v_variable_room_rent;
  v_marketing_total := v_marketing_digital + v_marketing_gifts + v_marketing_regional + v_marketing_offline;
  v_default_net := v_default_gross - v_default_recovery;

  v_mc2 := v_mc1 - v_event_expenses_total - v_variable_expenses_total - v_marketing_total - v_default_net;
  v_ebitda_1 := v_mc2 - v_people_total - v_cto_total - v_utilities_services - v_general_expenses;
  v_ebitda_2 := v_ebitda_1 - v_taxes;

  delete from public.submission_calculated_values
  where submission_id = p_submission_id;

  insert into public.submission_calculated_values (
    submission_id, dre_line_id, calculation_rule_version_id, value_currency, percent_of_gross_revenue
  )
  select
    p_submission_id,
    dl.id,
    v_rule_version_id,
    calc.value,
    case when v_gross_revenue > 0 then round((calc.value / v_gross_revenue * 100)::numeric, 2) else 0 end
  from (values
    ('deductions_total', v_deductions_total),
    ('mc1', v_mc1),
    ('event_expenses_total', v_event_expenses_total),
    ('variable_expenses_total', v_variable_expenses_total),
    ('marketing_total', v_marketing_total),
    ('default_net', v_default_net),
    ('mc2', v_mc2),
    ('ebitda_1', v_ebitda_1),
    ('ebitda_2', v_ebitda_2)
  ) as calc(line_code, value)
  join public.dre_lines dl on dl.code = calc.line_code;

  insert into public.submission_kpis (
    submission_id, gross_revenue, mc1, mc2, ebitda_1, ebitda_2,
    marketing_pct, default_pct, tax_pct
  ) values (
    p_submission_id,
    v_gross_revenue,
    v_mc1,
    v_mc2,
    v_ebitda_1,
    v_ebitda_2,
    case when v_gross_revenue > 0 then round((v_marketing_total / v_gross_revenue * 100)::numeric, 2) else 0 end,
    case when v_gross_revenue > 0 then round((v_default_net / v_gross_revenue * 100)::numeric, 2) else 0 end,
    case when v_gross_revenue > 0 then round((v_taxes / v_gross_revenue * 100)::numeric, 2) else 0 end
  )
  on conflict (submission_id) do update set
    gross_revenue = excluded.gross_revenue,
    mc1 = excluded.mc1,
    mc2 = excluded.mc2,
    ebitda_1 = excluded.ebitda_1,
    ebitda_2 = excluded.ebitda_2,
    marketing_pct = excluded.marketing_pct,
    default_pct = excluded.default_pct,
    tax_pct = excluded.tax_pct,
    updated_at = now();

  return jsonb_build_object(
    'submission_id', p_submission_id,
    'gross_revenue', v_gross_revenue,
    'deductions_total', v_deductions_total,
    'mc1', v_mc1,
    'event_expenses_total', v_event_expenses_total,
    'variable_expenses_total', v_variable_expenses_total,
    'marketing_total', v_marketing_total,
    'default_net', v_default_net,
    'mc2', v_mc2,
    'ebitda_1', v_ebitda_1,
    'ebitda_2', v_ebitda_2,
    'calculated_at', now()
  );
end;
$$;

create or replace function public.fn_validate_submission(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gross_revenue numeric(14,2) := 0;
  v_mc1 numeric(14,2) := 0;
  v_ebitda_2 numeric(14,2) := 0;
  v_marketing_pct numeric(14,2) := 0;
  v_default_pct numeric(14,2) := 0;
  v_tax_pct numeric(14,2) := 0;
  v_deductions_total numeric(14,2) := 0;
  v_results jsonb := '[]'::jsonb;
begin
  select
    coalesce(sk.gross_revenue, 0),
    coalesce(sk.mc1, 0),
    coalesce(sk.ebitda_2, 0),
    coalesce(sk.marketing_pct, 0),
    coalesce(sk.default_pct, 0),
    coalesce(sk.tax_pct, 0)
  into
    v_gross_revenue,
    v_mc1,
    v_ebitda_2,
    v_marketing_pct,
    v_default_pct,
    v_tax_pct
  from public.submission_kpis sk
  where sk.submission_id = p_submission_id;

  select coalesce(scv.value_currency, 0)
  into v_deductions_total
  from public.submission_calculated_values scv
  join public.dre_lines dl on dl.id = scv.dre_line_id
  where scv.submission_id = p_submission_id
    and dl.code = 'deductions_total';

  delete from public.submission_validation_results
  where submission_id = p_submission_id;

  insert into public.submission_validation_results (submission_id, validation_rule_id, status, message)
  select
    p_submission_id,
    vr.id,
    case when v_gross_revenue > 0 then 'passed' else 'failed' end,
    case when v_gross_revenue > 0 then null else 'Receita Bruta de Vendas não preenchida ou zero' end
  from public.validation_rules vr
  where vr.code = 'required_gross_revenue';

  insert into public.submission_validation_results (submission_id, validation_rule_id, status, message)
  select
    p_submission_id,
    vr.id,
    case when v_gross_revenue > 0 then 'passed' else 'failed' end,
    case when v_gross_revenue > 0 then null else 'Receita Bruta de Vendas deve ser maior que zero' end
  from public.validation_rules vr
  where vr.code = 'gross_revenue_positive';

  insert into public.submission_validation_results (submission_id, validation_rule_id, status, message)
  select
    p_submission_id,
    vr.id,
    case when v_deductions_total <= v_gross_revenue then 'passed' else 'failed' end,
    case
      when v_deductions_total <= v_gross_revenue then null
      else 'Total de deduções excede a Receita Bruta de Vendas.'
    end
  from public.validation_rules vr
  where vr.code = 'deductions_not_exceed_revenue';

  insert into public.submission_validation_results (submission_id, validation_rule_id, status, message)
  select
    p_submission_id,
    vr.id,
    case when v_ebitda_2 <= v_mc1 then 'passed' else 'warning' end,
    case
      when v_ebitda_2 <= v_mc1 then null
      else 'EBITDA 2 ficou acima da MC1 e precisa de revisão da controladoria.'
    end
  from public.validation_rules vr
  where vr.code = 'ebitda2_consistency';

  insert into public.submission_validation_results (submission_id, validation_rule_id, status, message)
  select
    p_submission_id,
    vr.id,
    case when v_marketing_pct > 30 then 'warning' else 'passed' end,
    case
      when v_marketing_pct > 30 then 'Marketing representa ' || v_marketing_pct || '% da RBV (acima de 30%)'
      else null
    end
  from public.validation_rules vr
  where vr.code = 'marketing_ratio_check';

  insert into public.submission_validation_results (submission_id, validation_rule_id, status, message)
  select
    p_submission_id,
    vr.id,
    case when v_default_pct > 15 then 'warning' else 'passed' end,
    case
      when v_default_pct > 15 then 'Inadimplência líquida representa ' || v_default_pct || '% da RBV (acima de 15%)'
      else null
    end
  from public.validation_rules vr
  where vr.code = 'default_ratio_check';

  insert into public.submission_validation_results (submission_id, validation_rule_id, status, message)
  select
    p_submission_id,
    vr.id,
    case when v_tax_pct > 20 then 'warning' else 'passed' end,
    case
      when v_tax_pct > 20 then 'Impostos representam ' || v_tax_pct || '% da RBV (acima de 20%)'
      else null
    end
  from public.validation_rules vr
  where vr.code = 'taxes_ratio_check';

  select jsonb_agg(
    jsonb_build_object(
      'rule_code', vr.code,
      'status', svr.status,
      'severity', vr.severity,
      'message', svr.message
    )
  ) into v_results
  from public.submission_validation_results svr
  join public.validation_rules vr on vr.id = svr.validation_rule_id
  where svr.submission_id = p_submission_id;

  return coalesce(v_results, '[]'::jsonb);
end;
$$;

create or replace function public.fn_create_submission_version(
  p_franchise_id uuid,
  p_reporting_period_id uuid,
  p_event_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_submission_id uuid;
  v_existing_status text;
  v_existing_version int;
  v_existing_event_id uuid;
  v_new_submission_id uuid;
  v_new_version int;
begin
  if not public.can_operate_submission(p_franchise_id) then
    raise exception 'Acesso negado para operar a submissao.';
  end if;

  if not exists (
    select 1
    from public.reporting_periods rp
    where rp.id = p_reporting_period_id
      and rp.status in ('open', 'reopened', 'under_review')
  ) then
    raise exception 'Competencia indisponivel para edicao.';
  end if;

  select s.id, s.status, s.version_number, s.event_id
  into v_existing_submission_id, v_existing_status, v_existing_version, v_existing_event_id
  from public.submissions s
  where s.franchise_id = p_franchise_id
    and s.reporting_period_id = p_reporting_period_id
    and s.status != 'superseded'
  order by s.version_number desc
  limit 1;

  if v_existing_submission_id is not null then
    if public.is_submission_editable_status(v_existing_status) then
      if p_event_id is not null and p_event_id is distinct from v_existing_event_id then
        update public.submissions
        set event_id = p_event_id
        where id = v_existing_submission_id;
      end if;

      return jsonb_build_object(
        'submission_id', v_existing_submission_id,
        'version_number', v_existing_version,
        'status', v_existing_status,
        'reused', true
      );
    end if;

    raise exception 'A submissao atual esta bloqueada no status % e nao pode gerar nova versao.', v_existing_status;
  end if;

  select coalesce(max(s.version_number), 0) + 1
  into v_new_version
  from public.submissions s
  where s.franchise_id = p_franchise_id
    and s.reporting_period_id = p_reporting_period_id;

  insert into public.submissions (
    franchise_id, reporting_period_id, event_id, version_number, status, origin, notes
  )
  values (
    p_franchise_id,
    p_reporting_period_id,
    p_event_id,
    v_new_version,
    'draft',
    case when public.is_admin() then 'admin_entry' else 'internal_app' end,
    null
  )
  returning id into v_new_submission_id;

  insert into public.period_franchise_status (
    reporting_period_id, franchise_id, status, current_submission_id, last_status_change_at
  )
  values (
    p_reporting_period_id, p_franchise_id, 'draft', v_new_submission_id, now()
  )
  on conflict (reporting_period_id, franchise_id) do update
  set
    status = 'draft',
    current_submission_id = excluded.current_submission_id,
    last_status_change_at = now(),
    updated_at = now();

  insert into public.submission_status_history (
    submission_id, from_status, to_status, changed_by, reason
  )
  values (
    v_new_submission_id, null, 'draft', auth.uid(), 'Nova versao criada para a competencia.'
  );

  perform public.fn_calculate_submission_dre(v_new_submission_id);
  perform public.fn_validate_submission(v_new_submission_id);

  return jsonb_build_object(
    'submission_id', v_new_submission_id,
    'version_number', v_new_version,
    'status', 'draft',
    'reused', false
  );
end;
$$;

create or replace function public.fn_review_submission(
  p_submission_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if not public.can_manage_review() then
    raise exception 'Acesso negado para revisar submissao.';
  end if;

  select status into v_status
  from public.submissions
  where id = p_submission_id;

  if v_status is null then
    raise exception 'Submissao nao encontrada: %', p_submission_id;
  end if;

  if p_action = 'start_review' then
    if v_status != 'submitted' then
      raise exception 'Submissao so pode entrar em revisao a partir de submitted. Status atual: %', v_status;
    end if;

    perform public.fn_set_submission_status(
      p_submission_id,
      'under_review',
      coalesce(p_reason, 'Submissao assumida pela controladoria.')
    );

    return jsonb_build_object(
      'submission_id', p_submission_id,
      'status', 'under_review',
      'message', 'Submissao marcada como em revisao.'
    );
  end if;

  if p_action = 'approve' then
    if v_status not in ('submitted', 'under_review') then
      raise exception 'Submissao so pode ser aprovada quando estiver enviada ou em revisao. Status atual: %', v_status;
    end if;

    insert into public.submission_approvals (
      submission_id, approval_step, approved_by, approved_at, decision, notes
    )
    values (
      p_submission_id, 'controller_review', auth.uid(), now(), 'approved', p_reason
    );

    update public.submission_issues
    set
      status = 'resolved',
      resolved_by = auth.uid(),
      resolved_at = now()
    where submission_id = p_submission_id
      and status in ('open', 'in_progress');

    perform public.fn_set_submission_status(
      p_submission_id,
      'approved',
      coalesce(p_reason, 'Submissao aprovada pela controladoria.')
    );

    return jsonb_build_object(
      'submission_id', p_submission_id,
      'status', 'approved',
      'message', 'Submissao aprovada com sucesso.'
    );
  end if;

  if p_action = 'request_adjustment' then
    if v_status not in ('submitted', 'under_review') then
      raise exception 'Submissao so pode voltar para ajuste quando estiver enviada ou em revisao. Status atual: %', v_status;
    end if;

    if coalesce(nullif(trim(p_reason), ''), '') = '' then
      raise exception 'Motivo obrigatorio para devolver a submissao.';
    end if;

    insert into public.submission_issues (
      submission_id, issue_type, severity, description, status, opened_by, opened_at
    )
    values (
      p_submission_id, 'review_adjustment', 'medium', p_reason, 'open', auth.uid(), now()
    );

    perform public.fn_set_submission_status(p_submission_id, 'pending_adjustment', p_reason);

    return jsonb_build_object(
      'submission_id', p_submission_id,
      'status', 'pending_adjustment',
      'message', 'Submissao devolvida para ajuste.'
    );
  end if;

  raise exception 'Acao de revisao invalida: %', p_action;
end;
$$;

commit;
