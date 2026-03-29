-- =========================================================
-- FEBRACIS | MIGRATION 008: DEMO ADMIN TOOLS
-- =========================================================
-- Funcoes administrativas para preparar e zerar o ambiente
-- de demonstracao sem depender de scripts manuais.
-- =========================================================

begin;

create or replace function public.fn_admin_reset_demo_environment()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_demo_franchise_ids uuid[] := '{}'::uuid[];
  v_demo_regional_ids uuid[] := '{}'::uuid[];
  v_deleted_submissions int := 0;
  v_deleted_franchises int := 0;
  v_deleted_regionals int := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem zerar o ambiente de demonstracao.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
    into v_demo_franchise_ids
  from public.franchises
  where code like 'DEMO-%';

  select coalesce(array_agg(id), '{}'::uuid[])
    into v_demo_regional_ids
  from public.regionals
  where code like 'DEMO-%';

  delete from public.user_scopes
  where franchise_id = any(v_demo_franchise_ids)
     or regional_id = any(v_demo_regional_ids);

  delete from public.audit_log
  where record_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
    union
    select id
    from public.events
    where franchise_id = any(v_demo_franchise_ids)
       or name like 'DEMO:%'
    union
    select unnest(v_demo_franchise_ids)
    union
    select unnest(v_demo_regional_ids)
    union
    select id
    from public.reporting_periods
    where year = 2026
      and month in (2, 3)
  );

  delete from public.submission_approvals
  where submission_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
  );

  delete from public.submission_issues
  where submission_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
  );

  delete from public.submission_validation_results
  where submission_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
  );

  delete from public.submission_status_history
  where submission_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
  );

  delete from public.submission_attachments
  where submission_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
  );

  delete from public.submission_kpis
  where submission_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
  );

  delete from public.submission_calculated_values
  where submission_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
  );

  delete from public.submission_input_values
  where submission_id in (
    select id
    from public.submissions
    where franchise_id = any(v_demo_franchise_ids)
  );

  delete from public.submissions
  where franchise_id = any(v_demo_franchise_ids);
  get diagnostics v_deleted_submissions = row_count;

  delete from public.events
  where franchise_id = any(v_demo_franchise_ids)
     or name like 'DEMO:%';

  delete from public.period_franchise_status
  where franchise_id = any(v_demo_franchise_ids);

  delete from public.franchises
  where id = any(v_demo_franchise_ids);
  get diagnostics v_deleted_franchises = row_count;

  delete from public.regionals
  where id = any(v_demo_regional_ids);
  get diagnostics v_deleted_regionals = row_count;

  delete from public.reporting_periods rp
  where (rp.year = 2026 and rp.month in (2, 3))
    and not exists (
      select 1
      from public.submissions s
      where s.reporting_period_id = rp.id
    )
    and not exists (
      select 1
      from public.events e
      where e.reporting_period_id = rp.id
    )
    and not exists (
      select 1
      from public.period_franchise_status pfs
      where pfs.reporting_period_id = rp.id
    );

  return jsonb_build_object(
    'message', 'Ambiente de demonstracao zerado.',
    'deleted_submissions', v_deleted_submissions,
    'deleted_franchises', v_deleted_franchises,
    'deleted_regionals', v_deleted_regionals
  );
end;
$$;

create or replace function public.fn_admin_create_demo_submission(
  p_franchise_id uuid,
  p_period_id uuid,
  p_event_name text,
  p_event_date date,
  p_status text,
  p_inputs jsonb,
  p_issue_descriptions text[] default null,
  p_approval_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type_id uuid;
  v_event_id uuid;
  v_submission_id uuid;
  v_version_number int;
  v_issue_description text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem preparar a demonstracao.';
  end if;

  select id
    into v_event_type_id
  from public.event_types
  where code = 'cis'
  limit 1;

  insert into public.events (
    franchise_id,
    reporting_period_id,
    event_type_id,
    name,
    event_date,
    status,
    notes
  ) values (
    p_franchise_id,
    p_period_id,
    v_event_type_id,
    p_event_name,
    p_event_date,
    'executed',
    'Evento de demonstracao gerado automaticamente.'
  )
  returning id into v_event_id;

  select coalesce(max(version_number), 0) + 1
    into v_version_number
  from public.submissions
  where franchise_id = p_franchise_id
    and reporting_period_id = p_period_id;

  insert into public.submissions (
    franchise_id,
    reporting_period_id,
    event_id,
    version_number,
    status,
    origin,
    notes
  ) values (
    p_franchise_id,
    p_period_id,
    v_event_id,
    v_version_number,
    'draft',
    'admin_entry',
    'Submissao demo gerada automaticamente.'
  )
  returning id into v_submission_id;

  insert into public.period_franchise_status (
    reporting_period_id,
    franchise_id,
    status,
    current_submission_id,
    last_status_change_at
  ) values (
    p_period_id,
    p_franchise_id,
    'draft',
    v_submission_id,
    now()
  )
  on conflict (reporting_period_id, franchise_id) do update
    set status = 'draft',
        current_submission_id = excluded.current_submission_id,
        last_status_change_at = now(),
        updated_at = now();

  insert into public.submission_input_values (
    submission_id,
    dre_line_id,
    value_currency,
    entered_by,
    entered_at
  )
  select
    v_submission_id,
    dl.id,
    (entry.value)::numeric(14,2),
    auth.uid(),
    now()
  from jsonb_each_text(p_inputs) as entry(key, value)
  join public.dre_lines dl
    on dl.code = entry.key;

  perform public.fn_calculate_submission_dre(v_submission_id);
  perform public.fn_validate_submission(v_submission_id);

  if p_status in ('submitted', 'under_review', 'pending_adjustment', 'approved') then
    perform public.fn_set_submission_status(
      v_submission_id,
      'submitted',
      'Envio inicial da demonstracao.'
    );
  end if;

  if p_status in ('under_review', 'pending_adjustment', 'approved') then
    perform public.fn_set_submission_status(
      v_submission_id,
      'under_review',
      'Triagem da controladoria na demonstracao.'
    );
  end if;

  if p_issue_descriptions is not null then
    foreach v_issue_description in array p_issue_descriptions loop
      insert into public.submission_issues (
        submission_id,
        issue_type,
        severity,
        description,
        status,
        opened_by
      ) values (
        v_submission_id,
        'data_check',
        'medium',
        v_issue_description,
        'open',
        auth.uid()
      );
    end loop;
  end if;

  if p_status = 'pending_adjustment' then
    perform public.fn_set_submission_status(
      v_submission_id,
      'pending_adjustment',
      'Controladoria solicitou ajustes na demonstracao.'
    );
  end if;

  if p_status = 'approved' then
    insert into public.submission_approvals (
      submission_id,
      approval_step,
      approved_by,
      decision,
      notes
    ) values (
      v_submission_id,
      'controladoria',
      auth.uid(),
      'approved',
      coalesce(p_approval_note, 'Submissao aprovada no ambiente de demonstracao.')
    );

    perform public.fn_set_submission_status(
      v_submission_id,
      'approved',
      coalesce(p_approval_note, 'Submissao aprovada no ambiente de demonstracao.')
    );
  end if;

  return v_submission_id;
end;
$$;

create or replace function public.fn_admin_seed_demo_environment()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_regional_sudeste_id uuid;
  v_regional_nordeste_id uuid;
  v_franchise_campinas_id uuid;
  v_franchise_bh_id uuid;
  v_franchise_fortaleza_id uuid;
  v_period_previous_id uuid;
  v_period_current_id uuid;
  v_current_submission_ids uuid[] := '{}'::uuid[];
  v_previous_submission_ids uuid[] := '{}'::uuid[];
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem preparar a demonstracao.';
  end if;

  perform public.fn_admin_reset_demo_environment();

  insert into public.regionals (
    code,
    name,
    manager_profile_id,
    status
  ) values (
    'DEMO-SE',
    'Regional Sudeste Demo',
    auth.uid(),
    'active'
  )
  on conflict (code) do update
    set name = excluded.name,
        manager_profile_id = excluded.manager_profile_id,
        status = excluded.status,
        updated_at = now()
  returning id into v_regional_sudeste_id;

  insert into public.regionals (
    code,
    name,
    manager_profile_id,
    status
  ) values (
    'DEMO-NE',
    'Regional Nordeste Demo',
    auth.uid(),
    'active'
  )
  on conflict (code) do update
    set name = excluded.name,
        manager_profile_id = excluded.manager_profile_id,
        status = excluded.status,
        updated_at = now()
  returning id into v_regional_nordeste_id;

  insert into public.franchises (
    code,
    trade_name,
    legal_name,
    city,
    state,
    regional_id,
    status,
    go_live_date
  ) values (
    'DEMO-CPS',
    'Febracis Campinas Demo',
    'Febracis Campinas Demonstracao Ltda',
    'Campinas',
    'SP',
    v_regional_sudeste_id,
    'active',
    date '2024-01-15'
  )
  on conflict (code) do update
    set trade_name = excluded.trade_name,
        legal_name = excluded.legal_name,
        city = excluded.city,
        state = excluded.state,
        regional_id = excluded.regional_id,
        status = excluded.status,
        go_live_date = excluded.go_live_date,
        updated_at = now()
  returning id into v_franchise_campinas_id;

  insert into public.franchises (
    code,
    trade_name,
    legal_name,
    city,
    state,
    regional_id,
    status,
    go_live_date
  ) values (
    'DEMO-BHZ',
    'Febracis Belo Horizonte Demo',
    'Febracis Belo Horizonte Demonstracao Ltda',
    'Belo Horizonte',
    'MG',
    v_regional_sudeste_id,
    'active',
    date '2024-03-01'
  )
  on conflict (code) do update
    set trade_name = excluded.trade_name,
        legal_name = excluded.legal_name,
        city = excluded.city,
        state = excluded.state,
        regional_id = excluded.regional_id,
        status = excluded.status,
        go_live_date = excluded.go_live_date,
        updated_at = now()
  returning id into v_franchise_bh_id;

  insert into public.franchises (
    code,
    trade_name,
    legal_name,
    city,
    state,
    regional_id,
    status,
    go_live_date
  ) values (
    'DEMO-FOR',
    'Febracis Fortaleza Demo',
    'Febracis Fortaleza Demonstracao Ltda',
    'Fortaleza',
    'CE',
    v_regional_nordeste_id,
    'active',
    date '2024-05-20'
  )
  on conflict (code) do update
    set trade_name = excluded.trade_name,
        legal_name = excluded.legal_name,
        city = excluded.city,
        state = excluded.state,
        regional_id = excluded.regional_id,
        status = excluded.status,
        go_live_date = excluded.go_live_date,
        updated_at = now()
  returning id into v_franchise_fortaleza_id;

  insert into public.reporting_periods (
    year,
    month,
    status,
    open_at,
    submission_deadline_at,
    adjustment_deadline_at,
    closed_at
  ) values (
    2026,
    2,
    'closed',
    timestamptz '2026-02-01 08:00:00-03',
    timestamptz '2026-02-28 23:59:00-03',
    timestamptz '2026-03-03 18:00:00-03',
    timestamptz '2026-03-05 18:00:00-03'
  )
  on conflict (year, month) do update
    set status = excluded.status,
        open_at = excluded.open_at,
        submission_deadline_at = excluded.submission_deadline_at,
        adjustment_deadline_at = excluded.adjustment_deadline_at,
        closed_at = excluded.closed_at,
        updated_at = now()
  returning id into v_period_previous_id;

  insert into public.reporting_periods (
    year,
    month,
    status,
    open_at,
    submission_deadline_at,
    adjustment_deadline_at,
    closed_at
  ) values (
    2026,
    3,
    'open',
    timestamptz '2026-03-01 08:00:00-03',
    timestamptz '2026-03-29 23:59:00-03',
    timestamptz '2026-03-31 18:00:00-03',
    null
  )
  on conflict (year, month) do update
    set status = excluded.status,
        open_at = excluded.open_at,
        submission_deadline_at = excluded.submission_deadline_at,
        adjustment_deadline_at = excluded.adjustment_deadline_at,
        closed_at = excluded.closed_at,
        updated_at = now()
  returning id into v_period_current_id;

  v_previous_submission_ids := array_append(
    v_previous_submission_ids,
    public.fn_admin_create_demo_submission(
      v_franchise_campinas_id,
      v_period_previous_id,
      'DEMO: Metodo CIS Campinas - Fev/2026',
      date '2026-02-14',
      'approved',
      jsonb_build_object(
        'gross_revenue', 760000,
        'discounts_returns', 10000,
        'split_holding', 22000,
        'cispay', 7500,
        'ed_commission', 16000,
        'franchise_fee', 15000,
        'event_space_rent', 46000,
        'event_decoration', 10500,
        'event_food', 16500,
        'event_gifts', 5500,
        'event_audiovisual', 9000,
        'event_logistics', 7000,
        'marketing_digital', 39000,
        'marketing_regional', 15000,
        'default_gross', 18000,
        'default_recovery', 5000,
        'people_total', 80000,
        'cto_total', 17500,
        'utilities_services_total', 13500,
        'general_expenses_total', 21000,
        'taxes', 28000
      ),
      null,
      'Competencia anterior aprovada na demonstracao.'
    )
  );

  v_previous_submission_ids := array_append(
    v_previous_submission_ids,
    public.fn_admin_create_demo_submission(
      v_franchise_bh_id,
      v_period_previous_id,
      'DEMO: Metodo CIS Belo Horizonte - Fev/2026',
      date '2026-02-10',
      'approved',
      jsonb_build_object(
        'gross_revenue', 520000,
        'discounts_returns', 8000,
        'split_holding', 15000,
        'cispay', 5500,
        'ed_commission', 11000,
        'franchise_fee', 9000,
        'event_space_rent', 32000,
        'event_decoration', 8500,
        'event_food', 12000,
        'event_gifts', 3000,
        'event_audiovisual', 6000,
        'event_logistics', 4000,
        'marketing_digital', 52000,
        'marketing_regional', 22000,
        'default_gross', 24000,
        'default_recovery', 5000,
        'people_total', 76000,
        'cto_total', 14000,
        'utilities_services_total', 11500,
        'general_expenses_total', 17500,
        'taxes', 24000
      ),
      null,
      'Competencia anterior aprovada na demonstracao.'
    )
  );

  v_previous_submission_ids := array_append(
    v_previous_submission_ids,
    public.fn_admin_create_demo_submission(
      v_franchise_fortaleza_id,
      v_period_previous_id,
      'DEMO: Metodo CIS Fortaleza - Fev/2026',
      date '2026-02-21',
      'approved',
      jsonb_build_object(
        'gross_revenue', 430000,
        'discounts_returns', 6500,
        'split_holding', 12000,
        'cispay', 4200,
        'ed_commission', 9000,
        'franchise_fee', 7800,
        'event_space_rent', 26000,
        'event_decoration', 7000,
        'event_food', 10500,
        'event_gifts', 2500,
        'event_audiovisual', 5000,
        'event_logistics', 3200,
        'marketing_digital', 36000,
        'marketing_regional', 14000,
        'default_gross', 16000,
        'default_recovery', 4000,
        'people_total', 67000,
        'cto_total', 12000,
        'utilities_services_total', 9500,
        'general_expenses_total', 15000,
        'taxes', 18500
      ),
      null,
      'Competencia anterior aprovada na demonstracao.'
    )
  );

  v_current_submission_ids := array_append(
    v_current_submission_ids,
    public.fn_admin_create_demo_submission(
      v_franchise_campinas_id,
      v_period_current_id,
      'DEMO: Metodo CIS Campinas - Mar/2026',
      date '2026-03-10',
      'approved',
      jsonb_build_object(
        'gross_revenue', 800000,
        'discounts_returns', 12000,
        'split_holding', 24000,
        'cispay', 8000,
        'ed_commission', 18000,
        'franchise_fee', 16000,
        'event_space_rent', 48000,
        'event_decoration', 12000,
        'event_food', 18000,
        'event_gifts', 6000,
        'event_audiovisual', 9500,
        'event_logistics', 7500,
        'marketing_digital', 42000,
        'marketing_regional', 18000,
        'default_gross', 22000,
        'default_recovery', 7000,
        'people_total', 85000,
        'cto_total', 18000,
        'utilities_services_total', 14000,
        'general_expenses_total', 23000,
        'taxes', 30000
      ),
      null,
      'Caso-modelo alinhado com a referencia da planilha para a demonstracao.'
    )
  );

  v_current_submission_ids := array_append(
    v_current_submission_ids,
    public.fn_admin_create_demo_submission(
      v_franchise_bh_id,
      v_period_current_id,
      'DEMO: Metodo CIS Belo Horizonte - Mar/2026',
      date '2026-03-17',
      'under_review',
      jsonb_build_object(
        'gross_revenue', 560000,
        'discounts_returns', 9000,
        'split_holding', 16500,
        'cispay', 6000,
        'ed_commission', 12500,
        'franchise_fee', 9500,
        'event_space_rent', 34000,
        'event_decoration', 9000,
        'event_food', 12500,
        'event_gifts', 3500,
        'event_audiovisual', 6500,
        'event_logistics', 4500,
        'marketing_digital', 65000,
        'marketing_regional', 24000,
        'default_gross', 28000,
        'default_recovery', 6000,
        'people_total', 80000,
        'cto_total', 15500,
        'utilities_services_total', 12500,
        'general_expenses_total', 19000,
        'taxes', 26000
      ),
      array['Validar justificativa para marketing acima do patamar recomendado.'],
      null
    )
  );

  v_current_submission_ids := array_append(
    v_current_submission_ids,
    public.fn_admin_create_demo_submission(
      v_franchise_fortaleza_id,
      v_period_current_id,
      'DEMO: Metodo CIS Fortaleza - Mar/2026',
      date '2026-03-19',
      'pending_adjustment',
      jsonb_build_object(
        'gross_revenue', 410000,
        'discounts_returns', 7000,
        'split_holding', 13000,
        'cispay', 4500,
        'ed_commission', 9200,
        'franchise_fee', 8000,
        'event_space_rent', 25000,
        'event_decoration', 7200,
        'event_food', 9800,
        'event_gifts', 2800,
        'event_audiovisual', 4800,
        'event_logistics', 3600,
        'marketing_digital', 42000,
        'marketing_regional', 17000,
        'default_gross', 32000,
        'default_recovery', 3500,
        'people_total', 69000,
        'cto_total', 12500,
        'utilities_services_total', 9800,
        'general_expenses_total', 16000,
        'taxes', 20000
      ),
      array[
        'Revisar inadimplencia liquida acima do patamar esperado para a unidade.',
        'Confirmar suporte documental para despesas de marketing regional.'
      ],
      null
    )
  );

  return jsonb_build_object(
    'message', 'Ambiente de demonstracao preparado com sucesso.',
    'regionals', 2,
    'franchises', 3,
    'periods', 2,
    'current_submissions', coalesce(array_length(v_current_submission_ids, 1), 0),
    'previous_submissions', coalesce(array_length(v_previous_submission_ids, 1), 0)
  );
end;
$$;

commit;
