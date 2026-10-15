#!/usr/bin/env bash
# Backup de la base de datos (formato custom de pg_dump). Conserva los últimos 7.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.prod; set +a
mkdir -p backups
file="radar-$(date +%Y%m%d-%H%M).dump"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "/backups/$file"
ls -1t backups/radar-*.dump | tail -n +8 | xargs -r rm --
echo "$(date -Is) backup OK: backups/$file ($(du -h "backups/$file" | cut -f1))"
