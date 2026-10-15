#!/usr/bin/env bash
# Restaura un dump en la base de datos del servidor. Uso:
#   bash deploy/restore.sh backups/radar-local.dump
# Pensado para una base recién creada (primera carga del historial) o para recuperar un desastre.
set -euo pipefail
cd "$(dirname "$0")/.."
dump="${1:?Indica el archivo .dump}"
set -a; source .env.prod; set +a
mkdir -p backups
cp -n "$dump" backups/ 2>/dev/null || true
name="$(basename "$dump")"
echo "==> Restaurando $name en $POSTGRES_DB (puede tardar varios minutos)"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges -j 2 "/backups/$name" || true
echo "==> Verificación"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT (SELECT count(*) FROM comunas) AS comunas, (SELECT count(*) FROM fetched_hours) AS horas, (SELECT count(*) FROM incidents) AS incidentes;"
