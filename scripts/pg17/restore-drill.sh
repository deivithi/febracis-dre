#!/usr/bin/env bash
# restore-drill.sh — restore não destrutivo para febracis_dre_drill_YYYYMMDD
set -euo pipefail

COMPOSE_DIR="${PG17_COMPOSE_DIR:-$HOME/pg17-migration}"
CONTAINER="${PG17_CONTAINER:-pg17-migration}"
BACKUP_DIR="${PG17_BACKUP_DIR:-/mnt/e/supabase-backup}"
DRILL_DB="febracis_dre_drill_$(date +%Y%m%d)"

if [[ ! -f "$COMPOSE_DIR/.env" ]]; then
  echo "ERROR: missing $COMPOSE_DIR/.env"
  exit 1
fi

PG_PASS=$(grep '^POSTGRES_PASSWORD=' "$COMPOSE_DIR/.env" | cut -d= -f2-)

LATEST=$(find "$BACKUP_DIR" -maxdepth 2 -type f \( -name 'febracis_dre*.dump' -o -name '*febracis_dre*.dump' \) -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
if [[ -z "${LATEST:-}" ]]; then
  echo "ERROR: no dump in $BACKUP_DIR"
  exit 1
fi

echo "== restore drill =="
echo "dump: $LATEST"
echo "target_db: $DRILL_DB"
START=$(date +%s)

sudo docker exec -e PGPASSWORD="$PG_PASS" "$CONTAINER" \
  psql -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS ${DRILL_DB}; CREATE DATABASE ${DRILL_DB};"

if [[ "$LATEST" == *.dump ]]; then
  sudo docker exec -i -e PGPASSWORD="$PG_PASS" "$CONTAINER" \
    pg_restore -h 127.0.0.1 -U postgres -d "$DRILL_DB" --no-owner --role=postgres < "$LATEST"
else
  echo "ERROR: unsupported dump format (expected .dump): $LATEST"
  exit 1
fi

sudo docker exec -e PGPASSWORD="$PG_PASS" "$CONTAINER" \
  psql -h 127.0.0.1 -U postgres -d "$DRILL_DB" -tAc \
  "SELECT 'audit_log', count(*)::text FROM public.audit_log
   UNION ALL SELECT 'profiles', count(*)::text FROM public.profiles;"

END=$(date +%s)
RTO_MIN=$(( (END - START) / 60 ))
echo "RTO_minutes: $RTO_MIN"
echo "OK: drill DB $DRILL_DB — drop manually when done:"
echo "  DROP DATABASE ${DRILL_DB};"
