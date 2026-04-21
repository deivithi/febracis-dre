-- =========================================================
-- FEBRACIS | MIGRATION 015: HARDEN AUDIT LOG INSERT
-- =========================================================
-- Resolve H-PULSO-1 (auditoria seguranca 2026-04-21):
-- `audit_log_insert_any` permitia INSERT manual por qualquer
-- user autenticado c/ atribuicao controlavel (performed_by,
-- table_name, old_data, new_data) = log poisoning.
--
-- Triggers de auditoria (migration 006: fn_audit_trigger) usam
-- `security definer` e bypassam RLS, entao drop da policy +
-- revoke de INSERT direto NAO quebra funcionamento legitimo.
-- =========================================================

begin;

drop policy if exists "audit_log_insert_any" on public.audit_log;

revoke insert on public.audit_log from anon, authenticated;

comment on table public.audit_log is
  'Audit trail. INSERT reservado a triggers security definer (fn_audit_trigger). Qualquer INSERT direto por anon/authenticated esta bloqueado desde migration 015.';

commit;
