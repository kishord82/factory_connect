#!/bin/sh
###############################################################################
# FactoryConnect — Migration Runner
# Runs all SQL migrations (up portion only) and seed data.
# Handles dbmate-format files by extracting content between
# "-- migrate:up" and "-- migrate:down" markers.
###############################################################################

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-fc_app}"
DB_NAME="${DB_NAME:-factoryconnect}"

export PGPASSWORD="${DB_PASSWORD:-fc_password}"

echo "==> Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; do
  sleep 1
done

echo "==> Running migrations..."

for f in /migrations/*.sql; do
  echo "  -> Running $(basename "$f") (up section only)..."
  # Extract only the "up" portion: between "-- migrate:up" and "-- migrate:down"
  sed -n '/^-- migrate:up$/,/^-- migrate:down$/{ /^-- migrate:up$/d; /^-- migrate:down$/d; p; }' "$f" | \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>&1 || {
    echo "  !! Warning: $(basename "$f") had errors (may be idempotent, continuing)"
  }
done

echo "==> Running seed data..."
if [ -f /seed/test-data.sql ]; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /seed/test-data.sql 2>&1 || {
    echo "  !! Warning: seed data had errors (may already exist, continuing)"
  }
fi

echo "==> Migrations complete!"
