#!/usr/bin/env bash
# backup-verify.sh — idade do último pg_dump febracis_dre (E:\supabase-backup)
set -euo pipefail

BACKUP_DIR="${PG17_BACKUP_DIR:-/mnt/e/supabase-backup}"
MAX_AGE_HOURS="${PG17_BACKUP_MAX_AGE_HOURS:-48}"

echo "== backup verify =="
echo "dir: $BACKUP_DIR"
echo "max_age_hours: $MAX_AGE_HOURS"

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "ERROR: backup dir not mounted: $BACKUP_DIR"
  exit 1
fi

LATEST=$(find "$BACKUP_DIR" -maxdepth 2 -type f \( -name 'febracis_dre*.dump' -o -name 'febracis_dre*.sql.gz' -o -name '*febracis_dre*.dump' \) -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [[ -z "${LATEST:-}" ]]; then
  LATEST=$(ls -t "$BACKUP_DIR"/*febracis* 2>/dev/null | head -1 || true)
fi

if [[ -z "${LATEST:-}" ]]; then
  echo "ERROR: no febracis_dre backup found under $BACKUP_DIR"
  exit 1
fi

echo "latest: $LATEST"
AGE_SEC=$(( $(date +%s) - $(stat -c %Y "$LATEST") ))
AGE_H=$(( AGE_SEC / 3600 ))
echo "age_hours: $AGE_H"

if (( AGE_H > MAX_AGE_HOURS )); then
  echo "FAIL: backup older than ${MAX_AGE_HOURS}h (RPO risk)"
  exit 1
fi

echo "OK: backup within RPO window"
