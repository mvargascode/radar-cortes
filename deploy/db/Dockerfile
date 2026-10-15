# PostgreSQL 16 + PostGIS, multiarquitectura (amd64 y arm64).
# La imagen oficial postgis/postgis no publica arm64, y el servidor de Oracle es ARM (Ampere A1).
# La imagen oficial de postgres ya trae configurado el repositorio apt de PostgreSQL (PGDG).
FROM postgres:16-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16-postgis-3 \
 && rm -rf /var/lib/apt/lists/*
