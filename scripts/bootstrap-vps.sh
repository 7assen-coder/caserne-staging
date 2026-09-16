#!/usr/bin/env bash
# First-time Hostinger VPS bootstrap (Phase 31). Run as root.
set -euo pipefail

apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg ufw fail2ban git
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

mkdir -p /opt/polyspace/{app,data/{postgres,redis,minio,prometheus,loki,alloy,grafana,uptime-kuma},backups,observability}

echo "Clone or rsync the repo into /opt/polyspace/app"
echo "Then: cp .env.prod.example .env.prod && cp backend/.env.example backend/.env.prod"
echo "Fill secrets, set DNS (docs/dns-polyspace.md), then ./scripts/deploy-prod.sh <tag>"
echo "Observability: docs/ops-observability.md"
