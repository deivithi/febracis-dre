# Scripts PG17 — febracis-dre

Procedimentos operacionais WSL para backup/DR. Runbook completo: [`../../references/runbook-pg17-dr.md`](../../references/runbook-pg17-dr.md).

## PowerShell (Windows)

```powershell
cd C:\Users\PC\OneDrive\Documents\VS CODE\febracis-dre
.\scripts\pg17\run-pg17-wsl.ps1 health
.\scripts\pg17\run-pg17-wsl.ps1 backup-verify
.\scripts\pg17\run-pg17-wsl.ps1 restore-drill
```

## WSL direto

```bash
bash ~/path/to/pg17-health.sh
```

Variáveis opcionais: `PG17_COMPOSE_DIR`, `PG17_BACKUP_DIR`, `PG17_BACKUP_MAX_AGE_HOURS`.
