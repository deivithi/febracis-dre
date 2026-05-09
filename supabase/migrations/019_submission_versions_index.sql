-- Índice para listagem de versões por franquia + competência (histórico U27).
-- RPC opcional: restaurar inputs do rascunho atual a partir de outra versão (mesmo par franquia/período).

begin;

create index if not exists idx_submissions_franchise_period_version
  on public.submissions (franchise_id, reporting_period_id, version_number desc);

create or replace function public.fn_restore_submission_inputs_from_version(
  p_target_submission_id uuid,
  p_source_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_franchise_id uuid;
  v_period_id uuid;
  v_target_status text;
  v_source_franchise uuid;
  v_source_period uuid;
begin
  if p_target_submission_id is null or p_source_submission_id is null then
    raise exception 'IDs de submissao invalidos.';
  end if;

  select franchise_id, reporting_period_id, status
    into v_franchise_id, v_period_id, v_target_status
  from public.submissions
  where id = p_target_submission_id;

  if v_franchise_id is null then
    raise exception 'Submissao alvo nao encontrada.';
  end if;

  if not public.can_operate_submission(v_franchise_id) then
    raise exception 'Acesso negado para restaurar esta submissao.';
  end if;

  if v_target_status not in ('draft', 'reopened', 'pending_adjustment') then
    raise exception 'A submissao alvo nao esta em estado editavel (status %).', v_target_status;
  end if;

  select franchise_id, reporting_period_id
    into v_source_franchise, v_source_period
  from public.submissions
  where id = p_source_submission_id;

  if v_source_franchise is null then
    raise exception 'Versao de origem nao encontrada.';
  end if;

  if v_source_franchise is distinct from v_franchise_id
     or v_source_period is distinct from v_period_id then
    raise exception 'As versoes pertencem a franquias ou competencias diferentes.';
  end if;

  if p_target_submission_id = p_source_submission_id then
    raise exception 'Selecione uma versao distinta da submissao alvo.';
  end if;

  delete from public.submission_input_values
  where submission_id = p_target_submission_id;

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
    p_target_submission_id,
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
  where siv.submission_id = p_source_submission_id;

  update public.submissions target
  set
    notes = coalesce(src.notes, target.notes),
    updated_at = now()
  from public.submissions src
  where target.id = p_target_submission_id
    and src.id = p_source_submission_id;

  perform public.fn_calculate_submission_dre(p_target_submission_id);
  perform public.fn_validate_submission(p_target_submission_id);

  return jsonb_build_object(
    'ok', true,
    'submission_id', p_target_submission_id,
    'message', 'Valores restaurados a partir da versao selecionada.'
  );
end;
$$;

revoke all on function public.fn_restore_submission_inputs_from_version(uuid, uuid) from public;
grant execute on function public.fn_restore_submission_inputs_from_version(uuid, uuid) to authenticated;

commit;
