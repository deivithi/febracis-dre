-- =========================================================
-- FEBRACIS | MIGRATION 010: ACCESS AND SUBMISSION WORKFLOWS
-- =========================================================

begin;

-- =========================================================
-- HELPERS
-- =========================================================

create or replace function public.can_operate_submission(p_franchise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.can_access_franchise(p_franchise_id)
    and (
      public.is_admin()
      or exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.profile_id = auth.uid()
          and r.code = 'franchise_user'
      )
    );
$$;

-- =========================================================
-- RLS HARDENING FOR VIEWER / READ-ONLY USERS
-- =========================================================

drop policy if exists "events_insert_by_scope" on public.events;
create policy "events_insert_by_scope"
on public.events for insert to authenticated
with check (public.can_operate_submission(franchise_id));

drop policy if exists "events_update_by_scope" on public.events;
create policy "events_update_by_scope"
on public.events for update to authenticated
using (public.can_operate_submission(franchise_id))
with check (public.can_operate_submission(franchise_id));

drop policy if exists "submissions_insert_by_scope" on public.submissions;
create policy "submissions_insert_by_scope"
on public.submissions for insert to authenticated
with check (public.can_operate_submission(franchise_id));

drop policy if exists "submissions_update_by_scope_or_review" on public.submissions;
create policy "submissions_update_by_scope_or_review"
on public.submissions for update to authenticated
using (public.can_operate_submission(franchise_id) or public.can_manage_review())
with check (public.can_operate_submission(franchise_id) or public.can_manage_review());

drop policy if exists "siv_insert_by_scope" on public.submission_input_values;
create policy "siv_insert_by_scope"
on public.submission_input_values for insert to authenticated
with check (exists (
  select 1
  from public.submissions s
  where s.id = submission_input_values.submission_id
    and public.can_operate_submission(s.franchise_id)
    and s.status in ('draft', 'reopened', 'pending_adjustment')
));

drop policy if exists "siv_update_by_scope" on public.submission_input_values;
create policy "siv_update_by_scope"
on public.submission_input_values for update to authenticated
using (exists (
  select 1
  from public.submissions s
  where s.id = submission_input_values.submission_id
    and public.can_operate_submission(s.franchise_id)
    and s.status in ('draft', 'reopened', 'pending_adjustment')
))
with check (exists (
  select 1
  from public.submissions s
  where s.id = submission_input_values.submission_id
    and public.can_operate_submission(s.franchise_id)
    and s.status in ('draft', 'reopened', 'pending_adjustment')
));

drop policy if exists "attachments_insert_by_scope" on public.submission_attachments;
create policy "attachments_insert_by_scope"
on public.submission_attachments for insert to authenticated
with check (exists (
  select 1
  from public.submissions s
  where s.id = submission_attachments.submission_id
    and public.can_operate_submission(s.franchise_id)
    and s.status in ('draft', 'reopened', 'pending_adjustment')
));

-- =========================================================
-- USER ACCESS DIRECTORY VIEW
-- =========================================================

create or replace view public.vw_user_access_directory
with (security_invoker = true) as
select
  p.id as profile_id,
  p.full_name,
  p.email,
  p.status as profile_status,
  p.created_at,
  p.updated_at,
  r.code as role_code,
  r.name as role_name,
  us.scope_type,
  us.franchise_id,
  us.regional_id,
  f.trade_name as franchise_name,
  f.code as franchise_code,
  coalesce(reg_scope.name, reg_franchise.name) as regional_name,
  coalesce(reg_scope.code, reg_franchise.code) as regional_code
from public.profiles p
left join lateral (
  select ur.role_id
  from public.user_roles ur
  where ur.profile_id = p.id
  order by ur.created_at desc
  limit 1
) latest_role on true
left join public.roles r on r.id = latest_role.role_id
left join lateral (
  select us.id, us.scope_type, us.franchise_id, us.regional_id
  from public.user_scopes us
  where us.profile_id = p.id
  order by us.created_at desc
  limit 1
) us on true
left join public.franchises f on f.id = us.franchise_id
left join public.regionals reg_scope on reg_scope.id = us.regional_id
left join public.regionals reg_franchise on reg_franchise.id = f.regional_id;

-- =========================================================
-- ADMIN ACCESS UPSERT
-- =========================================================

create or replace function public.fn_admin_upsert_user_access(
  p_profile_id uuid,
  p_full_name text,
  p_status text,
  p_role_code text,
  p_scope_type text,
  p_franchise_id uuid default null,
  p_regional_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
  v_scope_type text := p_scope_type;
  v_franchise_id uuid := p_franchise_id;
  v_regional_id uuid := p_regional_id;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado para gerenciar usuarios.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_profile_id
  ) then
    raise exception 'Perfil nao encontrado: %', p_profile_id;
  end if;

  if p_status not in ('active', 'inactive', 'invited') then
    raise exception 'Status invalido: %', p_status;
  end if;

  if p_role_code = 'system_admin' then
    v_scope_type := 'network';
    v_franchise_id := null;
    v_regional_id := null;
  end if;

  if v_scope_type = 'franchise' and v_franchise_id is null then
    raise exception 'Escopo de franquia exige franchise_id.';
  end if;

  if v_scope_type = 'regional' and v_regional_id is null then
    raise exception 'Escopo regional exige regional_id.';
  end if;

  if v_scope_type not in ('franchise', 'regional', 'network') then
    raise exception 'Escopo invalido: %', v_scope_type;
  end if;

  select id into v_role_id
  from public.roles
  where code = p_role_code;

  if v_role_id is null then
    raise exception 'Papel nao encontrado: %', p_role_code;
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    status = p_status,
    updated_at = now()
  where id = p_profile_id;

  delete from public.user_roles
  where profile_id = p_profile_id;

  insert into public.user_roles (profile_id, role_id)
  values (p_profile_id, v_role_id);

  delete from public.user_scopes
  where profile_id = p_profile_id;

  insert into public.user_scopes (
    profile_id,
    scope_type,
    franchise_id,
    regional_id
  )
  values (
    p_profile_id,
    v_scope_type,
    case when v_scope_type = 'franchise' then v_franchise_id else null end,
    case when v_scope_type = 'regional' then v_regional_id else null end
  );

  return jsonb_build_object(
    'profile_id', p_profile_id,
    'role_code', p_role_code,
    'scope_type', v_scope_type,
    'message', 'Acesso atualizado com sucesso.'
  );
end;
$$;

-- =========================================================
-- SUBMISSION VERSIONING
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

  select
    s.id,
    s.status,
    s.version_number,
    s.event_id
  into
    v_existing_submission_id,
    v_existing_status,
    v_existing_version,
    v_existing_event_id
  from public.submissions s
  where s.franchise_id = p_franchise_id
    and s.reporting_period_id = p_reporting_period_id
    and s.status != 'superseded'
  order by s.version_number desc
  limit 1;

  if v_existing_submission_id is not null
     and v_existing_status in ('draft', 'reopened', 'pending_adjustment') then
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

  select coalesce(max(s.version_number), 0) + 1
  into v_new_version
  from public.submissions s
  where s.franchise_id = p_franchise_id
    and s.reporting_period_id = p_reporting_period_id;

  insert into public.submissions (
    franchise_id,
    reporting_period_id,
    event_id,
    version_number,
    status,
    origin,
    notes
  )
  values (
    p_franchise_id,
    p_reporting_period_id,
    coalesce(p_event_id, v_existing_event_id),
    v_new_version,
    'draft',
    case when public.is_admin() then 'admin_entry' else 'internal_app' end,
    null
  )
  returning id into v_new_submission_id;

  if v_existing_submission_id is not null then
    insert into public.submission_input_values (
      submission_id,
      dre_line_id,
      value_currency,
      value_text,
      value_boolean,
      value_integer,
      value_percentage,
      entered_by,
      entered_at,
      notes,
      created_at,
      updated_at
    )
    select
      v_new_submission_id,
      siv.dre_line_id,
      siv.value_currency,
      siv.value_text,
      siv.value_boolean,
      siv.value_integer,
      siv.value_percentage,
      auth.uid(),
      now(),
      siv.notes,
      now(),
      now()
    from public.submission_input_values siv
    where siv.submission_id = v_existing_submission_id;
  end if;

  insert into public.period_franchise_status (
    reporting_period_id,
    franchise_id,
    status,
    current_submission_id,
    last_status_change_at
  )
  values (
    p_reporting_period_id,
    p_franchise_id,
    'draft',
    v_new_submission_id,
    now()
  )
  on conflict (reporting_period_id, franchise_id) do update
  set
    status = 'draft',
    current_submission_id = excluded.current_submission_id,
    last_status_change_at = now(),
    updated_at = now();

  insert into public.submission_status_history (
    submission_id,
    from_status,
    to_status,
    changed_by,
    reason
  )
  values (
    v_new_submission_id,
    null,
    'draft',
    auth.uid(),
    'Nova versao criada para a competencia.'
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

-- =========================================================
-- SAVE DRAFT INPUTS
-- =========================================================

create or replace function public.fn_save_submission_inputs(
  p_submission_id uuid,
  p_inputs jsonb default '[]'::jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_franchise_id uuid;
  v_status text;
  v_kpis jsonb;
  v_validation_count int;
begin
  select s.franchise_id, s.status
  into v_franchise_id, v_status
  from public.submissions s
  where s.id = p_submission_id;

  if v_franchise_id is null then
    raise exception 'Submissao nao encontrada: %', p_submission_id;
  end if;

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
    'kpis', coalesce(v_kpis, '{}'::jsonb),
    'validation_count', v_validation_count,
    'message', 'Rascunho salvo com sucesso.'
  );
end;
$$;

-- =========================================================
-- SUBMIT SUBMISSION
-- =========================================================

create or replace function public.fn_submit_submission(
  p_submission_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_franchise_id uuid;
  v_status text;
  v_blocking_count int := 0;
begin
  select s.franchise_id, s.status
  into v_franchise_id, v_status
  from public.submissions s
  where s.id = p_submission_id;

  if v_franchise_id is null then
    raise exception 'Submissao nao encontrada: %', p_submission_id;
  end if;

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
    return jsonb_build_object(
      'ok', false,
      'submission_id', p_submission_id,
      'status', v_status,
      'blocking_errors', v_blocking_count,
      'message', 'A submissao possui validacoes bloqueantes.'
    );
  end if;

  perform public.fn_set_submission_status(
    p_submission_id,
    'submitted',
    coalesce(p_notes, 'Submissao enviada pela unidade.')
  );

  return jsonb_build_object(
    'ok', true,
    'submission_id', p_submission_id,
    'status', 'submitted',
    'message', 'Submissao enviada com sucesso.'
  );
end;
$$;

-- =========================================================
-- REVIEW WORKFLOW
-- =========================================================

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

  select status
  into v_status
  from public.submissions
  where id = p_submission_id;

  if v_status is null then
    raise exception 'Submissao nao encontrada: %', p_submission_id;
  end if;

  if p_action = 'start_review' then
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
    insert into public.submission_approvals (
      submission_id,
      approval_step,
      approved_by,
      approved_at,
      decision,
      notes
    )
    values (
      p_submission_id,
      'controller_review',
      auth.uid(),
      now(),
      'approved',
      p_reason
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
    if coalesce(nullif(trim(p_reason), ''), '') = '' then
      raise exception 'Motivo obrigatorio para devolver a submissao.';
    end if;

    insert into public.submission_issues (
      submission_id,
      issue_type,
      severity,
      description,
      status,
      opened_by,
      opened_at
    )
    values (
      p_submission_id,
      'review_adjustment',
      'medium',
      p_reason,
      'open',
      auth.uid(),
      now()
    );

    perform public.fn_set_submission_status(
      p_submission_id,
      'pending_adjustment',
      p_reason
    );

    return jsonb_build_object(
      'submission_id', p_submission_id,
      'status', 'pending_adjustment',
      'message', 'Submissao devolvida para ajuste.'
    );
  end if;

  raise exception 'Acao de revisao invalida: %', p_action;
end;
$$;

-- =========================================================
-- EXECUTION GRANTS
-- =========================================================

revoke all on function public.fn_admin_upsert_user_access(uuid, text, text, text, text, uuid, uuid) from public;
grant execute on function public.fn_admin_upsert_user_access(uuid, text, text, text, text, uuid, uuid) to authenticated;

revoke all on function public.fn_create_submission_version(uuid, uuid, uuid) from public;
grant execute on function public.fn_create_submission_version(uuid, uuid, uuid) to authenticated;

revoke all on function public.fn_save_submission_inputs(uuid, jsonb, text) from public;
grant execute on function public.fn_save_submission_inputs(uuid, jsonb, text) to authenticated;

revoke all on function public.fn_submit_submission(uuid, text) from public;
grant execute on function public.fn_submit_submission(uuid, text) to authenticated;

revoke all on function public.fn_review_submission(uuid, text, text) from public;
grant execute on function public.fn_review_submission(uuid, text, text) to authenticated;

commit;
