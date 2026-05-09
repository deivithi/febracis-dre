-- Reverte só a função `fn_admin_create_demo_submission` ao texto da migration 008 (dados já limpos não são restaurados).

begin;

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

commit;
