#!/usr/bin/env bash
# Phase 26 — restore media archive into staging dir/bucket (never silent prod overwrite).
# Usage: CONFIRM_RESTORE=YES ./restore_media.sh path/to/media_YYYYMMDD.tar.gz
set -euo pipefail

ARCHIVE="${1:?usage: restore_media.sh <media_*.tar.gz>}"
[[ -f "${ARCHIVE}" ]] || { echo "missing archive: ${ARCHIVE}" >&2; exit 1; }

if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Refusing: set CONFIRM_RESTORE=YES" >&2
  exit 1
fi

DEST="${MEDIA_RESTORE_DIR:-./media_restore}"
PROD_BUCKET="${AWS_STORAGE_BUCKET_NAME:-polyspace-media}"
TARGET_BUCKET="${RESTORE_MEDIA_BUCKET:-${PROD_BUCKET}-restore}"

if [[ -f "${ARCHIVE}.sha256" ]]; then
  sha256sum -c "${ARCHIVE}.sha256"
fi

mkdir -p "${DEST}"
tar -xzf "${ARCHIVE}" -C "${DEST}"
echo "extracted to ${DEST}"

USE_S3="${USE_S3_MEDIA:-false}"
USE_S3_LC="$(echo "${USE_S3}" | tr '[:upper:]' '[:lower:]')"

if [[ "${USE_S3_LC}" =~ ^(1|true|yes|on)$ ]]; then
  if [[ "${TARGET_BUCKET}" == "${PROD_BUCKET}" && "${ALLOW_PROD_RESTORE:-}" != "YES" ]]; then
    echo "Refusing to sync into production bucket '${PROD_BUCKET}'. Set RESTORE_MEDIA_BUCKET=…-restore or ALLOW_PROD_RESTORE=YES" >&2
    exit 1
  fi
  if command -v aws >/dev/null 2>&1; then
    EXTRA=()
    if [[ -n "${AWS_S3_ENDPOINT_URL:-}" ]]; then
      EXTRA+=(--endpoint-url "${AWS_S3_ENDPOINT_URL}")
    fi
    # Find first directory under DEST to sync
    SRC="$(find "${DEST}" -mindepth 1 -maxdepth 1 -type d | head -1)"
    SRC="${SRC:-${DEST}}"
    echo "s3 sync ${SRC} → s3://${TARGET_BUCKET}"
    aws s3 sync "${SRC}" "s3://${TARGET_BUCKET}" "${EXTRA[@]}"
  else
    echo "extracted locally only (aws CLI missing); staging path: ${DEST}"
  fi
fi

echo "ok media restore (staging). Do not point production at this copy without review."
