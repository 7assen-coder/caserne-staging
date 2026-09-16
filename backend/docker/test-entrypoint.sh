#!/bin/sh
# Test-only entrypoint: wait for Postgres + migrate. Skip collectstatic (prod entrypoint.sh).
set -e

echo "Waiting for database..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 0.1
done
echo "Database started"

echo "Running migrate..."
python manage.py migrate --noinput

exec "$@"
