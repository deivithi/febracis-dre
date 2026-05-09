# Gate Controladoria — motor DRE vs planilha (gap despesas variáveis)

**Status:** documento de **governo institucional** — não autoriza alterações grandes de SQL ou motor sem revisão explícita.

## Fonte canónica do gap

- **[docs/gap-despesas-variaveis-2026-04-27.md](../docs/gap-despesas-variaveis-2026-04-27.md)** — divergências e riscos entre modelo planilha e implementação aplicativa.

## Papel da Controladoria

- Aprovar ou rejeitar **qualquer** ampliação de escopo do motor (novas linhas, regras de MC2/EBITDA) antes de merge em produção.
- Amostragem e regressão **MC2 / EBITDA** assinadas conforme PRD §7 e §14.10.

## Guardrails de automação

- **`npm run validate:phase1`** — usar antes de considerar alterações de fundação DRE alinhadas ao script institucional; não substitui OK humano da Controladoria.
- **Sem migrações SQL grandes “no escuro”**: PRs que alterem funções de cálculo, `dre_lines` ou políticas RLS ligadas ao motor exigem referência explícita a este gate e ao doc de gap.

## Relação com o produto UX

- O portal pode mostrar cópia honesta de “prévia” vs “oficial”; **nunca** prometer paridade numérica com a planilha até baseline Foundations (PRD §13 Fase 0) fechado com a Controladoria.

**Última revisão:** 08/05/2026 BRT.
