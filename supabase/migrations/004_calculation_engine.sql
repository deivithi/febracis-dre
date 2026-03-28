-- =========================================================
-- FEBRACIS | MIGRATION 004: CALCULATION ENGINE
-- =========================================================
-- Motor de cálculo da DRE — tradução fiel da planilha modelo
-- Lógica: inputs → subtotais → margens → EBITDA

begin;

-- =========================================================
-- fn_calculate_submission_dre
-- Calcula todos os valores derivados de uma submissão
-- =========================================================

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
  -- Input values
  v_gross_revenue numeric(14,2) := 0;
  v_discounts_returns numeric(14,2) := 0;
  v_split_holding numeric(14,2) := 0;
  v_cispay numeric(14,2) := 0;
  v_ed_commission numeric(14,2) := 0;
  v_franchise_fee numeric(14,2) := 0;
  v_event_space_rent numeric(14,2) := 0;
  v_event_decoration numeric(14,2) := 0;
  v_event_food numeric(14,2) := 0;
  v_event_gifts numeric(14,2) := 0;
  v_event_audiovisual numeric(14,2) := 0;
  v_event_logistics numeric(14,2) := 0;
  v_marketing_digital numeric(14,2) := 0;
  v_marketing_regional numeric(14,2) := 0;
  v_default_gross numeric(14,2) := 0;
  v_default_recovery numeric(14,2) := 0;
  v_people_total numeric(14,2) := 0;
  v_cto_total numeric(14,2) := 0;
  v_utilities_services numeric(14,2) := 0;
  v_general_expenses numeric(14,2) := 0;
  v_taxes numeric(14,2) := 0;
  -- Calculated values
  v_deductions_total numeric(14,2);
  v_mc1 numeric(14,2);
  v_event_expenses_total numeric(14,2);
  v_variable_expenses_total numeric(14,2);
  v_marketing_total numeric(14,2);
  v_default_net numeric(14,2);
  v_mc2 numeric(14,2);
  v_ebitda_1 numeric(14,2);
  v_ebitda_2 numeric(14,2);
  v_result jsonb;
begin
  -- Verificar que a submissão existe
  select s.franchise_id into v_franchise_id
  from public.submissions s
  where s.id = p_submission_id;

  if v_franchise_id is null then
    raise exception 'Submissão não encontrada: %', p_submission_id;
  end if;

  -- Obter versão ativa das regras de cálculo
  select crv.id into v_rule_version_id
  from public.calculation_rule_versions crv
  where crv.is_active = true
  order by crv.effective_from desc
  limit 1;

  -- =========================================================
  -- COLETAR INPUTS (com coalesce para zero se não preenchido)
  -- =========================================================

  select coalesce(siv.value_currency, 0) into v_gross_revenue
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'gross_revenue';

  select coalesce(siv.value_currency, 0) into v_discounts_returns
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'discounts_returns';

  select coalesce(siv.value_currency, 0) into v_split_holding
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'split_holding';

  select coalesce(siv.value_currency, 0) into v_cispay
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'cispay';

  select coalesce(siv.value_currency, 0) into v_ed_commission
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'ed_commission';

  select coalesce(siv.value_currency, 0) into v_franchise_fee
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'franchise_fee';

  select coalesce(siv.value_currency, 0) into v_event_space_rent
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'event_space_rent';

  select coalesce(siv.value_currency, 0) into v_event_decoration
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'event_decoration';

  select coalesce(siv.value_currency, 0) into v_event_food
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'event_food';

  select coalesce(siv.value_currency, 0) into v_event_gifts
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'event_gifts';

  select coalesce(siv.value_currency, 0) into v_event_audiovisual
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'event_audiovisual';

  select coalesce(siv.value_currency, 0) into v_event_logistics
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'event_logistics';

  select coalesce(siv.value_currency, 0) into v_marketing_digital
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'marketing_digital';

  select coalesce(siv.value_currency, 0) into v_marketing_regional
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'marketing_regional';

  select coalesce(siv.value_currency, 0) into v_default_gross
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'default_gross';

  select coalesce(siv.value_currency, 0) into v_default_recovery
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'default_recovery';

  select coalesce(siv.value_currency, 0) into v_people_total
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'people_total';

  select coalesce(siv.value_currency, 0) into v_cto_total
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'cto_total';

  select coalesce(siv.value_currency, 0) into v_utilities_services
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'utilities_services_total';

  select coalesce(siv.value_currency, 0) into v_general_expenses
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'general_expenses_total';

  select coalesce(siv.value_currency, 0) into v_taxes
  from public.submission_input_values siv
  join public.dre_lines dl on dl.id = siv.dre_line_id
  where siv.submission_id = p_submission_id and dl.code = 'taxes';

  -- =========================================================
  -- CALCULAR — LÓGICA FIEL À PLANILHA
  -- =========================================================

  -- Deduções
  v_deductions_total := v_discounts_returns + v_split_holding + v_cispay
                      + v_ed_commission + v_franchise_fee;

  -- MC1 = RBV - Deduções
  v_mc1 := v_gross_revenue - v_deductions_total;

  -- Despesas de Evento
  v_event_expenses_total := v_event_space_rent + v_event_decoration + v_event_food
                          + v_event_gifts + v_event_audiovisual + v_event_logistics;

  -- Despesas Variáveis = Eventos + Marketing + Inadimplência (para encaixe no fluxo)
  v_marketing_total := v_marketing_digital + v_marketing_regional;
  v_default_net := v_default_gross - v_default_recovery;

  v_variable_expenses_total := v_event_expenses_total + v_marketing_total + v_default_net;

  -- MC2 = MC1 - Despesas Variáveis (Eventos + Marketing + Inadimplência)
  v_mc2 := v_mc1 - v_variable_expenses_total;

  -- EBITDA 1 = MC2 - Estrutura (Pessoas + CTO + Utilidades + Gerais)
  v_ebitda_1 := v_mc2 - v_people_total - v_cto_total
              - v_utilities_services - v_general_expenses;

  -- EBITDA 2 = EBITDA 1 - Impostos
  v_ebitda_2 := v_ebitda_1 - v_taxes;

  -- =========================================================
  -- PERSISTIR RESULTADOS CALCULADOS
  -- =========================================================

  -- Limpar cálculos anteriores desta submissão
  delete from public.submission_calculated_values
  where submission_id = p_submission_id;

  -- Inserir todos os valores calculados
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

  -- =========================================================
  -- ATUALIZAR KPIs
  -- =========================================================

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

  -- Montar resultado
  v_result := jsonb_build_object(
    'submission_id', p_submission_id,
    'gross_revenue', v_gross_revenue,
    'deductions_total', v_deductions_total,
    'mc1', v_mc1,
    'event_expenses_total', v_event_expenses_total,
    'marketing_total', v_marketing_total,
    'default_net', v_default_net,
    'mc2', v_mc2,
    'ebitda_1', v_ebitda_1,
    'ebitda_2', v_ebitda_2,
    'calculated_at', now()
  );

  return v_result;
end;
$$;

-- =========================================================
-- fn_set_submission_status
-- Transição de status com histórico
-- =========================================================

create or replace function public.fn_set_submission_status(
  p_submission_id uuid,
  p_new_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_status text;
begin
  select status into v_current_status
  from public.submissions
  where id = p_submission_id;

  if v_current_status is null then
    raise exception 'Submissão não encontrada: %', p_submission_id;
  end if;

  -- Registrar histórico
  insert into public.submission_status_history (
    submission_id, from_status, to_status, changed_by, reason
  ) values (
    p_submission_id, v_current_status, p_new_status, auth.uid(), p_reason
  );

  -- Atualizar status
  update public.submissions
  set status = p_new_status,
      submitted_at = case when p_new_status = 'submitted' then now() else submitted_at end,
      submitted_by = case when p_new_status = 'submitted' then auth.uid() else submitted_by end
  where id = p_submission_id;

  -- Atualizar period_franchise_status
  update public.period_franchise_status pfs
  set status = p_new_status,
      last_status_change_at = now(),
      current_submission_id = p_submission_id
  from public.submissions s
  where s.id = p_submission_id
    and pfs.franchise_id = s.franchise_id
    and pfs.reporting_period_id = s.reporting_period_id;
end;
$$;

-- =========================================================
-- fn_validate_submission
-- Executa regras de validação ativas
-- =========================================================

create or replace function public.fn_validate_submission(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gross_revenue numeric(14,2);
  v_deductions_total numeric(14,2);
  v_marketing_total numeric(14,2);
  v_default_net numeric(14,2);
  v_taxes numeric(14,2);
  v_results jsonb := '[]'::jsonb;
begin
  -- Obter KPIs calculados
  select gross_revenue, mc1 into v_gross_revenue, v_deductions_total
  from public.submission_kpis
  where submission_id = p_submission_id;

  select marketing_pct, default_pct, tax_pct
  into v_marketing_total, v_default_net, v_taxes
  from public.submission_kpis
  where submission_id = p_submission_id;

  -- Limpar resultados anteriores
  delete from public.submission_validation_results
  where submission_id = p_submission_id;

  -- Validar: RBV obrigatória
  if v_gross_revenue is null or v_gross_revenue <= 0 then
    insert into public.submission_validation_results (
      submission_id, validation_rule_id, status, message
    )
    select p_submission_id, vr.id, 'failed',
           'Receita Bruta de Vendas não preenchida ou zero'
    from public.validation_rules vr where vr.code = 'required_gross_revenue';
  else
    insert into public.submission_validation_results (
      submission_id, validation_rule_id, status, message
    )
    select p_submission_id, vr.id, 'passed', null
    from public.validation_rules vr where vr.code = 'required_gross_revenue';
  end if;

  -- Validar: marketing > 30%
  if v_marketing_total > 30 then
    insert into public.submission_validation_results (
      submission_id, validation_rule_id, status, message
    )
    select p_submission_id, vr.id, 'warning',
           'Marketing representa ' || v_marketing_total || '% da RBV (acima de 30%)'
    from public.validation_rules vr where vr.code = 'marketing_ratio_check';
  end if;

  -- Validar: inadimplência > 15%
  if v_default_net > 15 then
    insert into public.submission_validation_results (
      submission_id, validation_rule_id, status, message
    )
    select p_submission_id, vr.id, 'warning',
           'Inadimplência líquida representa ' || v_default_net || '% da RBV (acima de 15%)'
    from public.validation_rules vr where vr.code = 'default_ratio_check';
  end if;

  -- Validar: impostos > 20%
  if v_taxes > 20 then
    insert into public.submission_validation_results (
      submission_id, validation_rule_id, status, message
    )
    select p_submission_id, vr.id, 'warning',
           'Impostos representam ' || v_taxes || '% da RBV (acima de 20%)'
    from public.validation_rules vr where vr.code = 'taxes_ratio_check';
  end if;

  -- Retornar resultados
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

commit;
