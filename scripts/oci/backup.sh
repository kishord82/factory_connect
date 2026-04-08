#!/usr/bin/env bash
###############################################################################
# FactoryConnect — Database Backup Script
# Usage: ./backup.sh [--upload]
#   --upload: Also upload to MinIO (OCI Object Storage compatible)
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.oci.yml"
ENV_FILE="$SCRIPT_DIR/.env.production"
BACKUP_DIR="/opt/factoryconnect/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="fc_backup_${TIMESTAMP}.sql.gz"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[BACKUP]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Load env
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed 's/^/export /')
fi

POSTGRES_USER="${POSTGRES_USER:-fc_app}"
POSTGRES_DB="${POSTGRES_DB:-factoryconnect}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

# ── Check PostgreSQL is running ──────────────────────────────────────────────
if ! docker exec fc-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; then
  err "PostgreSQL is not running or not ready."
  exit 1
fi

# ── Create backup ────────────────────────────────────────────────────────────
log "Creating backup: $BACKUP_FILE"
log "Database: $POSTGRES_DB | User: $POSTGRES_USER"

docker exec fc-postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  --format=plain \
  --verbose \
  2>/dev/null | gzip > "$BACKUP_DIR/$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
log "Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# ── Upload to MinIO (optional) ──────────────────────────────────────────────
if [[ "${1:-}" == "--upload" ]]; then
  log "Uploading to MinIO..."

  MINIO_ALIAS="fc-minio"
  MINIO_BUCKET="backups"

  # Configure mc client inside the MinIO container
  docker exec fc-minio mc alias set "$MINIO_ALIAS" \
    "http://localhost:9000" \
    "${MINIO_ROOT_USER}" \
    "${MINIO_ROOT_PASSWORD}" 2>/dev/null

  # Create bucket if it doesn't exist
  docker exec fc-minio mc mb --ignore-existing "$MINIO_ALIAS/$MINIO_BUCKET" 2>/dev/null

  # Copy backup into the container and upload
  docker cp "$BACKUP_DIR/$BACKUP_FILE" fc-minio:/tmp/"$BACKUP_FILE"
  docker exec fc-minio mc cp "/tmp/$BACKUP_FILE" "$MINIO_ALIAS/$MINIO_BUCKET/$BACKUP_FILE"
  docker exec fc-minio rm -f "/tmp/$BACKUP_FILE"

  log "Uploaded to MinIO: $MINIO_BUCKET/$BACKUP_FILE"
fi

# ── Prune old backups ───────────────────────────────────────────────────────
log "Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "fc_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
REMAINING=$(ls "$BACKUP_DIR"/fc_backup_*.sql.gz 2>/dev/null | wc -l)
log "Local backups retained: $REMAINING"

# ── Summary ──────────────────────────────────────────────────────────────────
log ""
log "Backup summary:"
log "  File:      $BACKUP_DIR/$BACKUP_FILE"
log "  Size:      $BACKUP_SIZE"
log "  Retained:  $REMAINING backups"
