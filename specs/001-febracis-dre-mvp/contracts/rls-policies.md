# RLS e políticas — remissões (SPEC-001)

Este ficheiro **não** duplica SQL completo. A fonte canónica das políticas base é `supabase/migrations/002_rls_policies.sql`; comportamento adicional empilha-se nas migrações `003`–`016`.

## Funções helper (`security definer`, `search_path` fixo)

Definidas em `002_rls_policies.sql` (trecho referência linhas 11–82 do ficheiro):

| Função | Papel na decisão de acesso |
|--------|----------------------------|
| `is_admin()` | `system_admin` em `user_roles` + `roles`. |
| `has_network_scope()` | `user_scopes.scope_type = 'network'`. |
| `can_access_franchise(uuid)` | Admin, rede, franquia directa, ou regional com franchise na mesma regional. |
| `can_manage_review()` | Admin ou papéis `finance_controller`, `executive`, `system_admin`. |

## Grupos de tabelas (alto nível)

1. **Identidade e organização:** `profiles`, `roles`, `user_roles`, `regionals`, `franchises`, `user_scopes` — RLS em `002`; leitura/escrita condicionada a self ou admin / escopo.
2. **Calendário e submissão:** `reporting_periods`, `period_franchise_status`, `submissions`, `submission_input_values`, anexos, histórico, validações — políticas amarradas a `can_access_franchise` e papéis de revisão onde aplicável.
3. **Modelo DRE:** `dre_sections`, `dre_lines`, grupos, regras de cálculo, valores calculados, KPIs — maioritariamente leitura ampla para autenticados com escopo; escritas restritas a fluxos administrativos/engine.
4. **Auditoria:** `audit_log` — triggers security definer (`006`); hardening INSERT em `016_harden_audit_log_insert.sql` (revoga insert directo para `anon`/`authenticated`; inserções via triggers).
5. **Agente:** `014_agent_sessions_and_messages.sql` — `agent_sessions` / `agent_messages` por `profile_id`, `can_access_franchise`, `is_admin`, `can_manage_review` conforme operação; índice único parcial `(profile_id, submission_id, assistant_mode)`.
6. **Rate limit assistente:** `015_agent_rate_limits.sql` — tabela `agent_rate_limits` sem escrita directa pelo role `authenticated`; contagem via `fn_agent_rate_check` (security definer).

## Migrações que alteram RLS / workflow (resumo)

| Ficheiro | Tema |
|----------|------|
| `009_viewer_role.sql` | Papel `viewer` e políticas de leitura. |
| `010_access_and_submission_workflows.sql` | Workflow / estados / permissões alinhadas a controladoria. |
| `011_submission_lock_and_dre_validation.sql` | Bloqueios de edição e validação DRE (BC-05). |
| `013_access_directory_effective_scope.sql` | Escopo efectivo no directório de acessos. |
| `015_harden_audit_log_insert.sql` | *Duplicado de prefixo `015_*`* — ver `data-model.md`; conteúdo: endurecimento audit log (no repositório atual convive com `015_agent_rate_limits.sql`; validar ordem aplicada no projecto Supabase). |
| `016_harden_audit_log_insert.sql` | Versão renumerada do hardening audit (`references/project-context.md`). |

## Personas × RLS (checklist SPEC §11)

| Persona (código `roles` / escopo) | Mecânica |
|-----------------------------------|----------|
| Franquia (`franchise_user` + scope franquia) | `can_access_franchise` só para a própria unidade; edição de valores só com políticas + estado de submissão editável. |
| Regional (`regional_manager` + scope regional) | Acesso às franquias da regional via join em `can_access_franchise`; sem escrita em valores alheios. |
| Controlador / Executivo | `can_manage_review()` e rotas UI; transições oficiais de workflow não passam por LLM (BC-04). |
| Admin (`system_admin`) | `is_admin()` — bypass controlado nas políticas definidas. |
| Viewer | Leitura conforme `009`; sem mutação de submissão. |

Para matriz UX vs RLS detalhada, ver também `references/audit-app-logic-2026-05-08.md`.
