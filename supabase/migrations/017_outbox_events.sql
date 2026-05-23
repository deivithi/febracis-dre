-- 017_outbox_events.sql
-- Piloto outbox transacional (DDIA caps 10–11): transições de workflow via fn_set_submission_status.
-- Worker relay: api/outbox-dispatcher.ts (Vercel Cron).

-- =========================================================
-- Tabela outbox
-- =========================================================

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null default 'submission',
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  idempotency_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'published', 'failed')),
  retry_count int not null default 0 check (retry_count >= 0),
  available_at timestamptz not null default now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint outbox_events_idempotency_key_unique unique (idempotency_key)
);

create index if not exists idx_outbox_events_pending_available
  on public.outbox_events (available_at asc)
  where status in ('pending', 'failed');

create index if not exists idx_outbox_events_aggregate
  on public.outbox_events (aggregate_type, aggregate_id, created_at desc);

alter table public.outbox_events enable row level security;

revoke all on table public.outbox_events from anon, authenticated;
grant select, insert, update, delete on table public.outbox_events to service_role;

comment on table public.outbox_events is
  'Fila transacional at-least-once para efeitos externos (telemetria, webhooks). Escrita na mesma TX que fn_set_submission_status.';

-- =========================================================
-- fn_set_submission_status — choke point + enqueue outbox
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
  where id = p_submission_id;

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

  -- Piloto outbox: eventos de workflow com telemetria PRD §15
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
-- Worker RPCs (service_role only)
-- =========================================================

create or replace function public.fn_claim_outbox_events(p_limit int default 25)
returns setof public.outbox_events
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit deve estar entre 1 e 100';
  end if;

  return query
  update public.outbox_events e
  set
    status = 'processing',
    retry_count = e.retry_count + 1
  where e.id in (
    select o.id
    from public.outbox_events o
    where o.status in ('pending', 'failed')
      and o.available_at <= now()
    order by o.available_at asc, o.created_at asc
    limit p_limit
    for update skip locked
  )
  returning e.*;
end;
$$;

create or replace function public.fn_complete_outbox_event(
  p_event_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_retry_count int;
  v_backoff_seconds int;
begin
  select retry_count into v_retry_count
  from public.outbox_events
  where id = p_event_id;

  if v_retry_count is null then
    raise exception 'Evento outbox não encontrado: %', p_event_id;
  end if;

  if p_success then
    update public.outbox_events
    set
      status = 'published',
      published_at = now(),
      last_error = null
    where id = p_event_id;
    return;
  end if;

  v_backoff_seconds := least(3600, greatest(30, (2 ^ least(v_retry_count, 10)) * 30));

  update public.outbox_events
  set
    status = 'failed',
    last_error = left(coalesce(p_error, 'unknown error'), 2000),
    available_at = now() + make_interval(secs => v_backoff_seconds)
  where id = p_event_id;
end;
$$;

revoke execute on function public.fn_claim_outbox_events(int) from public, anon, authenticated;
grant execute on function public.fn_claim_outbox_events(int) to service_role;

revoke execute on function public.fn_complete_outbox_event(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.fn_complete_outbox_event(uuid, boolean, text) to service_role;
