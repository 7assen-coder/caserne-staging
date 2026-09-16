#!/usr/bin/env bash
# Phase 26 — daily DB + media backup + retention.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/polyspace}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
LOG_DIR="${BACKUP_ROOT}/logs"
mkdir -p "${LOG_DIR}"
chmod 700 "${BACKUP_ROOT}" 2>/dev/null || true
LOG="${LOG_DIR}/backup_$(date -u +%Y%m%d).log"

{
  echo "=== backup_all $(date -u -Iseconds) ==="
  "${ROOT}/backup_db.sh"
  "${ROOT}/backup_media.sh"

  echo "retention: delete dumps older than ${BACKUP_KEEP_DAYS} days"
  find "${BACKUP_ROOT}/db" -type f \( -name '*.dump' -o -name '*.dump.age' -o -name '*.sha256' \) \
    -mtime "+${BACKUP_KEEP_DAYS}" -print -delete 2>/dev/null || true
  find "${BACKUP_ROOT}/media" -type f \( -name 'media_*.tar.gz' -o -name 'media_s3_*.tar.gz' -o -name '*.sha256' \) \
    -mtime "+${BACKUP_KEEP_DAYS}" -print -delete 2>/dev/null || true
  find "${BACKUP_ROOT}/media" -mindepth 1 -maxdepth 1 -type d -mtime "+${BACKUP_KEEP_DAYS}" \
    -print -exec rm -rf {} + 2>/dev/null || true

  echo "=== done $(date -u -Iseconds) ==="
} 2>&1 | tee -a "${LOG}"
