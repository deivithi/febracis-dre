# Validacao de Configuracoes e Coligada

## Objetivo

Provar que a area `Configuracoes` libera o acesso correto para qualquer pessoa, sempre respeitando a coligada vinculada no momento da liberacao.

## Convencao adotada nesta fase

- O codigo operacional da coligada e `franchises.code`.
- O backend continua isolando dados por `franchise_id`, `regional_id` e RLS.
- O diretorio administrativo deve mostrar a coligada e a regional efetivas para evitar erro de liberacao.

## O que mudou

- A tela administrativa passou a destacar `codigo da coligada`, busca por unidade e resumo da liberacao antes de salvar.
- O diretorio de acessos agora expoe o escopo efetivo com regional derivada da coligada.
- Foi criada a migration `013_access_directory_effective_scope.sql`.
- Foi criado o runner `scripts/validate-access-settings.mjs`.

## Como validar

1. Defina as credenciais administrativas do app:

   ```powershell
   $env:DRE_ADMIN_EMAIL="..."
   $env:DRE_ADMIN_PASSWORD="..."
   ```

2. Rode o gate de configuracoes:

   ```powershell
   npm run validate:settings
   ```

3. Rode os checks locais do frontend:

   ```powershell
   npm run build
   npm run lint
   ```

## O que o runner prova

- `franchise_user` enxerga apenas a propria coligada.
- A troca de coligada do mesmo usuario atualiza imediatamente o conjunto de dados visiveis.
- `regional_manager` enxerga apenas as coligadas da propria regional.
- `viewer` continua em leitura, ainda respeitando o isolamento por coligada.
- O demo e restaurado ao estado padrao ao final da execucao.

## Evidencias

- Os relatorios sao gravados em `output/validation/`.
- O relatorio verde desta rodada ficou em `output/validation/configuracoes-coligada-2026-03-28T21-30-03-650Z.md`.
