# Validação da Fundação DRE — Fase Pesada 01

## Objetivo

Esta rotina prova a fundação do fluxo de `Submissões` antes da próxima fase pesada do produto.

O foco desta rodada é validar, em ordem:

1. integridade local do workspace
2. prontidão remota da migration `011_submission_lock_and_dre_validation.sql`
3. seed controlado do ambiente demo
4. smoke autenticado real com perfis provisionados no próprio Supabase
5. paridade entre input, preview financeiro, DRE oficial e dashboard

## Scripts

### Gate principal

```bash
npm run validate:phase1
```

Este comando é **estrito**:

- falha se `build`, `lint` ou `verify-dre-guardrails` quebrarem
- falha se as credenciais administrativas não estiverem disponíveis
- falha se o smoke híbrido remoto não fechar

### Prontidão local

```bash
npm run validate:phase1:local
```

Este comando roda o mesmo runner em modo flexível e serve para confirmar:

- build
- lint
- guardrails
- diagnóstico do estado remoto

Sem marcar a fundação como 100% validada.

### Aplicar migration pendente

```bash
npm run validate:phase1:apply-migration
```

Usa o mesmo runner, mas tenta religar o projeto Supabase vinculado e aplicar a migration `011` quando:

- `SUPABASE_DB_PASSWORD` estiver presente
- a migration `011` ainda estiver pendente no remoto

## Variáveis de ambiente

### Obrigatórias para qualquer execução

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Obrigatórias para o smoke híbrido remoto

```bash
DRE_ADMIN_EMAIL=...
DRE_ADMIN_PASSWORD=...
```

### Opcionais para aplicar a migration 011 via CLI

```bash
SUPABASE_DB_PASSWORD=...
```

### Opcionais para personalizar usuários temporários do smoke

```bash
DRE_SMOKE_NAMESPACE=validacao-dre
DRE_SMOKE_DOMAIN=local.test
```

## O que o runner prova

### Camada local

- `npm run build`
- `npm run lint`
- `node scripts/verify-dre-guardrails.mjs`

### Camada remota

- estado atual da migration `011`
- presença real das linhas novas no catálogo remoto:
  - `event_trainer_cost`
  - `variable_card_fees`
  - `variable_logistics`
  - `variable_room_rent`
  - `marketing_gifts`
  - `marketing_offline`

### Camada demo + smoke autenticado

- seed do ambiente demo com massa controlada
- provisionamento automático de usuários temporários:
  - `system_admin`
  - `franchise_user`
  - `finance_controller`
  - `regional_manager`
  - `viewer`
- criação de draft em competência temporária
- salvamento do input canônico
- envio da submissão
- bloqueio de edição e de nova versão após envio
- `start_review`
- `request_adjustment`
- reedição da mesma versão em `pending_adjustment`
- reenvio
- aprovação final
- leitura oficial no dashboard
- confirmação de leitura sem escrita para `regional_manager` e `viewer`

## Artefatos gerados

O runner salva evidências em:

```bash
output/validation/
```

Arquivos gerados por execução:

- `fase-pesada-01-<timestamp>.md`
- `fase-pesada-01-<timestamp>.json`

## Critério de pronto desta fase

A fundação só pode ser considerada pronta quando o comando estrito:

```bash
npm run validate:phase1
```

fechar sem falhas críticas.
