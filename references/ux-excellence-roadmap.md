# Roadmap de excelência UX / acessibilidade (web densa, nicho Febracis DRE)

**Objetivo:** elevar UI/UX sem prometer “skin Apple” literal: alinhar a **heurísticas Nielsen**, **WCAG 2.2** onde aplicável ao produto web, **Material Design 3** como referência de dados densos/tabelas e **HIG Apple** só como inspiração de clareza e feedback — sempre com marca e densidade institucional Febracis.

**Não substitui:** [docs/PRD-canonical.md](../docs/PRD-canonical.md) (§13–§15) nem [project-context.md](./project-context.md) (ops). Este ficheiro agenda **ondas** compatíveis com o PRD.

**Go-live imediato:** [go-live-trilha-a-checklist.md](./go-live-trilha-a-checklist.md).

---

## 1. Scorecard (0 = gap relevante, 3 = alinhado ao alvo declarado)

Pontuação **subjetiva até auditoria formal**; atualizar após cada onda. Referência de gaps do dashboard: [dashboard-ux-benchmark.md](./dashboard-ux-benchmark.md).

| Dimensão | Âncora externa | Estado alvo (Febracis) | Notas / ligação PRD §14 | Score (0–3) |
|----------|----------------|------------------------|--------------------------|-------------|
| **Clareza e hierarquia** | [Nielsen — 10 heurísticas](https://www.nngroup.com/articles/ten-usability-heuristics/) | Um vocabulário para escopo/competência; hierarquia hero → KPI → detalhe sem duplicidade | §14.1–3, 7; gap “cobertura vs modo” em [dashboard-ux-benchmark §2](./dashboard-ux-benchmark.md) | _preencher_ |
| **Confiança nos dados** | Boas práticas BI executivo (já citadas no benchmark) | Freshness BRT, selo rascunho vs oficial, KPIs sem misturar drafts | §14.7, cockpit documentado | _preencher_ |
| **Acessibilidade web** | [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) | Contraste, foco visível, teclado em tabelas/form DRE, labels | Cross-cutting §14; regressão com mudanças UI | _preencher_ |
| **Dados densos / tabelas** | [Material Design 3](https://m3.material.io) + WAI-ARIA para grelhas | Landmarks em `ExecutiveKpiGrid`, âmbito submissions, alvos táteis móveis | §6.1–6.2 alto nível PRD | _preencher_ |
| **Feedback e estados** | [Apple HIG — princípios gerais](https://developer.apple.com/design/human-interface-guidelines) | Estados de loading/erro honestos; reduced-motion já parcial no chat | §14.4–5 (agente); copy honesta (notificações) | _preencher_ |
| **Performance percebida** | PRD §13 Fase 1 | p95 primeira interação cockpit (alvo institucional no PRD); evitar truncamento enganoso | §13 Fase 1 | _preencher_ |
| **Assistente (governança)** | [dre-agent-evals.yaml](../docs/dre-agent-evals.yaml) | BC-01..07; modo `explain_only`; sem cálculo paralelo ao motor | §14.4–5, 11–12 | _preencher_ |

### Mapeamento rápido §14 → dimensões

| §14 # | Dimensão principal |
|-------|-------------------|
| 1–3, 7 | Clareza, confiança dados, RBAC |
| 4–5, 11–12 | Assistente |
| 6 | Edição fluida (mensurável com Telemetry §15 — baseline pendente) |
| 8 | BRT / datas |
| 9–10 | Segurança RLS + motor (não só UX, mas afeta confiança percebida) |

---

## 2. Backlog ondulado (P0 / P1 / P2)

Amarrado ao [dashboard-ux-benchmark §4](./dashboard-ux-benchmark.md) e ao scorecard acima.

### P0 — antes ou durante janela go-live / demo (sem refactor grande)

- [ ] Fechar [go-live-trilha-a-checklist.md](./go-live-trilha-a-checklist.md) (A.1–A.4 + smoke).
- [ ] Resolver ambiguidade percebida cobertura vs modo painel (benchmark §2) — copy/headline mínimo se não der para refactor estrutural.

### P1 — onda pós-demo (1–2 iterações curtas)

- [ ] Design tokens globais + reduzir decoração paralela sem ganho (benchmark §4).
- [ ] Consolidar landmarks/aria em KPI grid e tabelas críticas (auditoria rápida WCAG alvo AA onde viável).
- [ ] Revisão mobile: abas Submissões / touch targets críticos.

### P2 — programa contínuo (PRD §13)

- [ ] Paridade com Fase 1 quantitativa (dashboard p95, RBAC em CI onde existir).
- [ ] Foundations Fase 0 motor/planilha (não é só UX — ver ondas pós-demo abaixo).

---

## 3. Ondas pós-demo — alinhamento PRD §13 + §9-bis (prd-phases-followup)

Registrar aqui decisões de calendário institucional (“reunião zero” §13) quando existirem.

### 3.1 Fase 0 — Foundations (planilha ↔ motor)

- **PRD:** §13 Fase 0 — mapeamento linhas + regressão MC2/EBITDA com amostragem institucional.
- **Documentos:** §7 PRD, [dre-modelo-gerencial-gap-matrix.md](./dre-modelo-gerencial-gap-matrix.md) (se existir no repo), `docs/logica-da-dre-e-do-workflow.md`.
- **Gate:** sem prometer métricas ao mercado até baseline §0.5 / §15 preenchidos conforme PRD.

### 3.2 Fase 1 — Cockpit + parity segurança / UX

- **PRD:** §13 Fase 1; §14 itens 1–3, 7–9.
- **Execução sugerida:** skill spec-driven **spec-phases** (`.claude/skills/spec-phases/SKILL.md`) por milestone com **spec-verify** ao fim de cada fase.

### 3.3 Harness avaliações agente (§9-bis.6)

- **Estado PRD:** catálogo **50** cenários em YAML `schema_version: 1.0.0`; **harness CI Vitest** documentado como pendente até wiring ao campo `runner` / `ci_config` no YAML.
- **Próximos passos técnicos (não bloqueantes do go-live Trilha A):**
  1. Implementar runner que lê cenários sintéticos ou subset “smoke agent” nos PRs.
  2. Definir gate: falha `severity: critical` bloqueia release major assistente (§14.11).
  3. Manter revisão dupla PO + técnico sénior até automação estável.

### 3.4 Fases 2–5 (referência apenas)

Roadmap institucional completo na tabela **§13** do PRD (coleta guiada → scorecards → rollout → IA v2 §9-bis). Não iniciar comunicação externa de fase seguinte sem critério de saída quantificado da fase anterior.

---

## 4. Referências GitHub / padrões de código (inspiração, não cópia)

- Tabelas acessíveis: práticas [TanStack Table](https://tanstack.com/table/latest) + documentação WAI-ARIA para grids.
- Component primitives: ecossistema **Radix** (focus trap, dialogs) onde o produto já se alinha.
- **material-components-web** ([data-table](https://github.com/material-components/material-components-web)): comparar papéis ARIA e navegação por teclado — adaptar ao CSS/tokens Febracis.

---

**Última revisão:** 09/02/2026 BRT — criado como entregável do plano “produção, demo executiva e paridade UX”; score numérico a preencher após primeira auditoria conjunta Produto × Eng.
