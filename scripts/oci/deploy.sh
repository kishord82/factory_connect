#!/usr/bin/env bash
###############################################################################
# FactoryConnect — OCI Deploy Script
# Usage: ./deploy.sh [first-run|update|rollback]
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.oci.yml"
ENV_FILE="$SCRIPT_DIR/.env.production"
BACKUP_DIR="/opt/factoryconnect/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Validate prerequisites ──────────────────────────────────────────────────
check_prereqs() {
  if ! command -v docker &>/dev/null; then
    err "Docker not found. Run setup-instance.sh first."
    exit 1
  fi

  if ! docker compose version &>/dev/null; then
    err "Docker Compose not found."
    exit 1
  fi

  if [ ! -f "$ENV_FILE" ]; then
    err ".env.production not found at $ENV_FILE"
    err "Copy .env.production.template → .env.production and fill in real values."
    exit 1
  fi

  # Check for placeholder passwords
  if grep -q "CHANGE_ME" "$ENV_FILE"; then
    warn "Found CHANGE_ME placeholders in .env.production!"
    warn "Replace all CHANGE_ME values with real passwords before deploying."
    read -rp "Continue anyway? (y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      exit 1
    fi
  fi
}

# ── Copy required files to scripts/oci (build context) ──────────────────────
prepare_build_context() {
  log "Preparing build context..."

  # The compose file uses context: . so we need to run from project root
  # But we symlink/copy the necessary config files
  cd "$PROJECT_DIR"

  # Ensure init-db.sql is available for postgres
  if [ ! -f "$SCRIPT_DIR/init-db.sql" ]; then
    cp docker/init-db.sql "$SCRIPT_DIR/init-db.sql"
  fi
}

# ── First Run ────────────────────────────────────────────────────────────────
first_run() {
  log "═══ First Run Deployment ═══"
  check_prereqs
  prepare_build_context

  cd "$PROJECT_DIR"

  # Tag existing images (if any) for potential rollback
  log "Building Docker images..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache api portal

  log "Creating volumes and starting infrastructure..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis vault minio

  log "Waiting for PostgreSQL to be ready..."
  sleep 5
  until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    pg_isready -U fc_app -d factoryconnect; do
    sleep 2
  done

  log "Running database migrations..."
  bash "$SCRIPT_DIR/run-migrations.sh"

  log "Starting Keycloak..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d keycloak
  sleep 10

  log "Starting API and Portal..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api portal

  log "Waiting for API to be healthy..."
  sleep 10

  log "Starting Caddy reverse proxy..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d caddy

  log "Waiting for all services to stabilize..."
  sleep 10

  # Health check
  bash "$SCRIPT_DIR/health-check.sh" || true

  log "═══ First Run Complete ═══"
  log ""
  log "Access your deployment:"
  DOMAIN=$(grep "^DOMAIN=" "$ENV_FILE" | cut -d= -f2)
  log "  HTTP:  http://$DOMAIN"
  log "  HTTPS: https://$DOMAIN (if domain is configured)"
  log ""
}

# ── Update (rebuild + restart) ───────────────────────────────────────────────
update() {
  log "═══ Update Deployment ═══"
  check_prereqs
  prepare_build_context

  cd "$PROJECT_DIR"

  # Save current image IDs for rollback
  log "Saving current image IDs for rollback..."
  mkdir -p "$BACKUP_DIR"
  docker inspect fc-api --format='{{.Image}}' > "$BACKUP_DIR/api_image_$TIMESTAMP.txt" 2>/dev/null || true
  docker inspect fc-portal --format='{{.Image}}' > "$BACKUP_DIR/portal_image_$TIMESTAMP.txt" 2>/dev/null || true

  # Backup database before update
  log "Backing up database..."
  bash "$SCRIPT_DIR/backup.sh" || warn "Backup failed, continuing with update..."

  # Pull latest code (if in a git repo)
  if [ -d "$PROJECT_DIR/.git" ]; then
    log "Pulling latest code..."
    git -C "$PROJECT_DIR" pull --ff-only || warn "Git pull failed. Using local code."
  fi

  # Rebuild only API and Portal
  log "Rebuilding API and Portal images..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build api portal

  # Run migrations (safe — they're idempotent)
  log "Running migrations..."
  bash "$SCRIPT_DIR/run-migrations.sh"

  # Rolling restart: stop old, start new
  log "Restarting API..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps api
  sleep 5

  log "Restarting Portal..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps portal
  sleep 5

  # Reload Caddy (picks up any config changes)
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true

  # Health check
  bash "$SCRIPT_DIR/health-check.sh" || warn "Health check reported issues."

  log "═══ Update Complete ═══"
}

# ── Rollback ─────────────────────────────────────────────────────────────────
rollback() {
  log "═══ Rollback Deployment ═══"

  cd "$PROJECT_DIR"

  # Find most recent backup image IDs
  LATEST_API_BACKUP=$(ls -t "$BACKUP_DIR"/api_image_*.txt 2>/dev/null | head -1)
  LATEST_PORTAL_BACKUP=$(ls -t "$BACKUP_DIR"/portal_image_*.txt 2>/dev/null | head -1)

  if [ -z "$LATEST_API_BACKUP" ] || [ -z "$LATEST_PORTAL_BACKUP" ]; then
    err "No rollback images found in $BACKUP_DIR"
    err "Rollback is only available after at least one 'update' deployment."
    exit 1
  fi

  API_IMAGE=$(cat "$LATEST_API_BACKUP")
  PORTAL_IMAGE=$(cat "$LATEST_PORTAL_BACKUP")

  log "Rolling back to:"
  log "  API image:    $API_IMAGE"
  log "  Portal image: $PORTAL_IMAGE"

  # Stop current containers
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop api portal

  # Tag the old images back
  docker tag "$API_IMAGE" fc-api:rollback 2>/dev/null || true
  docker tag "$PORTAL_IMAGE" fc-portal:rollback 2>/dev/null || true

  # Restart with existing images
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api portal

  sleep 10

  bash "$SCRIPT_DIR/health-check.sh" || warn "Health check reported issues after rollback."

  log "═══ Rollback Complete ═══"
}

# ── Main ─────────────────────────────────────────────────────────────────────
case "${1:-}" in
  first-run)
    first_run
    ;;
  update)
    update
    ;;
  rollback)
    rollback
    ;;
  *)
    echo "Usage: $0 [first-run|update|rollback]"
    echo ""
    echo "  first-run  — Full initial deployment (build, migrate, start all)"
    echo "  update     — Rebuild API + Portal, run migrations, restart"
    echo "  rollback   — Revert to previous image versions"
    exit 1
    ;;
esac
