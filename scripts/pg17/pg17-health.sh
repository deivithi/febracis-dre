#!/usr/bin/env bash
# pg17-health.sh — smoke PG17 febracis_dre (WSL)
set -euo pipefail

COMPOSE_DIR="${PG17_COMPOSE_DIR:-$HOME/pg17-migration}"
CONTAINER="${PG17_CONTAINER:-pg17-migration}"
DB="${PG17_DB:-febracis_dre}"

if [[ ! -f "$COMPOSE_DIR/.env" ]]; then
  echo "ERROR: missing $COMPOSE_DIR/.env"
  exit 1
fi

PG_PASS=$(grep '^POSTGRES_PASSWORD=' "$COMPOSE_DIR/.env" | cut -d= -f2-)

echo "== PG17 health =="
echo "compose: $COMPOSE_DIR"
echo "container: $CONTAINER"
echo "database: $DB"

if ! sudo docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "ERROR: container $CONTAINER not found"
  exit 1
fi

STATUS=$(sudo docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "no-healthcheck")
echo "health: $STATUS"

if [[ "$STATUS" != "healthy" && "$STATUS" != "no-healthcheck" ]]; then
  echo "WARN: container not healthy"
fi

sudo docker exec -e PGPASSWORD="$PG_PASS" "$CONTAINER" \
  psql -h 127.0.0.1 -U postgres -d postgres -tAc "SELECT version();" | head -1

sudo docker exec -e PGPASSWORD="$PG_PASS" "$CONTAINER" \
  psql -h 127.0.0.1 -U postgres -d "$DB" -tAc \
  "SELECT 'audit_log', count(*)::text FROM public.audit_log
   UNION ALL SELECT 'profiles', count(*)::text FROM public.profiles
   UNION ALL SELECT 'content_chunks', count(*)::text FROM public.content_chunks;"

echo "OK: pg17-health completed"
