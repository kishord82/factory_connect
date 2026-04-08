#!/usr/bin/env bash
###############################################################################
# FactoryConnect — Migration Runner
# Runs all SQL migrations against the production PostgreSQL container
# Usage: ./run-migrations.sh
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.oci.yml"
ENV_FILE="$SCRIPT_DIR/.env.production"
MIGRATIONS_DIR="$PROJECT_DIR/packages/database/migrations"
SEED_DIR="$PROJECT_DIR/packages/database/seed"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[MIGRATE]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Load env vars
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed 's/^/export /')
fi

POSTGRES_USER="${POSTGRES_USER:-fc_app}"
POSTGRES_DB="${POSTGRES_DB:-factoryconnect}"

# ── Check PostgreSQL is reachable ────────────────────────────────────────────
log "Checking PostgreSQL connection..."
until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null; do
  warn "PostgreSQL not ready, waiting..."
  sleep 3
done
log "PostgreSQL is ready."

# ── Create migration tracking table ─────────────────────────────────────────
log "Ensuring migration tracking table exists..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
SQL

# ── Run migrations in order ──────────────────────────────────────────────────
if [ ! -d "$MIGRATIONS_DIR" ]; then
  err "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

MIGRATION_COUNT=0
MIGRATION_APPLIED=0

for migration_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
  filename=$(basename "$migration_file")

  # Check if already applied
  already_applied=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT COUNT(*) FROM public.schema_migrations WHERE version = '$filename';" 2>/dev/null)

  if [ "$already_applied" = "1" ]; then
    log "  ✓ $filename (already applied)"
    continue
  fi

  log "  → Applying: $filename"

  # Extract only the "up" portion (before -- migrate:down)
  # If file has -- migrate:up / -- migrate:down markers, extract up portion
  if grep -q "migrate:down" "$migration_file"; then
    # Extract content between migrate:up and migrate:down
    up_sql=$(sed -n '/^-- migrate:up/,/^-- migrate:down/p' "$migration_file" | head -n -1 | tail -n +2)
  else
    # No markers — use entire file
    up_sql=$(cat "$migration_file")
  fi

  # Run the migration
  echo "$up_sql" | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

  if [ $? -eq 0 ]; then
    # Record successful migration
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q -c \
      "INSERT INTO public.schema_migrations (version) VALUES ('$filename');"
    MIGRATION_APPLIED=$((MIGRATION_APPLIED + 1))
    log "  ✓ $filename applied successfully"
  else
    err "  ✗ $filename FAILED"
    exit 1
  fi
done

log ""
log "Migrations complete: $MIGRATION_APPLIED applied, $((MIGRATION_COUNT - MIGRATION_APPLIED)) skipped (already applied)"

# ── Load seed data (only on first run if tables are empty) ───────────────────
SEED_FILE="$SEED_DIR/test-data.sql"
if [ -f "$SEED_FILE" ]; then
  # Check if seed data already exists
  factory_count=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT COUNT(*) FROM core.factories;" 2>/dev/null || echo "0")

  if [ "$factory_count" = "0" ]; then
    log ""
    log "Loading seed data (demo/test data)..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < "$SEED_FILE"
    log "Seed data loaded."
  else
    log "Seed data already present ($factory_count factories), skipping."
  fi
fi

log ""
log "Database is ready."
