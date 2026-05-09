# Benchmark UX — Dashboard executivo (Febracis DRE)

Documento vivo: sintetiza pesquisa de referência aplicável ao **`/app/dashboard`**, não copia layouts de terceiros. Critérios alinhados a marca Febracis (ouro/azul/densidade institucional) e ao produto atual (React, escopos por papel, cockpit holding).

---

## 1. Princípios de dashboards executivos (fontes públicas)

| Princípio | Implicação para o produto |
|-----------|---------------------------|
| **Limite cognitivo (5–7 KPIs)** — repetição em literatura BI executiva; ver [AppDeck — executive dashboard practices](https://appdeck.com/blog/executive-dashboard-design-best-practices). | Um “nível hero” compacto antes de grids; evitar segunda faixa redundante na mesma dobra para o mesmo significado. |
| **Gestalt rápido (≈30s)** — uso real vs abandono — [ClariBI](https://claribi.com/blog/post/build-executive-dashboards-that-get-used/). | Narrativa única em ordem vertical: período/competência → situação (KPIs) → risco/variação (radar/widgets) → ação (fila, links estáveis). |
| **Contexto antes do número bruto** — variação vs período/target — [Ansivus](https://ansivus.com/blog/designing-executive-dashboards-10-principles-for-clarity-and-action). | Manter deltas e percentuais no rodapé do cartão KPI; texto de contexto sempre visível (“vs competência anterior” implícito no copy vigente). |
| **Ações explícitas** | CTAs já existentes (Submissões, Workflow, atualizar cache) — manter próximos à intenção (revisão, operação). |
| **Credibilidade (freshness)** | Exibir quando a leitura foi obtida (timestamp da query) para reduzir desconfiança em painel estratégico. |

Referências institucionais para **mentalidade** (densidade hierárquica, não clones visuais): layouts executivos tipo **Power BI** / ERP (**SAP Fiori** analytics), e produtos administrativos “dense-first” (**Linear**) só como régua de espaçamento tipográfico.

### Heurísticas Nielsen (filtro rápido)

- **Correspondência mundo real / linguagem do utilizador**: “Escopo” no header deve fusionar cobertura de dados + modo da app (holding vs rede completa) sem dois vocabulários contradictórios isolados ([Nielsen — heurísticas](https://www.nngroup.com/articles/ten-usability-heuristics/)).

---

## 2. Gaps observados vs implementação atual (pré‑refino P0 documentado aqui)

1. Duplicidade semântica: **cobertura** (`getScopeSummary` → “Rede completa”) vs **modo de painel** (`getDashboardScopeLabel` → “Visão rede”). Utilizadores leem conflito aparente no header/dashboard.
2. Superfície “card repetido” sem hierarquia explícita de seções (cockpit só começa mais abaixo; hero + KPIs competem igual sem rótulos de nível opcionais — melhorável com subtítulo estrutural mínimo).
3. Credibilidade: faltava **“atualizado em …”** no painel público até o passe P0.
4. KPIs bem padronizados em CSS mas **sem componente único nomeado**, dificultando evolução acessível (landmarks repetidos apenas por markup duplicado).

---

## 3. Diretrizes Febracis específicas (adotadas no P0 implementado junto ao código)

- **Linha única no header ativo**: `getActiveScopeHeadline` concatena cobertura + modo quando `holding` ou `controladoria`.
- **`ExecutiveKpiGrid`**: componente dedicado com mesma marca visual; permite evoluir aria/landmarks centralizados.
- **Backend**: remover truncamento `.limit(24)` enganoso no holding/controladoria/regional com **paginação** até teto segurança (vide `portal.api.ts` e comentário no projeto).

---

## 4. Próximos passos (fora deste passe mínimo)

- Planeamento executivo consolidado com scorecard UX e PRD §13: [`references/ux-excellence-roadmap.md`](./ux-excellence-roadmap.md); go-live/demo: [`references/go-live-trilha-a-checklist.md`](./go-live-trilha-a-checklist.md).
- Design tokens globais + redução gradual de vidro/gradiente decorativo paralelo onde não agrega marca.
- RPC/materialized view apenas se volumetria real justificar medição antes (custo × ganho vs fetch paginado).

---

Última revisão documental integrada ao repositório: refletir esta data em commits relevantes ao `references/project-context.md`.
