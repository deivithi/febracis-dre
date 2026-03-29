# Febracis DRE (Brasil)

Portal gerencial multi-franquias da Febracis para coleta padronizada da **DRE** no Brasil, workflow de revisão, dashboards executivos e **assistente guiado** na tela de submissões — conectado ao Supabase e à API serverless na Vercel.

## Documentação do produto

| Documento | Conteúdo |
|-----------|-----------|
| [`docs/visao-geral-do-sistema.md`](docs/visao-geral-do-sistema.md) | Visão geral, camadas e fluxo canônico |
| [`references/project-context.md`](references/project-context.md) | URLs, stack, rotas, deploy e contexto operacional |
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

## Build

```bash
npm run build
```

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
npx vercel deploy --prod -y
```

- Variáveis de ambiente de build e runtime devem estar configuradas no projeto Vercel (`VITE_*`, Supabase, OpenRouter).
- URL de referência: ver `references/project-context.md`.

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
