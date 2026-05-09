-- =========================================================
-- FEBRACIS | MIGRATION 018: SUBMISSION LINE COMMENTS (U28)
-- Comentários inline por linha de input na submissão DRE.
--
-- Nomenclatura: separado de `submission_issues` (pendências /
-- registos formais de workflow na controladoria).
--
-- Notificações (U07): não há canal push na app. Eventos ficam na
-- tabela `notification_outbox`, processados quando U07 existir.
-- Também registar no `audit_log` é apenas via triggers (INSERT
-- directo está bloqueado na migration 016).
-- =========================================================

begin;

-- ---------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------

create or replace function public.is_finance_controller()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid()
      and r.code = 'finance_controller'
  );
$$;

-- ---------------------------------------------------------
-- Outbox U07 — fila de eventos para worker futuro
-- ---------------------------------------------------------

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.notification_outbox enable row level security;

create policy "notification_outbox_authenticated_none"
on public.notification_outbox for all to authenticated
using (false)
with check (false);

comment on table public.notification_outbox is
  'Fila para U07 — notificações. Cliente só insere via RPC fn_enqueue_notification_outbox (security definer).';

create or replace function public.fn_enqueue_notification_outbox(
  p_event_type text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  select coalesce(nullif(trim(p.full_name), ''), p.email, 'Utilizador')
  into strict new.author_display_name
  from public.profiles p
  where p.id = new.author_id;
  if p_event_type is null or btrim(p_event_type) = '' then
    raise exception 'invalid event_type';
  end if;
  insert into public.notification_outbox (event_type, payload)
  values (btrim(p_event_type), coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.fn_enqueue_notification_outbox(text, jsonb) to authenticated;

-- ---------------------------------------------------------
-- submission_line_comments
-- thread_root_id = id para raiz da thread (parent_id IS NULL).
-- replies: resolved/critical ficam sempre false/null (só na raiz).
-- ---------------------------------------------------------

create table if not exists public.submission_line_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  line_code text not null references public.dre_lines(code) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  author_display_name text not null,
  parent_id uuid references public.submission_line_comments(id) on delete cascade,
  thread_root_id uuid not null,
  content text not null,
  resolved boolean not null default false,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  critical boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint submission_line_comments_content_len check (
    length(btrim(content)) >= 1 and length(content) <= 16000
  ),
  constraint submission_line_comments_resolve_on_reply_ck check (
    parent_id is not null implies (
      resolved = false and resolved_by is null and resolved_at is null and critical = false
    )
  ),
  constraint submission_line_comments_resolved_consistency_ck check (
    resolved = false
    or (
      resolved = true and resolved_by is not null and resolved_at is not null
    )
  ),
  constraint submission_line_comments_root_thread_ck check (
    (parent_id is null and thread_root_id = id)
    or parent_id is not null
  )
);

create index if not exists idx_submission_line_comments_sub_line
on public.submission_line_comments(submission_id, line_code);

create index if not exists idx_submission_line_comments_parent_id
on public.submission_line_comments(parent_id);

create index if not exists idx_submission_line_comments_thread_root_id
on public.submission_line_comments(thread_root_id);

create index if not exists idx_submission_line_comments_open
on public.submission_line_comments(submission_id)
where resolved = false and deleted_at is null and parent_id is null;

create or replace function public.tr_bi_submission_line_comment_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.author_id is null then
    raise exception 'author_id obrigatório.';
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.email), ''), 'Utilizador')
  into strict new.author_display_name
  from public.profiles p
  where p.id = new.author_id;

  if new.parent_id is null then
    if new.resolved or new.resolved_by is not null or new.resolved_at is not null then
      raise exception 'Comentário novo não pode nascer resolvido.';
    end if;
    if new.critical and not (public.is_finance_controller() or public.is_admin()) then
      raise exception 'Apenas controladoria financeira pode marcar novo tópico como crítico.';
    end if;
    new.thread_root_id := new.id;
  else
    select coalesce(c.thread_root_id, c.id)
    into strict new.thread_root_id
    from public.submission_line_comments c
    where c.id = new.parent_id;

    new.resolved := false;
    new.resolved_by := null;
    new.resolved_at := null;
    new.critical := false;
  end if;
  return new;
end;
$$;

create trigger submission_line_comments_bi_thread
before insert on public.submission_line_comments
for each row execute procedure public.tr_bi_submission_line_comment_thread();

create or replace function public.tr_bu_submission_line_comment_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_root_author uuid;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  if old.author_display_name is distinct from new.author_display_name then
    raise exception 'author_display_name é imutável.';
  end if;

  if old.submission_id is distinct from new.submission_id
     or old.line_code is distinct from new.line_code
     or old.author_id is distinct from new.author_id
     or old.parent_id is distinct from new.parent_id
     or old.thread_root_id is distinct from new.thread_root_id
     or old.created_at is distinct from new.created_at then
    raise exception 'Campos imutáveis do comentário não podem ser alterados.';
  end if;

  select c.author_id into v_root_author
  from public.submission_line_comments c
  where c.id = old.thread_root_id
    and c.parent_id is null;

  if old.content is distinct from new.content then
    if not (v_uid = old.author_id or public.is_admin()) then
      raise exception 'Só o autor pode editar o texto do comentário.';
    end if;
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    if v_uid <> old.author_id and not public.is_admin() then
      raise exception 'Só o autor pode remover o comentário.';
    end if;
  end if;

  if old.critical is distinct from new.critical then
    if not (public.is_finance_controller() or public.is_admin()) then
      raise exception 'Apenas controladoria financeira pode marcar comentário como crítico.';
    end if;
    if old.parent_id is not null then
      raise exception 'Crítico aplica-se apenas à raiz da thread.';
    end if;
  end if;

  if old.resolved is distinct from new.resolved
     or old.resolved_by is distinct from new.resolved_by
     or old.resolved_at is distinct from new.resolved_at then
    if old.parent_id is not null then
      raise exception 'Resolução aplica-se apenas à raiz da thread.';
    end if;
    if new.resolved and (
      old.resolved is distinct from new.resolved
      or old.resolved_by is distinct from new.resolved_by
      or old.resolved_at is distinct from new.resolved_at
    ) then
      if not (
        public.is_finance_controller()
        or public.is_admin()
        or v_uid = v_root_author
      ) then
        raise exception 'Só controladoria financeira ou o autor do tópico podem resolver.';
      end if;
      if new.resolved_by is null or new.resolved_at is null then
        raise exception 'Resolução exige resolved_by e resolved_at.';
      end if;
    end if;
    if new.resolved = false and old.resolved = true then
      if not (
        public.is_finance_controller()
        or public.is_admin()
        or v_uid = v_root_author
      ) then
        raise exception 'Só controladoria financeira ou o autor do tópico podem reabrir.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger submission_line_comments_bu_guard
before update on public.submission_line_comments
for each row execute procedure public.tr_bu_submission_line_comment_guard();

alter table public.submission_line_comments enable row level security;

create policy "slc_select_by_submission_scope"
on public.submission_line_comments for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_line_comments.submission_id
    and public.can_access_franchise(s.franchise_id)
));

create policy "slc_insert_by_submission_scope"
on public.submission_line_comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.submissions s
    where s.id = submission_line_comments.submission_id
      and public.can_access_franchise(s.franchise_id)
  )
);

create policy "slc_update_by_participants"
on public.submission_line_comments for update to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_line_comments.submission_id
    and public.can_access_franchise(s.franchise_id)
))
with check (exists (
  select 1 from public.submissions s
  where s.id = submission_line_comments.submission_id
    and public.can_access_franchise(s.franchise_id)
));

grant select, insert, update on public.submission_line_comments to authenticated;

comment on table public.submission_line_comments is
  'Comentários inline por linha DRE (U28). Resolução na raiz: finance_controller ou autor do tópico.';

commit;
