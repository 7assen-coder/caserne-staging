#!/usr/bin/env bash
# Phase 26 — quarterly restore drill (non-prod DB).
# Env: same as restore_db.sh + optional API_BASE OPERATOR_INITIALS
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/polyspace}"
DRILL_DIR="${BACKUP_ROOT}/drills"
mkdir -p "${DRILL_DIR}"

DUMP="${1:-}"
if [[ -z "${DUMP}" ]]; then
  DUMP="$(ls -1t "${BACKUP_ROOT}/db"/*.dump 2>/dev/null | head -1 || true)"
fi
[[ -n "${DUMP}" && -f "${DUMP}" ]] || { echo "no dump found; pass path as arg1" >&2; exit 1; }

START="$(date -u +%s)"
REPORT="${DRILL_DIR}/drill_$(date -u +%Y%m%d_%H%M%S).txt"
PASS=fail
OPERATOR="${OPERATOR_INITIALS:-unknown}"
API_BASE="${API_BASE:-http://127.0.0.1:8000}"

{
  echo "restore drill"
  echo "operator=${OPERATOR}"
  echo "dump=${DUMP}"
  echo "started=$(date -u -Iseconds)"
} > "${REPORT}"

set +e
export CONFIRM_RESTORE=YES
export PGDATABASE="${PGDATABASE:-esp_drill}"
export PROD_DB_NAME="${PROD_DB_NAME:-esp}"
"${ROOT}/restore_db.sh" "${DUMP}"
RC=$?
set -e

if [[ "${RC}" -eq 0 ]]; then
  # Optional API check if server is already pointed at drill DB
  if curl -sf --max-time 5 "${API_BASE}/api/readyz/" >/dev/null 2>&1; then
    echo "readyz=ok" >> "${REPORT}"
  else
    echo "readyz=skipped_or_fail (point API at ${PGDATABASE} manually)" >> "${REPORT}"
  fi
  # Count tables via psql if available
  if command -v psql >/dev/null 2>&1; then
    export PGPASSWORD="${PGPASSWORD:?}"
    COUNT="$(psql -h "${PGHOST:-127.0.0.1}" -p "${PGPORT:-5432}" -U "${PGUSER:-esp}" -d "${PGDATABASE}" \
      -Atc "SELECT count(*) FROM etudiants_eleve" 2>/dev/null || echo n/a)"
    echo "eleves_count=${COUNT}" >> "${REPORT}"
  fi
  PASS=pass
fi

END="$(date -u +%s)"
DUR=$((END - START))
{
  echo "finished=$(date -u -Iseconds)"
  echo "duration_sec=${DUR}"
  echo "result=${PASS}"
} >> "${REPORT}"

echo "report ${REPORT}"
[[ "${PASS}" == "pass" ]]
