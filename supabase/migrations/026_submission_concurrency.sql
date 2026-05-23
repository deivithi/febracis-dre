-- 018_submission_concurrency.sql
-- DDIA Cap. 7 / PROD-07: FOR UPDATE + revision optimista em fluxos críticos de submissão.

alter table public.submissions
  add column if not exists revision bigint not null default 0;

comment on column public.submissions.revision is
  'Contador optimista de mutação; incrementado em save/submit/review/status.';

-- =========================================================
-- Helper: lock pessimista + validação optimista opcional
-- =========================================================

create or replace function public.fn_require_submission_row_lock(
  p_submission_id uuid,
  p_expected_revision bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_franchise_id uuid;
  v_status text;
  v_revision bigint;
begin
  select s.franchise_id, s.status, s.revision
  into v_franchise_id, v_status, v_revision
  from public.submissions s
  where s.id = p_submission_id
  for update;

  if v_franchise_id is null then
    raise exception 'Submissao nao encontrada: %', p_submission_id;
  end if;

  if p_expected_revision is not null and v_revision is distinct from p_expected_revision then
    raise exception 'CONCURRENT_MODIFICATION: revision esperada %, atual %',
      p_expected_revision, v_revision;
  end if;

  return jsonb_build_object(
    'franchise_id', v_franchise_id,
    'status', v_status,
    'revision', v_revision
  );
end;
$$;

revoke all on function public.fn_require_submission_row_lock(uuid, bigint) from public;
grant execute on function public.fn_require_submission_row_lock(uuid, bigint) to authenticated;

-- =========================================================
-- fn_set_submission_status (substitui 017 — lock + revision)
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
  v_history_id uuid;
  v_telemetry_event text;
  v_payload jsonb;
begin
  select status into v_current_status
  from public.submissions
  where id = p_submission_id
  for update;

  if v_current_status is null then
    raise exception 'Submissão não encontrada: %', p_submission_id;
  end if;

  if v_current_status = p_new_status then
    return;
  end if;

  insert into public.submission_status_history (
    submission_id, from_status, to_status, changed_by, reason
  ) values (
    p_submission_id, v_current_status, p_new_status, auth.uid(), p_reason
  )
  returning id into v_history_id;

  update public.submissions
  set status = p_new_status,
      revision = revision + 1,
      submitted_at = case when p_new_status = 'submitted' then now() else submitted_at end,
      submitted_by = case when p_new_status = 'submitted' then auth.uid() else submitted_by end
  where id = p_submission_id;

  update public.period_franchise_status pfs
  set status = p_new_status,
      last_status_change_at = now(),
      current_submission_id = p_submission_id
  from public.submissions s
  where s.id = p_submission_id
    and pfs.franchise_id = s.franchise_id
    and pfs.reporting_period_id = s.reporting_period_id;

  if p_new_status in ('submitted', 'approved', 'pending_adjustment') then
    v_telemetry_event := case p_new_status
      when 'submitted' then 'submission_submitted_valid'
      when 'approved' then 'submission_approved'
      when 'pending_adjustment' then 'submission_returned_controller'
    end;

    select jsonb_build_object(
      'telemetry_event', v_telemetry_event,
      'submission_id', s.id,
      'from_status', v_current_status,
      'to_status', p_new_status,
      'reason', p_reason,
      'changed_by', auth.uid(),
      'changed_at', now(),
      'franchise_id', s.franchise_id,
      'franchise_name', f.name,
      'reporting_period_id', s.reporting_period_id,
      'period_label', rp.label,
      'ebitda_2', sk.ebitda_2,
      'status_history_id', v_history_id
    )
    into v_payload
    from public.submissions s
    join public.franchises f on f.id = s.franchise_id
    join public.reporting_periods rp on rp.id = s.reporting_period_id
    left join public.submission_kpis sk on sk.submission_id = s.id
    where s.id = p_submission_id;

    insert into public.outbox_events (
      aggregate_type,
      aggregate_id,
      event_type,
      payload,
      idempotency_key
    ) values (
      'submission',
      p_submission_id,
      'submission.' || p_new_status,
      v_payload,
      'submission_status:' || v_history_id::text
    );
  end if;
end;
$$;

-- =========================================================
-- fn_save_submission_inputs
-- =========================================================

drop function if exists public.fn_save_submission_inputs(uuid, jsonb, text);

create or replace function public.fn_save_submission_inputs(
  p_submission_id uuid,
  p_inputs jsonb default '[]'::jsonb,
  p_notes text default null,
  p_expected_revision bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lock jsonb;
  v_franchise_id uuid;
  v_status text;
  v_revision bigint;
  v_new_revision bigint;
  v_kpis jsonb;
  v_validation_count int;
begin
  v_lock := public.fn_require_submission_row_lock(p_submission_id, p_expected_revision);
  v_franchise_id := (v_lock->>'franchise_id')::uuid;
  v_status := v_lock->>'status';
  v_revision := (v_lock->>'revision')::bigint;

  if not public.can_operate_submission(v_franchise_id) then
    raise exception 'Acesso negado para salvar a submissao.';
  end if;

  if v_status not in ('draft', 'reopened', 'pending_adjustment') then
    raise exception 'Submissao nao pode ser editada no status atual: %', v_status;
  end if;

  if p_notes is not null then
    update public.submissions
    set notes = p_notes
    where id = p_submission_id;
  end if;

  delete from public.submission_input_values siv
  using (
    select dl.id as dre_line_id
    from jsonb_to_recordset(coalesce(p_inputs, '[]'::jsonb)) as item(
      line_code text,
      value_currency numeric,
      notes text
    )
    join public.dre_lines dl on dl.code = item.line_code
    where dl.line_type = 'input'
      and item.value_currency is null
  ) clear_items
  where siv.submission_id = p_submission_id
    and siv.dre_line_id = clear_items.dre_line_id;

  insert into public.submission_input_values (
    submission_id,
    dre_line_id,
    value_currency,
    entered_by,
    entered_at,
    notes,
    created_at,
    updated_at
  )
  select
    p_submission_id,
    dl.id,
    item.value_currency,
    auth.uid(),
    now(),
    nullif(item.notes, ''),
    now(),
    now()
  from jsonb_to_recordset(coalesce(p_inputs, '[]'::jsonb)) as item(
    line_code text,
    value_currency numeric,
    notes text
  )
  join public.dre_lines dl on dl.code = item.line_code
  where dl.line_type = 'input'
    and item.value_currency is not null
  on conflict (submission_id, dre_line_id) do update
  set
    value_currency = excluded.value_currency,
    entered_by = excluded.entered_by,
    entered_at = excluded.entered_at,
    notes = excluded.notes,
    updated_at = now();

  perform public.fn_calculate_submission_dre(p_submission_id);
  perform public.fn_validate_submission(p_submission_id);

  update public.submissions
  set revision = revision + 1
  where id = p_submission_id
  returning revision into v_new_revision;

  select jsonb_build_object(
    'gross_revenue', sk.gross_revenue,
    'mc1', sk.mc1,
    'mc2', sk.mc2,
    'ebitda_1', sk.ebitda_1,
    'ebitda_2', sk.ebitda_2
  )
  into v_kpis
  from public.submission_kpis sk
  where sk.submission_id = p_submission_id;

  select count(*)
  into v_validation_count
  from public.submission_validation_results svr
  where svr.submission_id = p_submission_id;

  return jsonb_build_object(
    'submission_id', p_submission_id,
    'status', v_status,
    'revision', v_new_revision,
    'kpis', coalesce(v_kpis, '{}'::jsonb),
    'validation_count', v_validation_count,
    'message', 'Rascunho salvo com sucesso.'
  );
end;
$$;

revoke all on function public.fn_save_submission_inputs(uuid, jsonb, text, bigint) from public;
grant execute on function public.fn_save_submission_inputs(uuid, jsonb, text, bigint) to authenticated;

-- =========================================================
-- fn_submit_submission
-- =========================================================

drop function if exists public.fn_submit_submission(uuid, text);

create or replace function public.fn_submit_submission(
  p_submission_id uuid,
  p_notes text default null,
  p_expected_revision bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lock jsonb;
  v_franchise_id uuid;
  v_status text;
  v_blocking_count int := 0;
  v_revision bigint;
begin
  v_lock := public.fn_require_submission_row_lock(p_submission_id, p_expected_revision);
  v_franchise_id := (v_lock->>'franchise_id')::uuid;
  v_status := v_lock->>'status';

  if not public.can_operate_submission(v_franchise_id) then
    raise exception 'Acesso negado para enviar a submissao.';
  end if;

  if v_status not in ('draft', 'reopened', 'pending_adjustment') then
    raise exception 'Submissao nao pode ser enviada no status atual: %', v_status;
  end if;

  if p_notes is not null then
    update public.submissions
    set notes = p_notes
    where id = p_submission_id;
  end if;

  perform public.fn_calculate_submission_dre(p_submission_id);
  perform public.fn_validate_submission(p_submission_id);

  select count(*)
  into v_blocking_count
  from public.submission_validation_results svr
  join public.validation_rules vr on vr.id = svr.validation_rule_id
  where svr.submission_id = p_submission_id
    and vr.severity = 'blocking'
    and svr.status = 'failed';

  if v_blocking_count > 0 then
    select revision into v_revision from public.submissions where id = p_submission_id;
    return jsonb_build_object(
      'ok', false,
      'submission_id', p_submission_id,
      'status', v_status,
      'revision', v_revision,
      'blocking_errors', v_blocking_count,
      'message', 'A submissao possui validacoes bloqueantes.'
    );
  end if;

  perform public.fn_set_submission_status(
    p_submission_id,
    'submitted',
    coalesce(p_notes, 'Submissao enviada pela unidade.')
  );

  select revision into v_revision from public.submissions where id = p_submission_id;

  return jsonb_build_object(
    'ok', true,
    'submission_id', p_submission_id,
    'status', 'submitted',
    'revision', v_revision,
    'message', 'Submissao enviada com sucesso.'
  );
end;
$$;

revoke all on function public.fn_submit_submission(uuid, text, bigint) from public;
grant execute on function public.fn_submit_submission(uuid, text, bigint) to authenticated;

-- =========================================================
-- fn_review_submission
-- =========================================================

drop function if exists public.fn_review_submission(uuid, text, text);

create or replace function public.fn_review_submission(
  p_submission_id uuid,
  p_action text,
  p_reason text default null,
  p_expected_revision bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lock jsonb;
  v_status text;
  v_revision bigint;
begin
  if not public.can_manage_review() then
    raise exception 'Acesso negado para revisar submissao.';
  end if;

  v_lock := public.fn_require_submission_row_lock(p_submission_id, p_expected_revision);
  v_status := v_lock->>'status';

  if p_action = 'start_review' then
    if v_status != 'submitted' then
      raise exception 'Submissao so pode entrar em revisao a partir de submitted. Status atual: %', v_status;
    end if;

    perform public.fn_set_submission_status(
      p_submission_id,
      'under_review',
      coalesce(p_reason, 'Submissao assumida pela controladoria.')
    );

    select revision into v_revision from public.submissions where id = p_submission_id;

    return jsonb_build_object(
      'submission_id', p_submission_id,
      'status', 'under_review',
      'revision', v_revision,
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

    select revision into v_revision from public.submissions where id = p_submission_id;

    return jsonb_build_object(
      'submission_id', p_submission_id,
      'status', 'approved',
      'revision', v_revision,
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

    select revision into v_revision from public.submissions where id = p_submission_id;

    return jsonb_build_object(
      'submission_id', p_submission_id,
      'status', 'pending_adjustment',
      'revision', v_revision,
      'message', 'Submissao devolvida para ajuste.'
    );
  end if;

  raise exception 'Acao de revisao invalida: %', p_action;
end;
$$;

revoke all on function public.fn_review_submission(uuid, text, text, bigint) from public;
grant execute on function public.fn_review_submission(uuid, text, text, bigint) to authenticated;

-- =========================================================
-- fn_create_submission_version — advisory lock anti write-skew
-- =========================================================

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

  perform pg_advisory_xact_lock(
    hashtext(p_franchise_id::text),
    hashtext(p_reporting_period_id::text)
  );

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
