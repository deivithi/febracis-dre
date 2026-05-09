# Performance percebida — `/app/dashboard` (PRD §13 Fase 1)

**Objetivo:** checklist curta para Lighthouse / Web Vitals em produção e em rede fraca, sem substituir telemetria §15.

## Medição local (Chrome DevTools)

1. Abrir `https://febracis-dre.vercel.app` (ou preview) autenticado com utilizador de demo.
2. **Lighthouse** (DevTools → Lighthouse): modo navegação, **desktop** e **mobile**; escopo só URL atual `/app/dashboard`.
3. Registar ao menos: **LCP**, **INP** (ou TBT em Lighthouse clássico), **CLS**. Comparar com execução fria (hard refresh) vs segunda visita (cache).

## Rede fraca (throttling)

1. DevTools → **Network** → throttling **Slow 3G** ou **Fast 3G**.
2. **Disable cache** ligado na primeira medição; repetir com cache para ver segunda interação.
3. Observar: tempo até KPIs e hero legíveis; `DashboardPage` usa `staleTime` **5 min** e `gcTime` **30 min** na query do snapshot — segunda navegação no período deve sentir-se mais rápida (dados “quentes” no TanStack Query).
4. **Nota:** APIs Supabase dependem de latência `sa-east-1`; utilizadores fora do BR podem ver LCP maior — documentar região ao reportar problema.

## Bundle / rotas

- Rotas `App.tsx` usam `lazy()` + `Suspense` com fallback `RouteFallback` (“Carregando módulo…”) — primeira ida ao dashboard baixa o chunk do feature; medir **após** esse carregamento para isolar dados vs código.

## Referências

- PRD §13 Fase 1 e KPIs §15 — baseline ainda parcial no repo.
- [`references/ux-excellence-roadmap.md`](./ux-excellence-roadmap.md) dimensão “Performance percebida”.

**Última revisão:** 08/05/2026 BRT.
