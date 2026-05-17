#!/bin/sh

# Wait for database
echo "Waiting for database..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "Database started"

# Run migrations
echo "Running makemigrations..."
rm */migrations/*
python manage.py makemigrations
echo "Running migrate..."
python manage.py migrate

# Collect static files for production
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Execute the main command
exec "$@"
