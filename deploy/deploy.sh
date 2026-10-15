#!/usr/bin/env bash
# Actualiza el código y reconstruye los servicios. Ejecutar en el servidor:
#   bash deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker image prune -f
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
