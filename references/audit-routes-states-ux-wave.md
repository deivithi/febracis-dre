# Auditoria de estados UX por rota (onda 0) — alinhamento PRD §14

**Referência normativa:** [docs/PRD-canonical.md](../docs/PRD-canonical.md) §14 (critérios de aceite globais).  
**Objetivo:** inventariar **loading**, **erro**, **vazio** e **acesso negado (forbidden)** por rota autenticada, para regressão visual/copy e coerência com estados “honestos” (§14.4–5, 7).

## Convenções de componente

| Padrão | Uso |
|--------|-----|
| `page-loading` + spinner | Carregamento inicial de dados ou permissões |
| `skeleton skeleton--card` | Placeholder de página sem layout final |
| `inline-message inline-message--danger` | Falha de rede/API ou dados ausentes |
| `inline-message` (neutro) / `--success` | Avisos operacionais |
| `empty-state` | Lista/tabela sem linhas **com mensagem explícita** |
| Redirecionamento `Navigate` → `/app/forbidden` | RBAC: utilizador autenticado sem papel na rota ([`ProtectedRoute`](../src/router/ProtectedRoute.tsx)) |

---

## `/app/dashboard` — Painel executivo

| Estado | Comportamento | Âncora §14 |
|--------|---------------|------------|
| **Loading** | `accessProfileQuery` ou `dashboardQuery` → conteúdo de loading antes do hero | §14.7 KPI só estados oficiais (dados aguardando snapshot) |
| **Erro** | `inline-message--danger` perfil ou snapshot indisponível | §14.1 coerência escopo |
| **Vazio (dados)** | Hero: `inline-message` quando não há DREs/pendências no escopo; KPIs podem refletir zeros conforme vista | §14.7 sem misturar rascunho em leitura executiva |
| **Forbidden** | Não aplica — rota só `ProtectedRoute` base (sem `allowedRoles` restrito) | §3 RBAC |

---

## `/app/submissions` — Workspace DRE (franquia / escopo)

| Estado | Comportamento | Âncora §14 |
|--------|---------------|------------|
| **Loading** | Múltiplos `useQuery` → `skeleton` até franquias/períodos/submissões | §6.2 |
| **Erro** | Mensagem danger genérica de carga | §14.4 feedback honesto |
| **Vazio** | “Nenhuma franquia no escopo” no title bar; tabela de escopo vazia com copy contextual | §14.1 |
| **Forbidden** | Papéis sem acesso à rota → `/app/forbidden` | §3 |

**Paridade API assistente (Submissões vs hub):** em [`useSubmissionsWorkspace`](../src/features/submissions/useSubmissionsWorkspace.ts) o body para `POST /api/dre-agent` **omite** `assistantProductTab` no modo preenchimento normal; só envia `assistantProductTab: 'duvidas'` quando explícito — alinhado a [`api/dre-agent.ts`](../api/dre-agent.ts) (`assistantProductTab` opcional Zod). Ver também secção “Sincronização UI ↔ API” abaixo.

---

## `/app/assistant` — Hub Assistente DRE

| Estado | Comportamento | Âncora §14 |
|--------|---------------|------------|
| **Loading** | Igual Submissões (`skeleton`) | §14.4–5 agente |
| **Erro** | Danger: não carregar assistente | §14.5 |
| **Vazio** | Sem franquias: subtítulo “Nenhuma franquia disponível…” | §14.1 |
| **Forbidden** | Mesmos papéis que Submissões | §3 |

**Produto:** query `tab=duvidas` → `assistantProductTab: 'duvidas'` → `explain_only` no cliente e **campo enviado** na mutação para o servidor.

---

## `/app/workflow` — Aprovações (controladoria)

| Estado | Comportamento | Âncora §14 |
|--------|---------------|------------|
| **Loading** | `skeleton` | — |
| **Erro** | Danger fila indisponível; erros de mutação em banner | §14.4 |
| **Vazio** | `empty-state--compact` “Tudo em dia” quando fila length 0 | §14.4 |
| **Forbidden** | `finance_controller`, `executive`, `system_admin` apenas | §3 |

---

## `/app/franchises` — Carteira

| Estado | Comportamento | Âncora §14 |
|--------|---------------|------------|
| **Loading** | `skeleton` | — |
| **Erro** | Danger carteira | §14.4 |
| **Vazio** | `empty-state` “Nenhuma franquia encontrada” | §14.1 |
| **Forbidden** | Papéis regional+ | §3 |

---

## `/app/audit` — Auditoria

| Estado | Comportamento | Âncora §14 |
|--------|---------------|------------|
| **Loading** | `skeleton` | — |
| **Erro** | Danger log | §14.4 |
| **Vazio** | `empty-state` sem eventos | §14.4 |
| **Forbidden** | Controladoria / executivo / admin | §3 |

---

## `/app/admin` — Administração

| Estado | Comportamento | Âncora §14 |
|--------|---------------|------------|
| **Loading** | `skeleton` | — |
| **Erro** | Danger snapshot admin | §14.4 |
| **Vazio** | Conteúdo depende de snapshot — operação demo lista vazia com mensagens em cartões quando aplicável | — |
| **Forbidden** | Só `system_admin` | §3 |

---

## `/app/forbidden` — Acesso negado

Renderizado via `Navigate` com `state` (caminho tentado + papéis permitidos). Utilizador autenticado mas sem papel: **não** é página “login”.

---

## Sincronização UI ↔ API do agente (paridade Zod)

| Contexto | `assistantProductTab` no JSON |
|----------|----------------------------------|
| **AssistantPage** | `duvidas` ou omitido conforme aba URL (`preencher` = omitir campo) |
| **Submissões (dock/painel)** | Omitido para fluxo preencher; só `duvidas` quando UI estiver em modo perguntas (se aplicável) |

Contrato: [`api/dre-agent.ts`](../api/dre-agent.ts) `assistantProductTabSchema.optional()` — omitir equivale a fluxo **preencher** no produto atual.

**Última revisão:** 08/05/2026 BRT.
