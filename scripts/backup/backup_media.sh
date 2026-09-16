#!/usr/bin/env bash
# Phase 26 — media snapshot (S3/MinIO mirror or local tar).
# Env: BACKUP_ROOT USE_S3_MEDIA AWS_*  or MEDIA_ROOT / COMPOSE_PROJECT
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/polyspace}"
STAMP="$(date -u +%Y%m%d)"
OUT_DIR="${BACKUP_ROOT}/media"
mkdir -p "${OUT_DIR}"
chmod 700 "${BACKUP_ROOT}" 2>/dev/null || true

USE_S3="${USE_S3_MEDIA:-false}"
USE_S3_LC="$(echo "${USE_S3}" | tr '[:upper:]' '[:lower:]')"

if [[ "${USE_S3_LC}" =~ ^(1|true|yes|on)$ ]]; then
  BUCKET="${AWS_STORAGE_BUCKET_NAME:-polyspace-media}"
  DEST="${OUT_DIR}/${STAMP}"
  mkdir -p "${DEST}"
  if command -v aws >/dev/null 2>&1; then
    EXTRA=()
    if [[ -n "${AWS_S3_ENDPOINT_URL:-}" ]]; then
      EXTRA+=(--endpoint-url "${AWS_S3_ENDPOINT_URL}")
    fi
    echo "s3 sync s3://${BUCKET} → ${DEST}"
    aws s3 sync "s3://${BUCKET}" "${DEST}" "${EXTRA[@]}"
  elif command -v mc >/dev/null 2>&1; then
    ALIAS="${MC_ALIAS:-polyspacebackup}"
    ENDPOINT="${AWS_S3_ENDPOINT_URL:?AWS_S3_ENDPOINT_URL required for mc}"
    mc alias set "${ALIAS}" "${ENDPOINT}" "${AWS_ACCESS_KEY_ID:?}" "${AWS_SECRET_ACCESS_KEY:?}" >/dev/null
    echo "mc mirror ${ALIAS}/${BUCKET} → ${DEST}"
    mc mirror --overwrite "${ALIAS}/${BUCKET}" "${DEST}"
  else
    echo "ERROR: need aws CLI or mc for S3 media backup" >&2
    exit 1
  fi
  (cd "${OUT_DIR}" && tar -czf "media_s3_${STAMP}.tar.gz" "${STAMP}")
  sha256sum "${OUT_DIR}/media_s3_${STAMP}.tar.gz" > "${OUT_DIR}/media_s3_${STAMP}.tar.gz.sha256"
  chmod 600 "${OUT_DIR}/media_s3_${STAMP}.tar.gz" "${OUT_DIR}/media_s3_${STAMP}.tar.gz.sha256"
  echo "ok ${OUT_DIR}/media_s3_${STAMP}.tar.gz"
  exit 0
fi

# Local filesystem / Docker volume
MEDIA_SRC="${MEDIA_ROOT:-}"
if [[ -z "${MEDIA_SRC}" ]]; then
  COMPOSE_FILE="${COMPOSE_FILE:-}"
  if [[ -z "${COMPOSE_FILE}" ]]; then
    SCRIPT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
    COMPOSE_FILE="${SCRIPT_ROOT}/docker-compose.yml"
  fi
  SERVICE="${BACKUP_MEDIA_SERVICE:-backend}"
  MEDIA_IN_CONTAINER="${MEDIA_IN_CONTAINER:-/code/media}"
  ARCHIVE="${OUT_DIR}/media_${STAMP}.tar.gz"
  if command -v docker >/dev/null 2>&1 && docker compose -f "${COMPOSE_FILE}" ps -q "${SERVICE}" 2>/dev/null | grep -q .; then
    echo "tar media from compose service ${SERVICE}:${MEDIA_IN_CONTAINER}"
    docker compose -f "${COMPOSE_FILE}" exec -T "${SERVICE}" \
      tar -C "$(dirname "${MEDIA_IN_CONTAINER}")" -czf - "$(basename "${MEDIA_IN_CONTAINER}")" \
      > "${ARCHIVE}"
  elif [[ -d "${MEDIA_FALLBACK_DIR:-}" ]]; then
    MEDIA_SRC="${MEDIA_FALLBACK_DIR}"
    echo "tar ${MEDIA_SRC}"
    tar -C "$(dirname "${MEDIA_SRC}")" -czf "${ARCHIVE}" "$(basename "${MEDIA_SRC}")"
  else
    FALLBACK="$(cd "$(dirname "$0")/../.." && pwd)/backend/media"
    if [[ -d "${FALLBACK}" ]]; then
      echo "tar ${FALLBACK}"
      tar -C "$(dirname "${FALLBACK}")" -czf "${ARCHIVE}" "$(basename "${FALLBACK}")"
    else
      echo "WARNING: no media source found; writing empty placeholder archive"
      tar -czf "${ARCHIVE}" -T /dev/null
    fi
  fi
else
  ARCHIVE="${OUT_DIR}/media_${STAMP}.tar.gz"
  echo "tar ${MEDIA_SRC}"
  tar -C "$(dirname "${MEDIA_SRC}")" -czf "${ARCHIVE}" "$(basename "${MEDIA_SRC}")"
fi

sha256sum "${ARCHIVE}" > "${ARCHIVE}.sha256"
chmod 600 "${ARCHIVE}" "${ARCHIVE}.sha256"
echo "ok ${ARCHIVE}"
