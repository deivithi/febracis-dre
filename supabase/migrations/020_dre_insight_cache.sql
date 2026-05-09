-- =========================================================
-- FEBRACIS | MIGRATION 020: Cache de Insights AI (dashboard)
-- =========================================================
-- Tabela Postgres + RLS: utilizador lê/escreve apenas linhas com user_id = auth.uid().
-- TTL lógico (4h) aplicado na API — linhas antigas podem ser ignoradas ou sobrescritas via upsert.

begin;

create table if not exists public.dre_insight_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope_hash text not null,
  insights jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, scope_hash)
);

create index if not exists dre_insight_cache_user_scope_idx
  on public.dre_insight_cache (user_id, scope_hash);

create index if not exists dre_insight_cache_generated_idx
  on public.dre_insight_cache (generated_at desc);

comment on table public.dre_insight_cache is
  'Cache de cartões de insights do dashboard (JSON), por utilizador e chave de escopo; TTL na camada API.';

alter table public.dre_insight_cache enable row level security;

create policy "dre_insight_cache_select_own"
  on public.dre_insight_cache
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "dre_insight_cache_insert_own"
  on public.dre_insight_cache
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "dre_insight_cache_update_own"
  on public.dre_insight_cache
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "dre_insight_cache_delete_own"
  on public.dre_insight_cache
  for delete
  to authenticated
  using (user_id = auth.uid());

commit;
