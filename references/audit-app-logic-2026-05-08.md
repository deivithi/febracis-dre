# Auditoria de lógica e sincronização — febracis-dre

**Data:** 08/05/2026 BRT  
**Escopo:** repositório `febracis-dre` (frontend Vite/React, rotas, TanStack Query, integração com Supabase e `/api/dre-agent`).  
**Objetivo:** verificar alinhamento RBAC, navegação, chaves de cache, contrato do assistente e CTAs; gates `lint` / `build` / `test` / E2E disponíveis sem erros.

---

## 1. Matriz RBAC (rotas × menu × `ProtectedRoute`)

| Rota | `allowedRoles` em `App.tsx` | Item no menu (`navigation.ts`) | Observação |
|------|-------------------------------|---------------------------------|------------|
| `/app/*` (layout) | (sessão apenas) | — | Perfil obrigatório via `useAccessProfile` no layout. |
| `/app/dashboard` | — | Dashboard (sem `allowedRoles` = todos autenticados) | Alinhado. |
| `/app/guide` | — | Guia | Alinhado. |
| `/app/forbidden` | — | (não listado) | Redireciono de `ProtectedRoute` quando role insuficiente. |
| `/app/submissions` | franchise_user, regional_manager, finance_controller, executive, system_admin | Mesmo conjunto | **`viewer` não** tem rota nem item. |
| `/app/assistant` | idem Submissões | idem | Alinhado. |
| `/app/workflow` | finance_controller, executive, system_admin | Aprovações — mesmo conjunto | Alinhado. |
| `/app/franchises` | regional_manager, finance_controller, executive, system_admin | Franquias — mesmo conjunto | Alinhado. |
| `/app/audit` | finance_controller, executive, system_admin | Auditoria — mesmo conjunto | Alinhado. |
| `/app/admin` | system_admin | Configurações — system_admin | Alinhado. |

**Regra de navegação:** [`AppLayout.tsx`](../src/layouts/app/AppLayout.tsx) filtra itens com `canAccessRoles(accessProfile.roleCodes, item.allowedRoles)`. Itens sem `allowedRoles` (Dashboard, Guia) aparecem para **qualquer** utilizador autenticado, incluindo `viewer` — coerente com `AccessDeniedPage` e Guia.

**Inconsistências críticas encontradas na análise estática:** nenhuma entre `App.tsx`, `navigation.ts` e `ProtectedRoute`.

---

## 2. TanStack Query — raízes e invalidação

| Chave / prefixo | Uso |
|-----------------|-----|
| `['auth','access-profile', userId]` | Perfil e escopos (`useAccessProfile`). |
| `['dashboard', scope, franchiseKey, regionalKey]` | Snapshot do painel (`DashboardPage`). |
| `['submissions', …]` | Lista de submissões por acesso. |
| `['submission-workspace', id]` | Estado da submissão ativa. |
| `['workflow', …]` | Fila e workspace de revisão. |
| `['agent-session', …]`, `['agent-messages', …]` | Assistente por submissão/período. |
| `OPERATIONAL_ROOT_KEYS` em [`submissionQuerySync.ts`](../src/features/submissions/submissionQuerySync.ts) | `submissions`, `dashboard`, `workflow`, `franchises`, `admin-snapshot` após alterações operacionais. |

**Workflow:** [`WorkflowPage.tsx`](../src/features/workflow/WorkflowPage.tsx) invalida `workflow`, `submissions`, `dashboard`, `submission-workspace` — alinhado ao desejado para evitar painel desatualizado após aprovação/devolução.

---

## 3. Assistente — contrato cliente/API

- Modo `explain_only` vs `full`: [`agentPermissions.ts`](../src/features/submissions/agentPermissions.ts) e `useSubmissionsWorkspace` — `applyAssistantFieldUpdates` não aplica alterações em `explain_only` ou quando `assistantProductTab === 'duvidas'`.
- Cobertura automatizada: **`tests/unit/dre-agent-governance.test.ts`**, **`dreAssistant.commands.test.ts`**, **`dre-agent-api.test.ts`** (34 testes no total nesta corrida).

Nenhuma divergência nova identificada entre o comentário de política em `agentPermissions.ts` e o fluxo cliente inspecionado.

---

## 4. Achados e correções (esta rodada)

| Severidade | Descrição | Ação |
|------------|-----------|------|
| **Alto** | ESLint `react-hooks/set-state-in-effect` em `DashboardPage`: `useEffect` chamava `setHoldingFilters` só para inicializar competência holding. | **Removido o efeito.** `deriveHoldingView` em [`holdingDerivations.ts`](../src/features/dashboard/holdingDerivations.ts) já define `activePeriodLabel` quando `selectedPeriodLabel` está vazio (usa `latestNetwork.period_label`). O `<select>` do cockpit usa `value={activePeriodLabel}` — comportamento preservado. |
| **Alto (UX/exec)** | Botão “Notificações” com bolha vermelha sem funcionalidade — falsa impressão de alertas. | Botão **`disabled`**, `aria-label` / `title` “Notificações em desenvolvimento”, bolha removida; estilo `app-header__icon-btn--disabled` em [`layout.css`](../src/styles/components/layout.css). |
| **Médio** | Breadcrumb do segmento `assistant` não tinha etiqueta PT no mapa — caía em “Assistant”. | Entrada **`assistant` → Assistente** em `AppLayout.tsx`. |

---

## 5. Gates automatizados (evidência)

Comandos executados na raiz do clone após as correções:

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | ✓ exit 0 |
| `npm run build` | ✓ exit 0 |
| `npm run test` (Vitest) | ✓ 34 testes, 4 ficheiros |
| `npx playwright test` | ✓ **8 passed**, **8 skipped** (demo/screenshots + assistência guiada sem `E2E_DRE_EMAIL`/`E2E_DRE_PASSWORD`); smoke + landing verdes nos dois projetos (desktop / ultrawide). |

---

## 6. Checklist manual por `RoleCode` (evidência humana recomendada)

A matriz seguinte foi **validada por código-fonte** (linhas RBAC/menu). Para **sign-off executivo**, repetir manualmente em ambiente de staging/produção com uma conta por papel:

| Papel | Rotas esperadas OK | URLs diretas bloqueadas |
|-------|---------------------|-------------------------|
| `viewer` | `/app/dashboard`, `/app/guide` | `/app/submissions`, `/app/assistant`, … → `/app/forbidden` |
| `franchise_user` | + Submissões, Assistente | workflow, franchises (se só franquia), audit, admin conforme política |
| `regional_manager` | + Franquias | admin se não system_admin |
| `finance_controller` | + Workflow, Auditoria (+ resto conforme sócios) | admin |
| `executive` | + Workflow, Auditoria, Franquias | admin |
| `system_admin` | Todas incl. Admin | — |

Para cada conta: login → conferir sidebar → visitar cada rota permitida → tentar uma rota proibida → exercitar 1–3 CTAs (Salvar/enviar, Atualizar leitura dashboard, ação workflow).

---

## 7. Limitações declaradas

- **E2E autenticado completo:** 8 testes ignorados neste ambiente por falta de credenciais E2E; smoke sem login está verde.
- **Garantia “zero defeito” mundial:** exige sempre combinações de dados Supabase que não foram todas exercitadas automaticamente nesta auditoria.

---

## 8. Referências rápidas

- Rotas: [`src/App.tsx`](../src/App.tsx)  
- Menu: [`src/layouts/app/navigation.ts`](../src/layouts/app/navigation.ts)  
- Gate: [`src/router/ProtectedRoute.tsx`](../src/router/ProtectedRoute.tsx)  
- Contexto operacional: [`project-context.md`](./project-context.md)
