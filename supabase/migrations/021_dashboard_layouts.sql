-- Layouts de painel personalizáveis por utilizador e âmbito do dashboard (MVP: uma linha por user+scope).

begin;

create table if not exists public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dashboard_scope text not null
    check (
      dashboard_scope in ('franchise', 'regional', 'holding', 'controladoria')
    ),
  role text not null default 'viewer',
  widgets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.dashboard_layouts is
  'Widgets e posições do painel executivo; JSON alinhado ao react-grid-layout no cliente.';

comment on column public.dashboard_layouts.role is
  'Instantâneo do role_code no último save (defaults por papel vêm de defaultLayouts.ts).';

-- MVP: um layout por utilizador e âmbito.
create unique index if not exists dashboard_layouts_user_scope_key
  on public.dashboard_layouts (user_id, dashboard_scope);

drop trigger if exists trg_dashboard_layouts_updated_at on public.dashboard_layouts;
create trigger trg_dashboard_layouts_updated_at
  before update on public.dashboard_layouts
  for each row execute procedure public.set_updated_at();

alter table public.dashboard_layouts enable row level security;

drop policy if exists dashboard_layouts_select_own on public.dashboard_layouts;
create policy dashboard_layouts_select_own
  on public.dashboard_layouts for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists dashboard_layouts_insert_own on public.dashboard_layouts;
create policy dashboard_layouts_insert_own
  on public.dashboard_layouts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists dashboard_layouts_update_own on public.dashboard_layouts;
create policy dashboard_layouts_update_own
  on public.dashboard_layouts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists dashboard_layouts_delete_own on public.dashboard_layouts;
create policy dashboard_layouts_delete_own
  on public.dashboard_layouts for delete
  to authenticated
  using (user_id = auth.uid());

commit;

-- Seeds opcionais por papel (defaults em cliente — primeiro acesso):
-- viewer: KPI + fila resumida
-- finance_controller | executive | system_admin: KPI + tendência + auditoria + fila
