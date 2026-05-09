# AGENTS.md — febracis-dre

Instruções **específicas** desta pasta; combinam com o @AGENTS.md na raiz do workspace.

## Stack

- Vite, React 19, TypeScript, Supabase, TanStack, Zod; testes com Vitest/Playwright conforme `package.json`.

## Deploy e contexto

- Política de deploy Vercel, Supabase, variáveis sensíveis e **roteiros de demo** estão consolidados em **`references/project-context.md`** — sempre como primeira leitura após mexer neste projeto.
- Raiz no disco pode ser `C:\Users\PC\Documents\VS CODE\febracis-dre` ou `...\OneDrive\...\febracis-dre`; validar com `git remote -v` (deve apontar para `deivithi/febracis-dre`).

## Protocolo de encerramento (agentes IA — obrigatório)

Ao **terminar** implementação ou ajustes que devam refletir no produto/repo remoto, **executar sempre a lista abaixo sem pedir confirmação** ao utilizador (salvo quando ele tiver declarado só leitura ou bloqueado publish).

1. Atualizar **`references/project-context.md`** e, quando couber, `references/demo-ceo-roteiro.md` ou `docs/*`.
2. No monorepo Cursor: **`.cursor/skills/stack-febracis-dre/SKILL.md`** e **`.cursor/rules/stack-febracis-dre.mdc`**.
3. Skill global **`C:\Users\PC\.codex\skills\febracis-dre-especialista\SKILL.md`** — manter mesmo protocolo/checkpoint de deploy.
4. **Git:** `npm run build` + `npm run test` (se tocaram assistente, `api/*`, auth ou regras críticas) → commit → **`git push origin main`**.
5. **Vercel:** `npx vercel --prod --yes` (team **`deivithis-projects`**); regressar ao `project-context.md` para nota do último `dpl_*` Ready.

Lista completa e excepções na secção **“Protocolo de encerramento obrigatório”** do `references/project-context.md`.

## Comandos úteis

- `npm run dev`, `npm run build`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run smoke:prod`, scripts `validate:*` quando aplicável.

## Referências

- **Go-live demo + validação RBAC + smoke:** [`references/go-live-trilha-a-checklist.md`](references/go-live-trilha-a-checklist.md).
- **Scorecard UX (WCAG / Nielsen / Material mental model) e ondas §13/§9-bis:** [`references/ux-excellence-roadmap.md`](references/ux-excellence-roadmap.md).
- **PRD canónico único de produto+arquitetura (consolidado):** [`docs/PRD-canonical.md`](./docs/PRD-canonical.md) — ler antes de grandes épicos; operação/deploy continua dominada por `references/project-context.md`.
- Regras com glob no monorepo: `.cursor/rules/stack-febracis-dre.mdc`
