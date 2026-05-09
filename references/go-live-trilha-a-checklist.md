# Trilha A — Go-live: demo executiva + validação gerencial + produção

**Objetivo:** narrativa estável para apresentação ao dono (sexta) e validação com gerente (segunda), sem surpresas.  
**Fontes cruzadas:** [demo-ceo-roteiro.md](./demo-ceo-roteiro.md), [audit-app-logic-2026-05-08.md](./audit-app-logic-2026-05-08.md) §6, [project-context.md](./project-context.md) (SSOT Vercel/Supabase).

**Regra:** antes da demo ao dono, percorrer **apenas** o “green path” ensaiado abaixo; declarar explicitamente o que está **fora do escopo** da demo se pedirem feature não ensaiada.

---

## A.1 Inventário da demo (roteiro CEO)

| # | Passo | Rota / contexto | Feito (demo) |
|---|--------|-----------------|--------------|
| 1 | Contexto produto: submissão oficial + motor; dashboard só leitura válida | Narrativa oral + [`demo-ceo-roteiro.md`](./demo-ceo-roteiro.md) §1 | [ ] |
| 2 | Papel franqueado: hub Assistente (Dúvidas / Começar a DRE) ou Submissões + `?submission=` | `/app/assistant`, `/app/submissions` | [ ] |
| 3 | Preview RBV→EBITDA + Salvar rascunho (valor de exemplo reversível) | Workspace submissão editável | [ ] |
| 4 | Modo **Dúvidas**: sem gravar valores pelo chat | `tab=duvidas` / `assistantProductTab` | [ ] |
| 5 | Papel leitura: modo orientação / `explain_only` | regional ou submissão bloqueada | [ ] |
| 6 | Governança: `viewer` sem Submissões no menu; URL proibida → forbidden | `viewer` + teste URL | [ ] |
| 7 | Encerramento: fila Workflow (controladoria), se aplicável | `/app/workflow` | [ ] |

---

## A.2 Checklist manual por papel (sign-off gerente / homologação)

Reutiliza a matriz da auditoria 08/05/2026. Para cada conta em **produção** ou **staging com dados reais**:

| Papel | Sidebar + rotas OK | URL proibida → `/app/forbidden` | CTAs críticos (amostra) | Data / init. |
|-------|--------------------|----------------------------------|-------------------------|--------------|
| `viewer` | dashboard, guia | submissions, assistant, … | — | [ ] |
| `franchise_user` | + Submissões, Assistente | workflow/admin conforme política | Salvar rascunho, assistente | [ ] |
| `regional_manager` | + Franquias | admin se não admin | — | [ ] |
| `finance_controller` | + Workflow, Auditoria | admin | Aprovar / devolver | [ ] |
| `executive` | + Workflow, Auditoria, Franquias | admin | — | [ ] |
| `system_admin` | todas incl. Admin | — | provision se usado | [ ] |

Detalhe e critérios de código-fonte: [audit-app-logic-2026-05-08.md](./audit-app-logic-2026-05-08.md) §6.

---

## A.3 Entorno produção (ops)

| # | Verificação | Como | OK |
|---|-------------|------|-----|
| 1 | Alias canónico | `https://febracis-dre.vercel.app` (team `deivithis-projects`) | [ ] |
| 2 | Bundle com Supabase canónico | `SMOKE_PROD_URL=https://febracis-dre.vercel.app npm run smoke:prod` (opc. `SMOKE_STRICT=1`) | [ ] |
| 3 | Vercel Production envs | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, variáveis `api/dre-agent`, `ADMIN_PROVISION_ALLOWED_ORIGINS` — ver [project-context.md](./project-context.md) §Checklist app verde | [ ] |
| 4 | Migrações **015** (rate limit) e **016** (audit_log) no projeto `vwxgrjjwbvdiaqxqbryk` | `supabase migration list --linked` ou Dashboard | [ ] |
| 5 | Smoke manual pós-deploy | login, assistente, 429 se testar limite, CORS admin — [operacoes-pendentes-supabase-vercel-2026-04-27.md](./operacoes-pendentes-supabase-vercel-2026-04-27.md) | [ ] |

### Registo automático do smoke (script)

Quando o agente correr o smoke na raiz do clone, acrescentar aqui a data e o sumário JSON (ou colar saída resumida):

- **Última execução documentada (09/02/2026 BRT, agente):** `npm run smoke:prod` com `SMOKE_PROD_URL=https://febracis-dre.vercel.app` — **exit 0**; `hasProjectRefInBundle: true`; `htmlStatus: 200`; `strict: false`.

---

## A.4 Risco reputacional IA (mensagem ao dono)

- Números oficiais: **Postgres + motor DRE**, não LLM.
- Assistente: **assistência**; `explain_only` quando política exige; BC-01..07 em [dre-agent-evals.yaml](../docs/dre-agent-evals.yaml) / PRD §9-bis.
- Funcionalidades em desenvolvimento: copy honesta (ex.: notificações — ver auditoria 08/05).

---

## O que não fazer até fechar sign-off gerencial

- Grandes refactors de design tokens ou troca de design system inteiro ([dashboard-ux-benchmark.md](./dashboard-ux-benchmark.md) §4).
- Wiring completo do harness CI dos 50 cenários YAML (onda **prd-phases-followup** / PRD §9-bis.6).

Ver também: [ux-excellence-roadmap.md](./ux-excellence-roadmap.md) (scorecard e ondas pós-demo).
