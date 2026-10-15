# Despliegue en Oracle Cloud (Always Free)

Todo corre en una sola máquina con Docker Compose: PostgreSQL + PostGIS, el collector,
la API y Caddy (web + HTTPS). Ver la decisión D-017.

```
Internet ──443──▶ Caddy ──┬──▶ /srv (web estática)
                          └──▶ /api/* ──▶ api:3000 ──▶ db:5432 ◀── collector (cada 15 min) ──▶ SEC
```

## 1. Crear la máquina (consola de Oracle)

1. Cuenta nueva con **región de origen Santiago** (`sa-santiago-1`). No se puede cambiar después.
2. *Compute → Instances → Create instance*:
   - Imagen: **Canonical Ubuntu 24.04** (aarch64).
   - Forma: **VM.Standard.A1.Flex**, **2 OCPU** y **12 GB**.
   - Red: crear VCN nueva con subred pública y **asignar IP pública**.
   - SSH: *Generate a key pair* y **descargar la llave privada**.
   - Boot volume: **100 GB**.
   - Si aparece *Out of host capacity*: probar otro *availability domain* o reintentar más tarde.
3. *Networking → Virtual cloud networks → (tu VCN) → Security lists → Default*:
   agregar reglas de **ingreso** desde `0.0.0.0/0`, TCP puertos **80** y **443** (y UDP 443).

## 2. Dominio gratuito

En [duckdns.org](https://www.duckdns.org) crear un subdominio (ej. `radardecortes`) y apuntarlo a la IP pública.

## 3. Conectarse por SSH (Windows / PowerShell)

```powershell
# Restringir permisos de la llave (Windows exige que solo tú puedas leerla)
icacls .\ssh-key.key /inheritance:r /grant:r "$($env:USERNAME):(R)"
ssh -i .\ssh-key.key ubuntu@IP_PUBLICA
```

## 4. Preparar el servidor

```bash
git clone https://github.com/mvargascode/radar-cortes.git
cd radar-cortes
bash deploy/setup-server.sh
exit   # salir y volver a entrar para usar docker sin sudo
```

```bash
cd radar-cortes
cp .env.prod.example .env.prod
nano .env.prod      # DOMAIN, ACME_EMAIL y una POSTGRES_PASSWORD larga (openssl rand -base64 32)
```

## 5. Cargar el historial

**En tu PC** (PowerShell). Se genera el dump dentro del contenedor para no corromper el binario:

```powershell
docker exec radar-db pg_dump -U radar -d radar_cortes -Fc -f /tmp/radar-local.dump
docker cp radar-db:/tmp/radar-local.dump .\radar-local.dump
scp -i .\ssh-key.key .\radar-local.dump ubuntu@IP_PUBLICA:~/radar-cortes/backups/
```

**En el servidor**, solo la base de datos primero:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build db
bash deploy/restore.sh backups/radar-local.dump
```

Pueden aparecer avisos sobre la extensión `postgis`; son normales. La verificación final
debe mostrar 346 comunas y ~24.000 horas.

## 6. Levantar todo

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f collector
```

Abrir `https://TU_DOMINIO`. El primer arranque tarda ~1 minuto mientras Caddy obtiene el certificado.

Con esto el collector corre 24/7 en el servidor: **detén el `--watch` de tu PC**.

## Operación diaria

| Tarea | Comando (en el servidor) |
|---|---|
| Actualizar a la última versión de `main` | `bash deploy/deploy.sh` |
| Ver estado | `docker compose -f docker-compose.prod.yml --env-file .env.prod ps` |
| Logs de un servicio | `... logs -f api` (o `collector`, `web`, `db`) |
| Backup manual | `bash deploy/backup.sh` |
| Salud | `curl https://TU_DOMINIO/api/health` |

### Backups
`setup-server.sh` programa un backup diario a las 04:30 en `backups/` (se guardan los últimos 7).
**Un backup que solo vive en el servidor no protege si Oracle reclama la máquina**: copiar
periódicamente el más reciente al PC:

```powershell
scp -i .\ssh-key.key "ubuntu@IP_PUBLICA:~/radar-cortes/backups/radar-*.dump" .\backups\
```

### Si Oracle reclama la máquina
Crear una nueva y repetir los pasos 1 a 6 usando el último backup. Lo que se perdió entre el
backup y la caída se recupera solo: `npm run backfill` vuelve a pedir esas horas a la SEC.
