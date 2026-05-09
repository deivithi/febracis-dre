# Capturas oficiais da Guia (`/app/guide`)

Artefactos estáticos para **pitch executivo**, **onboarding** e **documentação interna**. Sem dados pessoais reais — utilizar ambiente de **demonstração** e contas de teste.

## Ficheiros (tema escuro, padrão)

| Ficheiro | Secção |
|----------|--------|
| `guide-01-hero.png` | Hero e tese central |
| `guide-02-flow-diagram.png` | Diagrama linear do fluxo oficial do dado |
| `guide-03-trilha-3-passos.png` | Trilha em 3 passos (minicurso) |
| `guide-04-pilares.png` | Grelha dos cinco pilares |
| `guide-05-matriz-rbac.png` | Matriz de perfis e escopos |
| `guide-06-jornadas.png` | Jornadas (franquia / controladoria) |
| `guide-07-roteiro-demo.png` | Roteiro da demo (timeline) |
| `guide-08-formulas-visao-negocio.png` | Lógica da DRE — separador **Visão de negócio** |
| `guide-09-formulas-detalhe-tecnico.png` | Lógica da DRE — separador **Detalhe técnico (SQL)** |
| `guide-10-cta-final.png` | CTA final e próximos passos |
| `guide-full-page.png` | Página completa (scroll; separador de fórmulas em visão de negócio) |

## Tema claro (toggle U23 / `febracis.theme`)

O script também gera variantes com sufixo **`-light`** (por exemplo `guide-01-hero-light.png`, `guide-full-page-light.png`) quando executa o segundo lote.

## Contexto de captura

- **Viewport:** 1920×1080, `deviceScaleFactor` 1, Playwright Chromium headless.
- **Tema escuro / claro:** `localStorage` com chave `febracis.theme` (`dark` / `light`), alinhado a `next-themes`.
- **Tour Shepherd:** `sessionStorage` `febracis.tour.startedThisSession=1` e remoção de nós `.shepherd-*` após carga, para evitar overlay.
- **Modo demo:** [Não verificado no browser pelo script] — recomenda-se servir o front com **`VITE_APP_MODE=demo`** (`npm run dev` ou preview) para a faixa de ambiente sintético; o script apenas valida que o servidor responde em `PLAYWRIGHT_BASE_URL`.

**Última captura documentada:** 09/05/2026 BRT (instruções do lote G15).

## Como regenerar

1. Instalar browsers: `npx playwright install chromium`
2. Arrancar Vite (ex.: `set VITE_APP_MODE=demo&& npm run dev -- --host 127.0.0.1 --port 5173` no Windows PowerShell).
3. Exportar credenciais de teste: `E2E_DRE_EMAIL`, `E2E_DRE_PASSWORD`
4. `npm run screenshot:guide` (ou `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 npm run screenshot:guide`)

Conformidade **sem dados sensíveis:** usar apenas utilizadores e dados de demo; rever os PNGs antes de distribuição externa.
