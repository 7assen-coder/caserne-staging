#!/bin/sh
# Phase 19 — env-driven Gunicorn (WSGI). Defaults suit local; VPS sets WORKERS=9.
set -e
WORKERS="${GUNICORN_WORKERS:-3}"
THREADS="${GUNICORN_THREADS:-2}"
TIMEOUT="${GUNICORN_TIMEOUT:-60}"
MAX_REQ="${GUNICORN_MAX_REQUESTS:-1000}"
PORT="${PORT:-8080}"

exec gunicorn backend.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --worker-class gthread \
  --workers "${WORKERS}" \
  --threads "${THREADS}" \
  --timeout "${TIMEOUT}" \
  --graceful-timeout 30 \
  --keep-alive 5 \
  --max-requests "${MAX_REQ}" \
  --max-requests-jitter 100 \
  --access-logfile - \
  --error-logfile -
