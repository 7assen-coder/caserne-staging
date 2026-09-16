#!/usr/bin/env bash
# Phase 26 — Postgres custom-format dump + sha256.
# Env: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE BACKUP_ROOT [BACKUP_ENCRYPT_RECIPIENT]
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/polyspace}"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-esp}"
PGDATABASE="${PGDATABASE:-esp}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
OUT_DIR="${BACKUP_ROOT}/db"
mkdir -p "${OUT_DIR}"
chmod 700 "${BACKUP_ROOT}" 2>/dev/null || true

DUMP="${OUT_DIR}/${PGDATABASE}_${STAMP}.dump"
export PGPASSWORD="${PGPASSWORD:?PGPASSWORD is required}"

echo "dumping ${PGDATABASE}@${PGHOST}:${PGPORT} → ${DUMP}"
pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" \
  -Fc --no-owner --no-acl -f "${DUMP}"

sha256sum "${DUMP}" > "${DUMP}.sha256"
chmod 600 "${DUMP}" "${DUMP}.sha256"

if [[ -n "${BACKUP_ENCRYPT_RECIPIENT:-}" ]]; then
  if command -v age >/dev/null 2>&1; then
    age -r "${BACKUP_ENCRYPT_RECIPIENT}" -o "${DUMP}.age" "${DUMP}"
    rm -f "${DUMP}"
    sha256sum "${DUMP}.age" > "${DUMP}.age.sha256"
    echo "encrypted ${DUMP}.age"
  else
    echo "WARNING: BACKUP_ENCRYPT_RECIPIENT set but age not installed; left plaintext" >&2
  fi
fi

echo "ok ${DUMP}"
