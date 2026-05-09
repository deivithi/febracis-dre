-- Vistas salvas de filtros (estilo Linear) — por utilizador, RLS, limite 20.

begin;

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  page text not null
    check (page in ('dashboard', 'submissions', 'approvals', 'audit')),
  filters jsonb not null default '{}'::jsonb,
  sort jsonb,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_views_user_page
  on public.saved_views (user_id, page);

create index if not exists idx_saved_views_user_page_pinned
  on public.saved_views (user_id, page)
  where is_pinned = true;

drop trigger if exists trg_saved_views_updated_at on public.saved_views;
create trigger trg_saved_views_updated_at
  before update on public.saved_views
  for each row execute procedure public.set_updated_at();

create or replace function public.enforce_saved_views_per_user_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_count integer;
begin
  select count(*)::integer into row_count
  from public.saved_views
  where user_id = new.user_id;

  if row_count >= 20 then
    raise exception 'Limite de 20 vistas salvas atingido. Exclua uma vista existente antes de criar outra.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_saved_views_limit on public.saved_views;
create trigger trg_saved_views_limit
  before insert on public.saved_views
  for each row execute procedure public.enforce_saved_views_per_user_limit();

alter table public.saved_views enable row level security;

drop policy if exists saved_views_select_own on public.saved_views;
create policy saved_views_select_own
  on public.saved_views for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists saved_views_insert_own on public.saved_views;
create policy saved_views_insert_own
  on public.saved_views for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists saved_views_update_own on public.saved_views;
create policy saved_views_update_own
  on public.saved_views for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists saved_views_delete_own on public.saved_views;
create policy saved_views_delete_own
  on public.saved_views for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.saved_views to authenticated;

commit;
