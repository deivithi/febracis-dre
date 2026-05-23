# Runbook — PG17 DR, backup, RPO/RTO e lag (febracis-dre)

> **DDIA Cap. 5 (Replication)** — procedimentos operacionais para o Postgres 17 standalone.  
> Constitution: [`../.claude/constitution.md`](../.claude/constitution.md) · Catálogo DDIA: [`../../docs/architecture/ddia/projects/febracis-dre.md`](../../docs/architecture/ddia/projects/febracis-dre.md)

**Última revisão:** 23/05/2026 BRT  
**Estado da topologia:** produção app ainda no **Supabase Cloud** (`vwxgrjjwbvdiaqxqbryk`); **PG17 local** = destino de migração / futura autoridade (Fase B' pendente).

---

## 1. Objetivos e escopo

| Objetivo | Valor acordado | Notas |
|----------|----------------|-------|
| **RPO** (Recovery Point Objective) | **≤ 24 h** | Limite imposto pelo `pg_dump` diário 03:00 BRT. Sem WAL archiving contínuo hoje. |
| **RTO** (Recovery Time Objective) | **≤ 2 h** | Rebuild container + `pg_restore` + smoke paridade. Meta até 1º drill medido. |
| **Disponibilidade container PG17** | **≥ 99 %** | Constitution §Métricas de saúde |
| **Read replica lag** | **N/A (single-primary)** | Política pré-definida na §6 quando réplica existir |

**Fora de escopo deste runbook:** cutover DNS/Vercel (Fase B'), bootstrap auth managed completo, Pulso/Aria.

---

## 2. Inventário rápido

| Item | Valor |
|------|-------|
| Runtime WSL | `Ubuntu-24.04` |
| Compose | `~/pg17-migration/docker-compose.yml` |
| Container | `pg17-migration` |
| Imagem | `supabase/postgres:17.6.1.084` |
| Porta host | **5433** (PG15 stack permanece em 5432 — não tocar) |
| Database | `febracis_dre` |
| PGDATA | `~/pg17-migration/data/` |
| Credenciais | `~/pg17-migration/.env`, `~/.supabase-local/credentials.txt` |
| Backup lógico | `pg_dump` diário **03:00 BRT** → `E:\supabase-backup\` |
| Backup incremental | **restic** domingo **03:30 BRT** (mesmo destino / repositório configurado no host) |
| Scripts repo | [`../scripts/pg17/`](../scripts/pg17/) |
| Skill migração | [`.claude/skills/migration-febracis-dre-to-local/SKILL.md`](../../.claude/skills/migration-febracis-dre-to-local/SKILL.md) |

---

## 3. Garantias de consistência (single-primary)

Enquanto **não** houver read replica:

| Fluxo | Garantia | Mecanismo |
|-------|----------|-----------|
| Escrita portal → PG17 (pós-cutover) | **Read-your-writes** | Uma instância primary; reads na mesma conexão/API |
| Dashboard / views KPI | **Eventual (segundos)** | Derived data no mesmo Postgres (views/materialized — sem segundo store) |
| App em produção **hoje** (Cloud) | **Strong no primary Cloud** | Supabase managed; PG17 é cópia de paridade |

**Regra DDIA:** não servir reads de réplica para dados que o utilizador acabou de escrever até existir política de lag (§6).

---

## 4. Monitorização e alertas

### 4.1 Checks automáticos (cron existente)

| Job | Horário BRT | Falha → ação |
|-----|-------------|--------------|
| `pg_dump` febracis_dre | Diário 03:00 | Alerta se **2 dias** sem ficheiro novo |
| restic snapshot | Dom 03:30 | Investigar se snapshot falhar 2 semanas seguidas |
| Healthcheck WSL | Seg 09:00 | Drill manual 1ª segunda do mês |

### 4.2 Checks manuais / agente

Na raiz do repo (PowerShell):

```powershell
.\scripts\pg17\run-pg17-wsl.ps1 health
.\scripts\pg17\run-pg17-wsl.ps1 backup-verify
```

Saída esperada `health`: container `healthy`, `SELECT version()` OK, contagens smoke (`audit_log`, `profiles`) dentro de tolerância.

### 4.3 Métricas a registar no drill

| Métrica | Onde guardar |
|---------|--------------|
| Idade do último dump (horas) | Log do drill + [`project-context.md`](./project-context.md) § DR |
| Duração restore (min) | Idem |
| Row counts pós-restore vs primary | Script `restore-drill.sh` |
| **RTO medido** | Atualizar tabela §1 após 1º drill |

---

## 5. Procedimentos — incidentes

### 5.1 SEV-2 — Container down / unhealthy

**Sintomas:** `docker ps` não mostra `healthy`, app local não conecta `:5433`.

1. WSL: `cd ~/pg17-migration && sudo docker compose ps`
2. Restart: `sudo docker compose up -d`
3. Aguardar healthcheck (até 120 s)
4. Verificar: `run-pg17-wsl.ps1 health`
5. Se falhar após 2 restarts → **5.3** (restore)

**RTO esperado:** 5–15 min se PGDATA íntegro.

### 5.2 SEV-2 — Disco / PGDATA corrompido

**Sintomas:** Postgres não inicia, erros `PANIC`, `could not read block`.

1. **Parar** writes: manter Cloud como prod (estado atual) ou declarar manutenção se PG17 já for primary.
2. Preservar PGDATA quebrado: `mv ~/pg17-migration/data ~/pg17-migration/data.broken.$(date +%Y%m%d-%H%M)`
3. Seguir **5.4 Restore from backup**
4. Revalidar paridade: skill migração — spot-check `audit_log`, `content_chunks`, `profiles`

**RPO efetivo:** último `pg_dump` bem-sucedido (≤ 24 h).

### 5.3 SEV-1 — Perda total host / disco E:

1. Reinstalar WSL stack conforme skill migração §Container PG17
2. Restaurar dumps de `E:\supabase-backup\` (ou restic `restore` se dump local perdido)
3. **5.4** + registo RTO medido
4. Se restic indisponível: re-sync read-only from Cloud via MCP **não** substitui DR — apenas re-seed de emergência (lento; Cloud read-only)

### 5.4 Restore from backup (procedimento canónico)

**Pré-requisitos:** dump `.dump` ou `.sql.gz` recente em `E:\supabase-backup\`.

```bash
# WSL — variáveis
PG_PASS=$(grep '^POSTGRES_PASSWORD=' ~/pg17-migration/.env | cut -d= -f2)
DUMP=$(ls -t /mnt/e/supabase-backup/febracis_dre*.dump 2>/dev/null | head -1)

# 1) Parar tráfego app (cutover) ou usar DB temporário p/ drill
sudo docker compose -f ~/pg17-migration/docker-compose.yml stop postgrest 2>/dev/null || true

# 2) Drop/create DB (CUIDADO — destrutivo no primary)
sudo docker exec -e PGPASSWORD="$PG_PASS" pg17-migration \
  psql -h 127.0.0.1 -U postgres -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='febracis_dre' AND pid <> pg_backend_pid();"
sudo docker exec -e PGPASSWORD="$PG_PASS" pg17-migration \
  psql -h 127.0.0.1 -U postgres -d postgres -c "DROP DATABASE IF EXISTS febracis_dre;"
sudo docker exec -e PGPASSWORD="$PG_PASS" pg17-migration \
  psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE febracis_dre;"

# 3) Restore
sudo docker exec -i -e PGPASSWORD="$PG_PASS" pg17-migration \
  pg_restore -h 127.0.0.1 -U postgres -d febracis_dre --no-owner --role=postgres < "$DUMP"

# 4) Smoke
sudo docker exec -e PGPASSWORD="$PG_PASS" pg17-migration \
  psql -h 127.0.0.1 -U postgres -d febracis_dre -c \
  "SELECT 'audit_log', count(*) FROM public.audit_log UNION ALL SELECT 'profiles', count(*) FROM public.profiles;"

# 5) Subir PostgREST se aplicável
sudo docker compose -f ~/pg17-migration/docker-compose.yml up -d
```

**Drill não destrutivo:** usar script [`../scripts/pg17/restore-drill.sh`](../scripts/pg17/restore-drill.sh) → DB `febracis_dre_drill_YYYYMMDD`.

### 5.5 Failover app (Fase B' — quando PG17 for primary)

Ordem recomendada:

1. Confirmar PG17 healthy + lag N/A (single node)
2. Atualizar env app (`DATABASE_URL` / PostgREST) → apontar PG17
3. Redeploy Vercel / Zo Computer conforme plano B'
4. Manter Cloud **read-only** até sunset formal (constitution princípio 2)
5. Rollback: reverter env para Cloud + redeploy (RPO Cloud = estado pré-cutover)

Documentar decisão em ADR quando cutover ocorrer.

---

## 6. Política de read replica e lag (futuro)

**Gatilho para adicionar réplica:** p95 read dashboard > 500 ms após índices/MV **ou** CPU primary > 70 % sustentado 7 dias.

| Parâmetro | Valor alvo |
|-----------|------------|
| **Lag máximo aceitável (async)** | **≤ 5 s** p99 |
| **Reads pós-write** | **Sempre primary** (session stickiness ou route `/write` → primary) |
| **Reads analíticos** | Réplica OK se lag < 5 s; senão primary |
| **Alerta** | lag > 30 s por 5 min → page ops |
| **Failover réplica → primary** | Manual; requer runbook addendum + teste trimestral |

Implementação sugerida (ADR futuro): streaming replication nativa Postgres ou `pglogical` — **não** implementar antes do gatilho (YAGNI).

---

## 7. Calendário operacional

| Frequência | Atividade | Responsável |
|------------|-----------|-------------|
| Diário | Verificar dump 03:00 (automático + alerta 2 dias) | Ops / cron |
| Semanal | restic snapshot dom 03:30 | Ops / cron |
| **Mensal** | **Restore drill** em DB `febracis_dre_drill_*` | Ops / agente |
| Trimestral | Re-validar paridade smoke (constitution) | Tech |
| Anual | Revisar RPO/RTO vs tamanho real BD | PO + Ops |

---

## 8. Registo de drills

| Data | Tipo | Dump usado | RTO medido | RPO efetivo | Resultado | Notas |
|------|------|------------|------------|-------------|-----------|-------|
| — | — | — | — | — | **Pendente 1º drill** | Usar `restore-drill.sh` |

Após cada drill: atualizar esta tabela **e** [`project-context.md`](./project-context.md) § Postgres PG17.

---

## 9. Referências cruzadas

- [`../.claude/constitution.md`](../.claude/constitution.md) — backup inviolável, métricas
- [`../../docs/architecture/ddia/gap-matrix.md`](../../docs/architecture/ddia/gap-matrix.md) — Cap. 5
- [`.claude/skills/production-patterns/references/predeploy-checklist.md`](../../.claude/skills/production-patterns/references/predeploy-checklist.md) — restore drill genérico
- [`../../.claude/skills/migration-febracis-dre-to-local/SKILL.md`](../../.claude/skills/migration-febracis-dre-to-local/SKILL.md) — paridade S3
