# AGENTS.md — febracis-dre

Instruções **específicas** desta pasta; combinam com o @AGENTS.md na raiz do workspace.

## Stack

- Vite, React 19, TypeScript, Supabase, TanStack, Zod; testes com Vitest/Playwright conforme `package.json`.

## Deploy e contexto

- Política de deploy Vercel, Supabase e variáveis sensíveis estão descritas no @AGENTS.md raiz e, no clone completo do portal, em `references/project-context.md`.
- Raiz canónica no disco pode ser `C:\Users\PC\Documents\VS CODE\febracis-dre` — ao comparar paths, validar qual pasta está aberta no Cursor.

## Comandos úteis

- `npm run dev`, `npm run build`, `npm run lint`, `npm run test`, `npm run test:e2e`, scripts `validate:*` quando aplicável.

## Referências

- Regras com glob: `.cursor/rules/stack-febracis-dre.mdc`
