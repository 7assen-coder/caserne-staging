#!/usr/bin/env bash
# Phase 26 — restore Postgres custom dump into a non-prod DB by default.
# Usage: CONFIRM_RESTORE=YES PGDATABASE=esp_restore ./restore_db.sh path/to/file.dump
set -euo pipefail

DUMP="${1:?usage: restore_db.sh <file.dump>}"
[[ -f "${DUMP}" ]] || { echo "missing dump: ${DUMP}" >&2; exit 1; }

if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Refusing: set CONFIRM_RESTORE=YES" >&2
  exit 1
fi

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-esp}"
PGDATABASE="${PGDATABASE:-esp_restore}"
PROD_DB_NAME="${PROD_DB_NAME:-esp}"
export PGPASSWORD="${PGPASSWORD:?PGPASSWORD is required}"

if [[ "${PGDATABASE}" == "${PROD_DB_NAME}" && "${ALLOW_PROD_RESTORE:-}" != "YES" ]]; then
  echo "Refusing to restore into production DB '${PROD_DB_NAME}'. Set ALLOW_PROD_RESTORE=YES or use PGDATABASE=esp_restore" >&2
  exit 1
fi

if [[ -f "${DUMP}.sha256" ]]; then
  echo "verifying checksum"
  sha256sum -c "${DUMP}.sha256"
fi

echo "ensuring database ${PGDATABASE} exists"
psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres \
  -tc "SELECT 1 FROM pg_database WHERE datname='${PGDATABASE}'" | grep -q 1 \
  || psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres \
       -c "CREATE DATABASE \"${PGDATABASE}\""

echo "restoring into ${PGDATABASE}"
set +e
pg_restore -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" \
  --clean --if-exists --no-owner --no-acl "${DUMP}"
RC=$?
set -e
# pg_restore: 0 = success, 1 = completed with non-fatal warnings (e.g. version skew)
if [[ "${RC}" -gt 1 ]]; then
  echo "pg_restore failed with exit ${RC}" >&2
  exit "${RC}"
fi
if [[ "${RC}" -eq 1 ]]; then
  echo "warning: pg_restore reported non-fatal errors (often client/server version skew); continuing"
fi

echo "ok restore → ${PGDATABASE}"
echo "Next: point API at this DB, curl /api/readyz/, smoke login, open 1 élève + 1 media."
