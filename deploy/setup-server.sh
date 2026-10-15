#!/usr/bin/env bash
# Preparación inicial del servidor (Ubuntu 24.04 en Oracle Cloud). Ejecutar UNA vez:
#   bash deploy/setup-server.sh
set -euo pipefail

echo "==> Actualizando el sistema"
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git unattended-upgrades iptables-persistent

echo "==> Instalando Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"

echo "==> Abriendo puertos 80 y 443 en el firewall de Ubuntu"
# Las imágenes de Oracle traen reglas iptables que rechazan todo salvo SSH.
# Las reglas nuevas se insertan ANTES de la regla REJECT.
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 5 -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  fi
done
if ! sudo iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null; then
  sudo iptables -I INPUT 5 -p udp --dport 443 -j ACCEPT
fi
sudo netfilter-persistent save

echo "==> Actualizaciones de seguridad automáticas"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Backup diario a las 04:30 (hora del servidor)"
CRON_LINE="30 4 * * * cd $(pwd) && bash deploy/backup.sh >> backups/backup.log 2>&1"
mkdir -p backups
( crontab -l 2>/dev/null | grep -v 'deploy/backup.sh' ; echo "$CRON_LINE" ) | crontab -

echo
echo "Listo. Cierra la sesión SSH y vuelve a entrar para usar docker sin sudo."
