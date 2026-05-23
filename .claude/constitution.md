# 🏛️ febracis-dre Local — Constitution

> **Princípios governantes do projeto febracis-dre Local (PG17 standalone).**
> Carrega sob demanda quando cwd é `febracis-dre/`.
> Cita rules globais; ñ duplica. Inspirado em [github/spec-kit](https://github.com/github/spec-kit) (MIT).

---

## 📌 Identidade

| Campo | Valor |
|---|---|
| **Nome** | febracis-dre Local |
| **Tipo** | DB consolidador Febracis (DRE + content_chunks + auth custom) |
| **Diretório workspace** | `C:\Users\PC\OneDrive\Documents\VS CODE\febracis-dre` |
| **Diretório runtime** | `~/pg17-migration/` no WSL Ubuntu-24.04 |
| **Container** | `pg17-migration` (image `supabase/postgres:17.6.1.084`) |
| **Port host** | 5433 |
| **DB** | `febracis_dre` |
| **Cloud origem** | Supabase project `vwxgrjjwbvdiaqxqbryk` (read-only, intocada) |
| **Status** | Fase 1 ✅ + Fase A' (auth custom) ✅ — Fase B' aguardando (cutover apps) |

---

## 🏛️ Princípios invioláveis (8 itens)

| # | Princípio | Motivo (Why) | Como aplicar (How) |
|---|---|---|---|
| 1 | **PG17 standalone vira autoridade única (rumo)** | Pivot 2026-05-03: eliminação TOTAL Supabase Cloud + stack PG15 local. Driver pg direto + auth custom + storage local + realtime PG-nativo | Toda decisão de feature nova considera "vai funcionar pós-Supabase-sunset?" |
| 2 | **Cloud origem é READ-ONLY** | Snapshot 2026-05-03 já tirado. Mudança em Cloud = drift entre source-of-truth e destino | Toda DDL/DML aplica APENAS em PG17 standalone. Cloud só p/ consulta |
| 3 | **Pulso Cloud fora do escopo** | Pulso = projeto isolado, Cloud free tier slot 1/2. Migração Pulso = decisão futura separada | Migração Cloud→local NÃO toca Pulso |
| 4 | **Auth custom Better-Auth + EdDSA** | Fase A' ✅ — re-hash lazy bcrypt→argon2id + pepper env + cookie+bearer dual + schema `auth_custom` | Spec aprovada `spec/febracis-dre-auth-custom.md`. Mudanças exigem ADR |
| 5 | **Free tier Cloud lockdown $0/mês** | 2/2 projetos Cloud (Pulso + febracis-dre origem). 3º projeto = upgrade billing | Cross-ref `feedback_supabase_free_tier_lockdown.md`. Tudo q crescer = local PG17, ñ Cloud novo |
| 6 | **Drift cosmético jsonb numeric aceitável** | 4/15 byte-mismatches são `689500.00` → `689500` (parser Python) — semanticamente idênticos | Ñ tentar fix forçado. Validação: cálculos batem, ñ hash MD5 textual |
| 7 | **Schemas managed Supabase (auth/storage/realtime/vault) NÃO migrados** | Bootstrap GoTrue/storage-api/realtime exige stack supabase-stack PG17 completa — escopo aceito como skip | Auth custom (Better-Auth) substitui auth managed. Storage = decisão futura (MinIO/FS) |
| 8 | **WSL persistente obrigatório** | `vmIdleTimeout=-1` em `~/.wslconfig`. Sem isso, container morre c/ SIGTERM cycle | Cross-ref `feedback_supabase_local_safety.md` |

---

## 🛡️ Safety gates específicos

- **DROP/TRUNCATE/DELETE em PG17 standalone** → `human-architectural-gate.md` BLOQUEANTE. Snapshot recente obrigatório
- **Acesso à Cloud origem** → READ-ONLY. Qualquer DDL/DML em Cloud = violação
- **Cripto custom (auth)** → Fase A' já passou pelo gate. Próximas mudanças (rotação chaves, downgrade hash) re-disparam gate
- **Migração Pulso Cloud→local** → BLOQUEIO ABSOLUTO sem ADR explícito (escopo separado)
- **Mudança em `~/pg17-migration/.env`** → mode 600 obrigatório, backup antes
- **Senha PG17 reset** → `~/.supabase-local/credentials.txt` é fonte de verdade. Reset sem atualizar credentials = lockout
- **Backup E:\supabase-backup** → restic + pg_dump diário 03:00 BRT inviolável

---

## 📐 Decisões arquiteturais imutáveis

> Decisões já tomadas q ñ se reabrem sem ADR.

- **Postgres**: 17.6.1 supabase/postgres image — ñ trocar p/ vanilla Postgres sem ADR
- **Container standalone**: `pg17-migration` separado da stack supabase-local PG15 — coexistência intencional
- **Auth**: Better-Auth + EdDSA + argon2id (Fase A' aprovada)
- **Hash legacy**: bcrypt $2a$10$ aceito p/ re-hash lazy ao login (migração transparente)
- **Pepper**: env var (ñ KMS, decisão pragmática free tier)
- **Cookie + bearer dual**: ambos suportados (cookie p/ web, bearer p/ API)
- **Driver app**: pg/postgres/drizzle (Node) ou pgx (Go) direto, sem PostgREST
- **Realtime**: LISTEN/NOTIFY PG-nativo OU eliminado (sem Supabase Realtime)
- **Storage**: TBD — MinIO local ou filesystem (decisão Fase A' futura)
- **pgvector**: 0.8.0, embeddings 1536-dim preservados em content_chunks

### ❌ Anti-patterns proibidos

- ❌ DDL/DML em Cloud origem `vwxgrjjwbvdiaqxqbryk` (read-only)
- ❌ Tocar projeto Pulso Cloud (escopo separado)
- ❌ Bootstrap schemas managed (auth/storage/realtime) sem decisão de stack supabase-stack PG17
- ❌ Reset senha PG17 sem atualizar credentials.txt
- ❌ Disable `vmIdleTimeout=-1` (SIGTERM cycle volta)
- ❌ math/rand p/ tokens / sessões (sempre crypto/rand)
- ❌ Concat string SQL (sempre placeholders `$1, $2`)
- ❌ Bypass auth custom (Better-Auth) p/ "teste rápido"

---

## 📊 Métricas de saúde

| Métrica | Limite | Status atual | Trigger |
|---|---|---|---|
| Container uptime | ≥ 99% | OK pós-Fase 1 | investigar SIGTERM |
| Smoke test paridade | 100% custom schemas | 11/15 byte-perfect (drift cosmético OK) | re-validar trimestral |
| Backup pg_dump diário | 03:00 BRT | ATIVO via cron | alert se falhar 2 dias |
| Restic backup semanal | dom 03:30 BRT | ATIVO | restore drill mensal |
| Healthcheck WSL | seg 09:00 BRT | ATIVO | drill 1ª seg mês |
| Auth login latency | < 100ms P95 | TBD pós Fase B' | otimizar índices |
| FK profiles → auth_custom intactas | 100% | 11/11 ✅ | bloquear migração se < |

---

## 🔗 Cross-refs c/ rules globais

- `.claude/rules/human-architectural-gate.md` — bloqueio cripto/LGPD/sanit BD
- `.claude/rules/supabase-factory-activate.md` — Cloud free tier lockdown
- `.claude/rules/supabase-local-activate.md` — stack PG15 (coexistência)
- `.claude/rules/golang-activate.md` — driver pgx p/ apps Go
- `.claude/rules/yagni-gate.md` — ñ adicionar features "preventivamente" antes da Fase B'
- `.claude/rules/scope-confirmation-gate.md` — escopo migração ñ inclui Pulso
- `.claude/skills/migration-febracis-dre-to-local/SKILL.md` — playbook 5 fases
- `.claude/rules/ddia-core-activate.md` — catálogo dados [`docs/architecture/ddia/projects/febracis-dre.md`](../../docs/architecture/ddia/projects/febracis-dre.md)
- [`references/runbook-pg17-dr.md`](../references/runbook-pg17-dr.md) — RPO/RTO, restore, política lag réplica
- `memory/project_febracis_dre_local.md` — status + paths
- `memory/feedback_supabase_free_tier_lockdown.md` — política $0/mês
- `memory/feedback_supabase_local_safety.md` — vmIdleTimeout + carve-outs
- `spec/febracis-dre-auth-custom.md` — spec auth custom (Fase A' ✅)
- Plans: `seguir-sua-recomenda-o-soft-cat.md` (rumo), `elegant-moseying-origami.md` (S3 ✅), `synthetic-growing-castle.md` (S1)

---

## 🗓️ Histórico de revisões

| Data | Versão | Mudança | Trigger |
|---|---|---|---|
| 2026-05-08 | 1.0 | Constitution inicial — rumo PG17 puro + auth custom + Cloud sunset | Absorção seletiva github/spec-kit |

---

## 📜 Atribuição

- Padrão `constitution.md` inspirado em [github/spec-kit](https://github.com/github/spec-kit) (MIT)
- Conteúdo extraído de `memory/project_febracis_dre_local.md` + `spec/febracis-dre-auth-custom.md` + plan files vivos
