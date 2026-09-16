#!/usr/bin/env bash
# Deploy an approved git tag to Hostinger VPS production.
# Usage (on VPS, from /opt/polyspace/app):
#   ./scripts/deploy-prod.sh v1.2.0
# Or from laptop via SSH:
#   ssh root@VPS_IP 'cd /opt/polyspace/app && ./scripts/deploy-prod.sh v1.2.0'
#
# Pre-deploy gate (Phases 33–34) — do this before tagging / running:
#   1. GitHub Actions `ci-ok` green on the commit
#   2. k6 officers-100 PASS within 7 days (docs/load-reports/)
#   3. See docs/ops-testing.md
set -euo pipefail

TAG="${1:-}"
if [[ -z "$TAG" ]]; then
  echo "Usage: $0 <git-tag>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f backend/.env.prod ]]; then
  echo "Missing backend/.env.prod — copy from .env.example and fill secrets." >&2
  exit 1
fi
if [[ ! -f .env.prod ]]; then
  echo "Missing .env.prod (DB_PASSWORD, MINIO_ROOT_PASSWORD, …) at repo root." >&2
  exit 1
fi

echo "==> Fetch / checkout $TAG"
git fetch --tags --prune
git checkout "$TAG"

echo "==> Build"
docker compose -f docker-compose.prod.yml --env-file .env.prod build

echo "==> Migrate"
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm backend \
  python manage.py migrate --noinput

echo "==> Up"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "==> Smoke healthz"
sleep 3
curl -fsS "https://api.polyspace.mr/api/healthz/" | head -c 400 || {
  echo "WARN: public healthz failed — check DNS / Caddy; trying internal…"
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T backend \
    wget -qO- http://127.0.0.1:8080/api/healthz/ || true
}

echo "==> Done ($TAG)"
