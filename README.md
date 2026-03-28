# Febracis DRE

Portal gerencial multi-franquias da Febracis para coleta padronizada de DRE, workflow de revisão e dashboards executivos conectados ao Supabase.

## Stack

- Vite
- React 19
- TypeScript
- Supabase
- React Query
- React Router

## Ambiente local

1. Instale as dependências:

   ```bash
   npm ci
   ```

2. Copie [`C:\Users\PC\Documents\VS CODE\febracis-dre\.env.example`](C:\Users\PC\Documents\VS CODE\febracis-dre\.env.example) para `.env.local`.

3. Preencha as variáveis:

   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

4. Rode o app:

   ```bash
   npm run dev
   ```

## Build

```bash
npm run build
```

## Validacao da fundacao DRE

Para a fase pesada de validacao da fundacao:

```bash
npm run validate:phase1
```

Para uma rodada apenas de prontidao local:

```bash
npm run validate:phase1:local
```

O protocolo completo, as variaveis necessarias e os artefatos gerados estao em `docs/validacao-da-fundacao-dre-fase-01.md`.

## Validacao de configuracoes e coligada

Para validar a liberacao de acessos por codigo da coligada:

```bash
npm run validate:settings
```

O protocolo desta rodada esta em `docs/validacao-de-configuracoes-e-coligada.md`.

## Deploy no GitHub Pages

O projeto está preparado para publicar no GitHub Pages por meio da branch `gh-pages`, sem commitar o arquivo `.env.local`.

### Fluxo

- O script local gera o build com o `base` correto para o repositório.
- O script copia `dist/index.html` para `dist/404.html`, o que ajuda o SPA a sobreviver a recarregamentos em rotas internas no GitHub Pages.
- O conteúdo publicado vai para a branch `gh-pages`.

### Comando

```bash
npm run deploy:pages
```

### Pré-requisitos

- O repositório precisa ter `origin` configurado no GitHub.
- O GitHub Pages deve estar configurado para publicar a branch `gh-pages` na pasta `/` do repositório.
- As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` precisam existir em `.env.local`.

### Importante sobre segurança

- A `VITE_SUPABASE_ANON_KEY` não deve ser commitada.
- Mesmo assim, por se tratar de um app frontend estático, a chave `anon/publishable` continuará recuperável no bundle final do navegador. Isso é esperado no modelo oficial do Supabase para componentes públicos.
- Nunca use `service_role` no frontend.
- A proteção real dos dados depende de RLS, políticas corretas e escopos de acesso no Supabase.
