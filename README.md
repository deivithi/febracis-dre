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

## Deploy no GitHub Pages

O projeto está preparado para publicar no GitHub Pages via GitHub Actions.

### Secrets exigidos no repositório

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Fluxo

- O workflow usa GitHub Actions para instalar dependências, gerar o build e publicar o conteúdo de `dist`.
- O `base` do Vite é configurado automaticamente pelo ambiente de CI para funcionar em subpath de repositório.
- O workflow copia `dist/index.html` para `dist/404.html`, o que ajuda o SPA a sobreviver a recarregamentos em rotas internas no GitHub Pages.

### Importante sobre segurança

- A `VITE_SUPABASE_ANON_KEY` não deve ser commitada e fica armazenada como secret do GitHub.
- Mesmo assim, por se tratar de um app frontend estático, a chave `anon/publishable` continuará recuperável no bundle final do navegador. Isso é esperado no modelo oficial do Supabase para componentes públicos.
- Nunca use `service_role` no frontend.
- A proteção real dos dados depende de RLS, políticas corretas e escopos de acesso no Supabase.
