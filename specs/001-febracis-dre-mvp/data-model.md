# Modelo de dados — SPEC-001 (Postgres / Supabase)

Fonte DDL: `supabase/migrations/001_foundation.sql` … `016_harden_audit_log_insert.sql`. PRD produto: `docs/PRD-canonical.md` §7 (motor).

## Resumo por domínio

| Domínio | Tabelas principais | Notas |
|---------|-------------------|--------|
| Identidade | `profiles`, `roles`, `user_roles`, `user_scopes` | Trigger `handle_new_user` → `profiles`. |
| Organização | `regionals`, `franchises` | Hierarquia regional → franquias. |
| Calendário | `reporting_periods`, `period_franchise_status` | `label` YYYY-MM gerado; estado por franquia/período. |
| Eventos | `event_types`, `events` | Fluxo eventos (quando aplicável ao negócio). |
| Catálogo DRE | `dre_sections`, `dre_lines`, `dre_line_groups`, `dre_line_group_items` | Linhas `input` vs calculadas via motor. |
| Submissão | `submissions`, `submission_input_values`, `submission_attachments`, `submission_status_history`, `submission_issues`, `submission_approvals` | Versão oficial por fluxo. |
| Motor | `calculation_rule_versions`, `calculation_rules`, `calculation_rule_dependencies`, `submission_calculated_values`, `submission_kpis` | `004_calculation_engine.sql`. |
| Validação | `validation_rules`, `submission_validation_results` | Gating controladoria. |
| Auditoria | `audit_log` | Triggers `006`; INSERT endurecido em `016` (ver nota `015_*`). |
| Dashboard / views | Objetos em `005_views.sql`, `007_secure_dashboard_views.sql` | Leitura agregada sob RLS. |
| Agente | `agent_sessions`, `agent_messages` (`014`); `agent_rate_limits` (`015_agent_rate_limits`) | Sessão por `profile_id` + `submission_id`. |
| Demo / util | `008_demo_admin_tools.sql` | Ferramentas de demo controladas. |

## Índices (alto nível)

- **001:** índices estratégicos em FKs e campos de filtro de submissão/período (ver ficheiro para lista completa).
- **014:** `idx_agent_sessions_profile_submission_mode` (único parcial), `idx_agent_sessions_profile_id`, `idx_agent_sessions_franchise_id`, `idx_agent_sessions_last_message_at`; `idx_agent_messages_session_id_created_at`.
- **015 (rate limits):** `idx_agent_rate_limits_profile_window`.

## RLS

Activado em massa em `002_rls_policies.sql`; funções `is_admin`, `has_network_scope`, `can_access_franchise`, `can_manage_review`. Evoluções: `009` (viewer), `010`–`011`, `013`, políticas `014`–`015`, `016` sobre `audit_log`. Resumo narrativo: `contracts/rls-policies.md`.

## Diff lógico vs “estado instalado” e duplicado `015_*`

No **repositório** coexistem **dois** ficheiros com prefixo `015_`:

1. `supabase/migrations/015_harden_audit_log_insert.sql`
2. `supabase/migrations/015_agent_rate_limits.sql`

Isto pode gerar **ordem lexical ambígua** entre clones/ambientes (`015_harden_*` antes de `015_agent_*`). O `references/project-context.md` documenta a convenção operacional desejada: **015 = rate limits**, **016 = hardening audit** — porém o ficheiro `015_harden_audit_log_insert.sql` ainda existe no tree e deve ser **reconciliado** (renomear/remover/aplicar apenas num ramo) com evidência de `supabase migration list` no projeto `vwxgrjjwbvdiaqxqbryk` e nos clones de desenvolvimento.

**Acção SPEC:** tarefa **T01** (plano de implementação) fecha esta divergência antes de qualquer `db push` em ambiente novo.

## TypeScript

[Não há] `database.generated.ts` no layout analisado na Fase 1 (`specs/001-febracis-dre-mvp/research.md` §2): tipos partilhados em `src/features/shared/portal.types.ts` — gap de paridade DDL↔TS até geração Supabase ou disciplina manual.
