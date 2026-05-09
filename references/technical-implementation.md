# Febracis DRE — implementação técnica (contrato arquivo↔dados)

**Última revisão:** 09/05/2026 BRT.

Este doc consolida o que o [`PRD-canonical.md`](../docs/PRD-canonical.md) aponta como referência técnica cruzada: rotas SPA, migrações Supabase aplicáveis ao portal gerencial **DRE**, e políticas **RLS** nas tabelas centrais. A operação continuada (`deploy`, assistente, envs) continua centralizada em [`project-context.md`](./project-context.md).

## Projeto Supabase (produção canónica — referência)

- **Projeto:** `febracis-dre`, ref **`vwxgrjjwbvdiaqxqbryk`**, detalhes em [`project-context.md`](./project-context.md).

## Índice de migrações (fonte código)

Ordem esperada sob `supabase/migrations/` (prefixo lexical):

| Ficheiro | Tema principal |
|----------|----------------|
| `001_foundation.sql` | Schema base: identidade, `reporting_periods`, `period_franchise_status`, catálogo DRE (`dre_lines`, …), `submissions`, auditoria (`audit_log`), índices. |
| `002_rls_policies.sql` | RLS helpers (`is_admin`, `can_access_franchise`, `can_manage_review`, …); políticas iniciais. |
| `003_seed_data.sql` … `014_*` | Motor, vistas, demos, workflows, sessões agente — ver comentários no topo de cada ficheiro. |
| `015_agent_rate_limits.sql` | Rate limit assistente (`agent_rate_limits`, RLS, `fn_agent_rate_check`). Remoto registado como migração com timestamp próprio equivalente (`agent_rate_limits`). |
| `016_harden_audit_log_insert.sql` | Remove política permissiva de INSERT em `audit_log`; `revoke insert` para `anon`/`authenticated`; INSERT só via triggers `security definer`. Remoto: `harden_audit_log_insert`. |

**Reposição histórica:** o ficheiro duplicado `015_harden_audit_log_insert.sql` foi **removido do repositório** (conteúdo equivalente apenas em `016_*`) para não haver dois prefixos `015_` nem reaplicação ambígua em novos clones.

## Rollback versionado (`supabase/rollbacks/`)

- Para cada `supabase/migrations/NNN_nome.sql` existe **`supabase/rollbacks/NNN_nome.down.sql`** (par 1:1). O CLI de migrações do Supabase continua só **forward**; os `.down.sql` são artefactos para **clone local**, **DR** ou hotfix pontual aplicados à mão (**`psql`**, não Dashboard).
- **Ordem:** em cenários multi-migração, aplicar `down` por **número decrescente** (016 antes de 015, …), como descrito em [`supabase/rollbacks/README.md`](../supabase/rollbacks/README.md).
- **Validação:** `npm run validate:migrations`. **Teste opcional down+replay** sobre stack local (Docker + psql): `SUPABASE_DB_ROLLBACK_TEST=1 npm run test:rollback:local` (definir `TARGET=015` se necessário).

## RLS nas tabelas foco (`public`)

Validação sob produção (**09/05/2026 BRT**): colunas dessas quatro entidades conferidas com [`001_foundation.sql`](../supabase/migrations/001_foundation.sql); políticas ativas conferidas na base remota (`pg_policies`).

### Funções helper (conceito)

| Função | Uso típico em RLS |
|--------|-------------------|
| `is_admin()` | Escrita/admin em catálogo, períodos, etc. |
| `has_network_scope()` | Membro rede / escopo não-franquia singular. |
| `can_access_franchise(uuid)` | Leitura e presença no escopo de uma franquia (franquia, regional ou rede). |
| `can_manage_review()` | Controladoria / executivo com revisão (`finance_controller`, `executive`, `system_admin`). |
| `can_operate_submission(uuid)` | Introduzida em **`010`** — apenas quem pode *operar* a submissão (ex.: franquia com papel `franchise_user`), não apenas `viewer`. |

### Matriz resumida (objeto → comando → condição principal)

Políticas correntes no remoto nas quatro superfícies:

| Objeto (`public`) | Comando | Condição (USING / WITH CHECK resumidos) |
|-------------------|---------|----------------------------------------|
| **`dre_lines`** | SELECT | `true` (qualquer autenticado lê catálogo). |
| **`dre_lines`** | INSERT/UPDATE/DELETE (ALL) | `is_admin()` com WITH CHECK igual. |
| **`submissions`** | SELECT | `can_access_franchise(franchise_id)`. |
| **`submissions`** | INSERT | `can_operate_submission(franchise_id)`. |
| **`submissions`** | UPDATE | `can_operate_submission(franchise_id) OR can_manage_review()`. |
| **`reporting_periods`** | SELECT | `true` autenticado. |
| **`reporting_periods`** | INSERT/UPDATE/DELETE (ALL) | `is_admin()`. |
| **`audit_log`** | SELECT | `can_manage_review()` (**rota SPA** `/app/audit` mesmo recorte funcional). |
| **`audit_log`** | INSERT | **Nenhuma** política a favor de `authenticated`/`anon`; triggers `SECURITY DEFINER` (migração **006**/ajustes **012**) inserem; ver **016**. |

**Notas:**

- Writes em `submission_input_values`, anexos, KPIs calculados e workflow seguem sempre a cadeia `submissions` + estados permitidos nos ficheiros **002** e **010**.
- **`period_franchise_status`** (estado por competência × franquia) permanece sob `can_manage_review()` para escritas ALL em **002**; leituras por `can_access_franchise(franchise_id)`.

## Rotas SPA (mapa rápido)

| Rota | Fonte principal |
|------|----------------|
| Landing / login | `src/features/auth/LoginPage.tsx` |
| App shell / navegação | `src/layouts/app/AppLayout.tsx`, `navigation.ts` |
| Guarda de papel | `src/router/ProtectedRoute.tsx`, `src/features/auth/access.ts` |
| Submissões / assistente | `SubmissionsPage.tsx`, `AssistantPage.tsx`, `portal.api.ts` |
| Auditoria (`/app/audit`) | `AuditPage.tsx` + `fetchAuditEntries` (`audit_log`). |
| Workflow controladoria | `WorkflowPage` (área revisão); RPCs ver `portal.api.ts`. |

## Advisors Supabase (security)

Rodar periodicamente **`get_advisors`** (tipo `security`) no projeto ligado — [documentação linter](https://supabase.com/docs/guides/database/database-linter). São comuns **avisos WARN** sobre `SECURITY DEFINER` exposta via PostgREST a `anon`/`authenticated`; corrigir com `REVOKE EXECUTE ... FROM anon` (e avaliação caso a caso) é backlog de endurecimento separado quando houver regressão garantida contra o cliente SPA e Edge Functions — **fora deste ciclo**, que focou reconciliação de migrações e matriz documental.
