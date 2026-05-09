# Febracis DRE (Brasil)

Portal gerencial multi-franquias da Febracis para coleta padronizada da **DRE** no Brasil, workflow de revisão, dashboards executivos e **assistente guiado** na tela de submissões — conectado ao Supabase e à API serverless na Vercel.

## Documentação do produto

| Documento | Conteúdo |
|-----------|-----------|
| [`.agents/skills/febracis-dre/SKILL.md`](../.agents/skills/febracis-dre/SKILL.md) | Skill de agente (roteamento) — ponto de entrada em sessões/cursor; detalhe em `project-context` |
| [`docs/visao-geral-do-sistema.md`](docs/visao-geral-do-sistema.md) | Visão geral, camadas e fluxo canônico |
| [`references/project-context.md`](references/project-context.md) | URLs, stack, rotas, deploy e contexto operacional |
| [`docs/PRD-canonical.md`](docs/PRD-canonical.md) | PRD canónico produto + arquitetura (baseline **v2.2**; changelog §18; §19 Open Questions) |
| [`tests/evals/insights-ins.yaml`](tests/evals/insights-ins.yaml) | Cenários INS-001…INS-010 (insights dashboard; Vitest `tests/unit/insights-ins-eval.test.ts`) |
| [`docs/logica-da-dre-e-do-workflow.md`](docs/logica-da-dre-e-do-workflow.md) | Lógica da DRE e estados da submissão |
| Rota **Guia** no app (`/app/guide`) | Material para apresentação e matriz de perfis |

## Stack

- Vite
- React 19
- TypeScript
- Supabase
- TanStack Query
- React Router
- Assistente DRE: função serverless `api/dre-agent.ts` (OpenRouter quando configurado; modo guiado local sem chave)
- **Insights do dashboard:** `api/dre-insights.ts` — cartões determinísticos a partir de `get_kpi_history` (somente **approved**), cache Postgres `dre_insight_cache` (TTL 4h na API). **V1 sem LLM** (narrativas por templates; evidência JSON imutável). *Cron diário opcional:* pode apontar para um endpoint tipo `/api/cron/dre-insights` se quiser pré-aquecimento server-side; o painel já obtém insights no mount do dashboard.

## CI (GitHub Actions)

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) corre em cada push e pull request para `main`: jobs `migrate pairs`, `lint`, `test`, **`test coverage`** (Vitest + thresholds nos hot paths), **`e2e`** (Playwright, Chromium), `build`. O job `audit` é informativo e **não** bloqueia o merge.

**Local:** cobertura com `npm run test:coverage`; E2E com `npm run test:e2e` (instalar browsers: `npx playwright install`). Para desativar E2E: `E2E=0 npm run test:e2e`.

## Ambiente local

1. Instale as dependências:

   ```bash
   npm ci
   ```

2. Copie `.env.example` para `.env.local`.

3. Preencha as variáveis (mínimo para o app):

   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

   Para o assistente online na Vercel, configure também no painel do projeto: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_APP_URL` (veja `.env.example`).

4. Rode o app:

   ```bash
   npm run dev
   ```

## Variáveis e runtime (referência rápida)

- **Bundle / cliente:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (obrigatórios para dados e auth no browser). Detalhe e segredos do assistente: [`.env.example`](.env.example) e [`references/project-context.md`](references/project-context.md).
- **Assistente (Vercel / Node):** `OPENAI_API_KEY` ou `OPENROUTER_API_KEY`, modelos, rate limit `AGENT_RATE_LIMIT_*` — ver `.env.example`.
- **Tema claro/escuro:** persistido no browser com chave `febracis.theme` (`next-themes` / `src/lib/theme.ts`); não usa prefixo `VITE_`.
- **Notificações:** sem `VITE_*` dedicado; dependem da tabela `notifications`, RLS e Realtime após migração `020_create_notifications.sql` (matriz de testes: [`docs/notifications-rls-test-matrix.md`](docs/notifications-rls-test-matrix.md)).
- **`VITE_APP_MODE`:** não referenciado no código fonte deste repo — não documentar como flag activa.

Mapa de entregas rotuladas **U01–U30** e migrações recentes: [`references/project-context.md`](references/project-context.md#mapa-de-atividades-u01u30).

## Build

**Estado do build (09/05/2026):** `npm run build`, `npm run lint` (sem erros) e `npm test` verificados no repo; smoke Playwright opcional com `npm run test:e2e`.

```bash
npm run build
```

## Cabeçalhos de segurança (CSP / Vercel)

Após o build, confirme cabeçalhos com `npm run verify:security-headers` (com `npm run preview` noutro terminal ou `VERIFY_SECURITY_HEADERS_URL=https://…`). Checklist e exemplos `curl` / Lighthouse: [`docs/security-headers-acceptance.md`](docs/security-headers-acceptance.md).

## Favicons (aba do navegador / iOS)

Os ícones em `public/` (`favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`) são gerados por `scripts/generate-favicons.mjs`.

**Por quê não basta copiar o PNG?** Na sidebar, o ficheiro `public/images/logo-febracis.png` é recolorido com **filtros CSS** (`.sidebar__logo-image` em `src/styles/components/layout.css`). O ícone da aba é estático — não recebe CSS — por isso o script rasteriza com Playwright + Chromium e redimensiona com `sharp`.

**Tamanho na aba:** o lockup é horizontal (ex. 300×170). Para **favicon-16** e **favicon-32** o script **recorta a zona da águia** (percentagens de largura e altura configuráveis no script), **`trim()`** no alpha e depois **`resize` 512×512 com `fit: cover`** para o símbolo **preencher o quadrado** (evita mancha minúscula com `contain`). O raster da águia usa **filtro só de cor** (sem `drop-shadow`) para nitidez a 16px. O **apple-touch-icon** (180×180) usa o **lockup completo** com variante leve (sombra dourada). O **180×180** é onde o nome aparece com clareza.

**Fundo na geração (política separada):**

| Saída | Defeito | Override |
|--------|---------|----------|
| **favicon-16 / favicon-32** (aba) | **Transparente** — evita o “quadrado claro” na aba | Sólido: `FAVICON_TAB_BG_HEX=#RRGGBB`. `FAVICON_TRANSPARENT=1` força transparente e ignora `FAVICON_TAB_BG_HEX` (legado). |
| **apple-touch-icon** (180×180, iOS) | **`#FBF6EC`** (lockup legível) | Cor: `FAVICON_APPLE_BG_HEX` ou `FAVICON_BG_HEX`. Transparente: `FAVICON_APPLE_TRANSPARENT=1`. |

```powershell
# Aba com fundo sólido (opcional)
$env:FAVICON_TAB_BG_HEX="#FBF6EC"; npm run favicons

# Apple-touch transparente (raro)
$env:FAVICON_APPLE_TRANSPARENT="1"; npm run favicons
```

**Limitação honesta:** em **16×16** o wordmark completo continua ilegível; os **16/32** mostram só a **águia**.

**Requisito:** navegador Chromium do Playwright instalado (uma vez por máquina/CI):

```bash
npx playwright install chromium
```

Depois de alterar o logo base ou o filtro na sidebar, regenere os favicons e faça commit dos PNGs:

```bash
npm run favicons
```

**Fallback opcional:** se existir `public/images/logo-febracis-favicon.png` (export oficial já em dourado, sem depender do filtro CSS), esse ficheiro passa a ser a fonte e o filtro da sidebar **não** é aplicado. Use quando a equipa de marca preferir controlar o aspeto do ícone diretamente.

## Validação da fundação DRE

Para a fase pesada de validação da fundação:

```bash
npm run validate:phase1
```

Para uma rodada apenas de prontidão local:

```bash
npm run validate:phase1:local
```

O protocolo completo, as variáveis necessárias e os artefatos gerados estão em `docs/validacao-da-fundacao-dre-fase-01.md`.

## Validação de configurações e coligada

Para validar a liberação de acessos por código da coligada:

```bash
npm run validate:settings
```

O protocolo desta rodada está em `docs/validacao-de-configuracoes-e-coligada.md`.

## Deploy na Vercel (produção)

Fluxo usado para publicar o portal (SPA + API do assistente):

```bash
npm run build
npx vercel@latest deploy --prod --yes
```

- Variáveis de ambiente de build e runtime devem estar configuradas no projeto Vercel (`VITE_*`, Supabase, OpenRouter). Após migrar de conta, revalidar a lista: [`references/operacoes-pendentes-supabase-vercel-2026-04-27.md`](references/operacoes-pendentes-supabase-vercel-2026-04-27.md). Estado documentado: **7/9** em Production até preencher `VITE_SUPABASE_ANON_KEY` e `OPENROUTER_API_KEY`.
- Se `npx vercel deploy --prod` falhar com erro opaco, usar **Redeploy** no dashboard (ver `tasks/lessons.md`).
- URL de referência: ver `references/project-context.md` (produção atual: `https://febracis-dre-phi.vercel.app`).

## Deploy no GitHub Pages (alternativo)

O projeto também pode publicar na branch `gh-pages`, sem commitar `.env.local`.

### Fluxo

- O script local gera o build com o `base` correto para o repositório.
- O script copia `dist/index.html` para `dist/404.html`, o que ajuda o SPA em recarregamentos de rotas internas.
- O conteúdo publicado vai para a branch `gh-pages`.

### Comando

```bash
npm run deploy:pages
```

### Pré-requisitos

- Repositório com `origin` no GitHub.
- GitHub Pages publicando a branch `gh-pages` na pasta `/`.
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local` no momento do build.

### Segurança

- Não commite `VITE_SUPABASE_ANON_KEY`.
- Em app estático, a chave `anon` continua visível no bundle — esperado no modelo Supabase para clientes públicos.
- Nunca use `service_role` no frontend.
- A proteção dos dados depende de RLS, políticas e escopos no Supabase.
