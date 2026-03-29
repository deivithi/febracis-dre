-- =========================================================
-- FEBRACIS | MIGRATION 009: VIEWER ROLE
-- =========================================================

begin;

insert into public.roles (code, name, description)
values (
  'viewer',
  'Visualizador',
  'Acompanha os dados dentro do escopo configurado, sem operar workflow ou edicao.'
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

commit;
