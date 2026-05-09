-- =========================================================
-- FEBRACIS | NOTIFICAÇÕES (U07)
-- =========================================================
-- Centro de notificações: tabela, RLS, enqueue SECURITY DEFINER,
-- trigger em public.submissions para transições de status.
-- Realtime: adiciona tabela à publicação supabase_realtime quando disponível.
-- =========================================================

begin;

-- ------------------------------------------------------------
-- Tabela
-- ------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null
    check (type in (
      'submission_returned',
      'submission_approved',
      'new_period',
      'approval_assigned',
      'approval_pending'
    )),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Notificações in-app por usuário; INSERT apenas via notification_enqueue (SECURITY DEFINER / triggers).';

-- Feed: não lidas primeiro (read_at IS NULL), depois mais recentes.
create index if not exists idx_notifications_user_unread_created
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists idx_notifications_user_feed
  on public.notifications (user_id, read_at asc nulls first, created_at desc);

-- ------------------------------------------------------------
-- Enfileirar (único caminho de INSERT)
-- ------------------------------------------------------------

create or replace function public.notification_enqueue(
  p_user_id uuid,
  p_type text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'notification_enqueue: user_id obrigatorio';
  end if;

  insert into public.notifications (user_id, type, payload)
  values (p_user_id, p_type, coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.notification_enqueue(uuid, text, jsonb) from public;
grant execute on function public.notification_enqueue(uuid, text, jsonb) to service_role;

-- ------------------------------------------------------------
-- Resolução de destinatários
-- ------------------------------------------------------------

create or replace function public.profile_ids_finance_controllers()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id
  from public.profiles p
  join public.user_roles ur on ur.profile_id = p.id
  join public.roles r on r.id = ur.role_id
  where r.code = 'finance_controller'
    and p.status = 'active';
$$;

revoke all on function public.profile_ids_finance_controllers() from public;
grant execute on function public.profile_ids_finance_controllers() to authenticated, service_role;

create or replace function public.profile_ids_franchise_operators(p_franchise_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct us.profile_id
  from public.user_scopes us
  join public.user_roles ur on ur.profile_id = us.profile_id
  join public.roles r on r.id = ur.role_id
  join public.profiles p on p.id = us.profile_id
  where us.scope_type = 'franchise'
    and us.franchise_id = p_franchise_id
    and r.code = 'franchise_user'
    and p.status = 'active';
$$;

revoke all on function public.profile_ids_franchise_operators(uuid) from public;
grant execute on function public.profile_ids_franchise_operators(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- Trigger: submissions status
-- ------------------------------------------------------------

create or replace function public.submissions_notify_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
  v_uid uuid;
  v_period_label text;
begin
  if tg_op = 'INSERT' then
    v_old := null;
  else
    v_old := old.status;
  end if;

  if tg_op = 'UPDATE' and v_old is not distinct from new.status then
    return new;
  end if;

  select rp.label into v_period_label
  from public.reporting_periods rp
  where rp.id = new.reporting_period_id;

  if new.status = 'pending_adjustment' and v_old is distinct from 'pending_adjustment' then
    if new.submitted_by is not null then
      perform public.notification_enqueue(
        new.submitted_by,
        'submission_returned',
        jsonb_build_object(
          'submission_id', new.id,
          'franchise_id', new.franchise_id,
          'reporting_period_id', new.reporting_period_id,
          'period_label', v_period_label,
          'from_status', v_old,
          'to_status', new.status
        )
      );
    else
      for v_uid in select * from public.profile_ids_franchise_operators(new.franchise_id)
      loop
        perform public.notification_enqueue(
          v_uid,
          'submission_returned',
          jsonb_build_object(
            'submission_id', new.id,
            'franchise_id', new.franchise_id,
            'reporting_period_id', new.reporting_period_id,
            'period_label', v_period_label,
            'from_status', v_old,
            'to_status', new.status
          )
        );
      end loop;
    end if;
    return new;
  end if;

  if new.status = 'submitted' and v_old is distinct from 'submitted' then
    for v_uid in select * from public.profile_ids_finance_controllers()
    loop
      perform public.notification_enqueue(
        v_uid,
        'approval_pending',
        jsonb_build_object(
          'submission_id', new.id,
          'franchise_id', new.franchise_id,
          'reporting_period_id', new.reporting_period_id,
          'period_label', v_period_label,
          'from_status', v_old,
          'to_status', new.status
        )
      );
    end loop;
    return new;
  end if;

  if new.status = 'approved' and v_old is distinct from 'approved' then
    if new.submitted_by is not null then
      perform public.notification_enqueue(
        new.submitted_by,
        'submission_approved',
        jsonb_build_object(
          'submission_id', new.id,
          'franchise_id', new.franchise_id,
          'reporting_period_id', new.reporting_period_id,
          'period_label', v_period_label,
          'from_status', v_old,
          'to_status', new.status
        )
      );
    else
      for v_uid in select * from public.profile_ids_franchise_operators(new.franchise_id)
      loop
        perform public.notification_enqueue(
          v_uid,
          'submission_approved',
          jsonb_build_object(
            'submission_id', new.id,
            'franchise_id', new.franchise_id,
            'reporting_period_id', new.reporting_period_id,
            'period_label', v_period_label,
            'from_status', v_old,
            'to_status', new.status
          )
        );
      end loop;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_submissions_notify_status on public.submissions;
create trigger trg_submissions_notify_status
after insert or update of status on public.submissions
for each row
execute procedure public.submissions_notify_on_status_change();

revoke all on function public.submissions_notify_on_status_change() from public;

-- ------------------------------------------------------------
-- Novo período — stub / cron (service_role)
-- ------------------------------------------------------------

create or replace function public.notify_new_period_open(
  p_reporting_period_id uuid,
  p_target_user_ids uuid[] default null
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
  v_inserted int := 0;
  v_uid uuid;
begin
  select rp.label into v_label
  from public.reporting_periods rp
  where rp.id = p_reporting_period_id;

  if v_label is null then
    raise exception 'notify_new_period_open: periodo nao encontrado %', p_reporting_period_id;
  end if;

  if p_target_user_ids is not null and cardinality(p_target_user_ids) > 0 then
    foreach v_uid in array p_target_user_ids
    loop
      if v_uid is not null then
        perform public.notification_enqueue(
          v_uid,
          'new_period',
          jsonb_build_object(
            'reporting_period_id', p_reporting_period_id,
            'period_label', v_label
          )
        );
        v_inserted := v_inserted + 1;
      end if;
    end loop;
    return v_inserted;
  end if;

  for v_uid in
    select distinct p.id
    from public.profiles p
    join public.user_roles ur on ur.profile_id = p.id
    join public.roles r on r.id = ur.role_id
    where r.code = 'franchise_user'
      and p.status = 'active'
  loop
    perform public.notification_enqueue(
      v_uid,
      'new_period',
      jsonb_build_object(
        'reporting_period_id', p_reporting_period_id,
        'period_label', v_label
      )
    );
    v_inserted := v_inserted + 1;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.notify_new_period_open(uuid, uuid[]) from public;
grant execute on function public.notify_new_period_open(uuid, uuid[]) to service_role;

comment on function public.notify_new_period_open is
  'Chamada via cron/Edge com service_role. Lista opcional de UUIDs; default notifica franchise_user ativos.';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.notifications enable row level security;

revoke insert on public.notifications from anon, authenticated;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (user_id = (select auth.uid()));

grant select, update, delete on public.notifications to authenticated;

-- ------------------------------------------------------------
-- Realtime (Supabase): STOP-AND-CALL se falhar (permissões / produto).
-- ------------------------------------------------------------

do $pub$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then
    null;
  when undefined_object then
    raise notice 'NOTIFICATIONS_REALTIME: publication supabase_realtime ausente — habilite Realtime ou adicione a tabela manualmente.';
end
$pub$;

commit;
