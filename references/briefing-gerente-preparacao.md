# Briefing preparação — apresentação ao gerente (Trilha A)

**Data da preparação automatizada:** 08/05/2026 BRT (America/Sao_Paulo).  
**Fontes:** [`go-live-trilha-a-checklist.md`](./go-live-trilha-a-checklist.md), [`demo-ceo-roteiro.md`](./demo-ceo-roteiro.md), [`project-context.md`](./project-context.md).

---

## A.4 — Três bullets para mensagem de IA (risco reputacional)

Use na abertura ou no encerramento da apresentação ao gerente:

1. **Verdade dos números:** os valores oficiais da DRE vêm sempre do **Postgres e do motor DRE** na submissão; o modelo de linguagem **não** recalcula MC1/MC2/EBITDA nem substitui a grelha gravada.
2. **Assistente sob governança:** o hub **Assistente** é ferramenta de **assistência** e orientação; onde a política exige, o modo **`explain_only`** impede gravação pelo chat (ex.: separação explícita no modo **Dúvidas** — `tab=duvidas` / `assistantProductTab`).
3. **Roadmap honesto:** itens ainda em evolução (ex.: notificações, harness completo dos cenários YAML do agente) ficam **fora da promessa** da demo até sign-off; ver restritos em [`go-live-trilha-a-checklist.md`](./go-live-trilha-a-checklist.md) §“O que não fazer até fechar sign-off gerencial” e [`ux-excellence-roadmap.md`](./ux-excellence-roadmap.md).

Critérios formais do agente: [`docs/dre-agent-evals.yaml`](../docs/dre-agent-evals.yaml) (BC-01..07) e PRD §9-bis.

---

## Smoke produção (A.3 · item 2)

Executado na raiz do clone com:

`SMOKE_PROD_URL=https://febracis-dre.vercel.app` e `SMOKE_STRICT=1`.

**Resultado:** exit code **0**.

Sumário (extraído do script):

```json
{
  "base": "https://febracis-dre.vercel.app",
  "htmlStatus": 200,
  "htmlOk": true,
  "hasRoot": true,
  "scripts_checked": 4,
  "hasUrl": true,
  "hasPub": true,
  "hasProjectRefInBundle": true,
  "strict": true
}
```

**Interpretação:** HTML de produção responde **200**, `#root` presente, bundles JS contêm domínio **supabase.co**, JWT-anon pattern e **project ref** `vwxgrjjwbvdiaqxqbryk` — alinhado ao checklist “app verde” em [`project-context.md`](./project-context.md).

Validação de variáveis no **dashboard Vercel** (A.3 · item 3), migrações **015/016** no Supabase (item 4) e smoke manual login/429/CORS (item 5) continuam como **verificação humana** antes da reunião se ainda não estiverem assinadas.

---

## Ensaio do green path ([`demo-ceo-roteiro.md`](./demo-ceo-roteiro.md))

**Duração-alvo:** 8–12 minutos em **`https://febracis-dre.vercel.app`** (ou staging com dados reais).

Marque cada linha após ensaio com **uma conta real por papel** em produção.

| Ordem | Passo (resumo) | Conta / rota | Ensaiado |
|-------|----------------|--------------|----------|
| §1 | Narrativa: submissão oficial + motor; dashboard só leitura após validação | Oral + contexto | [ ] |
| §2 | Franqueado: hub `/app/assistant` ou `/app/submissions`, `?submission=` | `franchise_user` | [ ] |
| §2–3 | Preview RBV→EBITDA; valor exemplo **reversível** + Salvar rascunho | Submissão editável | [ ] |
| §2 | Modo **Dúvidas**: chat **não** grava valores | `tab=duvidas` | [ ] |
| §3 | Papel leitura: banner modo orientação / `explain_only` | regional ou bloqueado | [ ] |
| §4 | `viewer`: sem Submissões no menu; URL direta → forbidden | `viewer` | [ ] |
| §5 | Opcional: Workflow controladoria | `/app/workflow` | [ ] |

### Capturas executivas (Playwright — opcional)

Com credenciais de smoke definidas:

```bash
set E2E_DRE_EMAIL=...
set E2E_DRE_PASSWORD=...
npm run test:e2e -- demo-screenshots
```

Sem `E2E_DRE_EMAIL` / `E2E_DRE_PASSWORD`, os testes **fazem skip** por desígnio — não substituem o ensaio humano acima.

**Execução agente (08/05/2026 BRT):** `npx playwright test demo-screenshots --reporter=line` — **6 skipped** (sem credenciais E2E no ambiente); comportamento esperado até definir variáveis para capturas locais.

---

## Matriz por papel (A.2)

Preencha **Data / init.** na tabela principal de [`go-live-trilha-a-checklist.md`](./go-live-trilha-a-checklist.md) após login em produção por cada papel (`viewer` … `system_admin`). Detalhe técnico: [`audit-app-logic-2026-05-08.md`](./audit-app-logic-2026-05-08.md) §6.
