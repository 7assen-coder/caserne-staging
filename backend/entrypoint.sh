#!/bin/sh
set -e

# Wait for database
echo "Waiting for database..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 0.1
done
echo "Database started"

# Apply checked-in migrations only (never wipe or makemigrations in containers)
echo "Running migrate..."
python manage.py migrate --noinput

# Collect static files for production
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Execute the main command
exec "$@"
