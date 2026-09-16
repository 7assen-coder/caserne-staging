#!/usr/bin/env bash
# Phase 40 — readiness smoke against a running API (local or prod).
# Usage: BASE_URL=https://api.polyspace.mr ./scripts/smoke_scale_readyz.sh
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
BASE_URL="${BASE_URL%/}"
echo "GET ${BASE_URL}/api/readyz/"
curl -sf "${BASE_URL}/api/readyz/" | head -c 500
echo
echo "GET ${BASE_URL}/api/livez/"
curl -sf "${BASE_URL}/api/livez/" | head -c 200
echo
echo OK
