begin;

create table if not exists public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  assistant_mode text not null default 'guided_dre',
  title text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  summary text,
  state_json jsonb not null default '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  role text not null
    check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_agent_sessions_profile_submission_mode
  on public.agent_sessions(profile_id, submission_id, assistant_mode)
  where submission_id is not null;

create index if not exists idx_agent_sessions_profile_id
  on public.agent_sessions(profile_id);

create index if not exists idx_agent_sessions_franchise_id
  on public.agent_sessions(franchise_id);

create index if not exists idx_agent_sessions_last_message_at
  on public.agent_sessions(last_message_at desc nulls last);

create index if not exists idx_agent_messages_session_id_created_at
  on public.agent_messages(session_id, created_at);

drop trigger if exists trg_agent_sessions_updated_at on public.agent_sessions;
create trigger trg_agent_sessions_updated_at
before update on public.agent_sessions
for each row execute procedure public.set_updated_at();

alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;

drop policy if exists "agent_sessions_select_by_scope" on public.agent_sessions;
create policy "agent_sessions_select_by_scope"
on public.agent_sessions for select to authenticated
using (
  profile_id = auth.uid()
  or public.is_admin()
  or public.can_manage_review()
);

drop policy if exists "agent_sessions_insert_by_scope" on public.agent_sessions;
create policy "agent_sessions_insert_by_scope"
on public.agent_sessions for insert to authenticated
with check (
  profile_id = auth.uid()
  and public.can_access_franchise(franchise_id)
);

drop policy if exists "agent_sessions_update_by_owner" on public.agent_sessions;
create policy "agent_sessions_update_by_owner"
on public.agent_sessions for update to authenticated
using (
  profile_id = auth.uid()
  or public.is_admin()
)
with check (
  profile_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "agent_messages_select_by_scope" on public.agent_messages;
create policy "agent_messages_select_by_scope"
on public.agent_messages for select to authenticated
using (
  exists (
    select 1
    from public.agent_sessions s
    where s.id = agent_messages.session_id
      and (
        s.profile_id = auth.uid()
        or public.is_admin()
        or public.can_manage_review()
      )
  )
);

drop policy if exists "agent_messages_insert_by_scope" on public.agent_messages;
create policy "agent_messages_insert_by_scope"
on public.agent_messages for insert to authenticated
with check (
  exists (
    select 1
    from public.agent_sessions s
    where s.id = agent_messages.session_id
      and (
        s.profile_id = auth.uid()
        or public.is_admin()
      )
  )
);

create or replace function public.fn_agent_get_or_create_session(
  p_submission_id uuid,
  p_franchise_id uuid,
  p_reporting_period_id uuid,
  p_assistant_mode text default 'guided_dre'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_submission_record record;
begin
  if p_submission_id is null then
    raise exception 'Submissao obrigatoria para iniciar o assistente.';
  end if;

  if not public.can_access_franchise(p_franchise_id) then
    raise exception 'Acesso negado para abrir o assistente nesta franquia.';
  end if;

  select
    s.id,
    s.franchise_id,
    s.reporting_period_id
  into v_submission_record
  from public.submissions s
  where s.id = p_submission_id;

  if v_submission_record.id is null then
    raise exception 'Submissao nao encontrada: %', p_submission_id;
  end if;

  if v_submission_record.franchise_id is distinct from p_franchise_id
     or v_submission_record.reporting_period_id is distinct from p_reporting_period_id then
    raise exception 'Submissao nao corresponde ao recorte operacional informado.';
  end if;

  select id
  into v_session_id
  from public.agent_sessions s
  where s.profile_id = auth.uid()
    and s.submission_id = p_submission_id
    and s.assistant_mode = p_assistant_mode
  limit 1;

  if v_session_id is null then
    insert into public.agent_sessions (
      profile_id,
      submission_id,
      franchise_id,
      reporting_period_id,
      assistant_mode,
      title,
      status,
      last_message_at
    )
    values (
      auth.uid(),
      p_submission_id,
      p_franchise_id,
      p_reporting_period_id,
      coalesce(nullif(trim(p_assistant_mode), ''), 'guided_dre'),
      'Assistente DRE',
      'active',
      now()
    )
    returning id into v_session_id;
  else
    update public.agent_sessions
    set
      status = 'active',
      last_message_at = coalesce(last_message_at, now()),
      updated_at = now()
    where id = v_session_id;
  end if;

  return jsonb_build_object(
    'session_id', v_session_id,
    'assistant_mode', coalesce(nullif(trim(p_assistant_mode), ''), 'guided_dre'),
    'status', 'active'
  );
end;
$$;

commit;
