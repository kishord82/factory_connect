#!/usr/bin/env bash
###############################################################################
# FactoryConnect — Build ARM64 images on Mac and push to GHCR
# Run from repo root: bash scripts/oci/build-push.sh
###############################################################################
set -euo pipefail

REGISTRY="ghcr.io/kishord82"
PLATFORM="linux/arm64"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[BUILD]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Require GHCR login ──────────────────────────────────────────────────────
if ! docker info --format '{{json .}}' 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)
auths = d.get('RegistryConfig', {}).get('Configs', {})
sys.exit(0 if any('ghcr.io' in k for k in auths) else 1)
" 2>/dev/null; then
  warn "Not logged into ghcr.io. Attempting login..."
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u kishord82 --password-stdin
  elif [ -f ~/.ghcr-token ]; then
    cat ~/.ghcr-token | docker login ghcr.io -u kishord82 --password-stdin
  else
    err "Not logged into ghcr.io and no token found."
    err "Login with: echo YOUR_PAT | docker login ghcr.io -u kishord82 --password-stdin"
    err "PAT needs: read:packages, write:packages scopes"
    exit 1
  fi
fi

cd "$REPO_ROOT"

# ── Build API ───────────────────────────────────────────────────────────────
log "Building fc-api (${PLATFORM})..."
docker build \
  --platform "$PLATFORM" \
  --file docker/Dockerfile.api \
  --tag "${REGISTRY}/fc-api:latest" \
  --tag "${REGISTRY}/fc-api:$(git rev-parse --short HEAD 2>/dev/null || echo 'local')" \
  .
log "fc-api built successfully."

# ── Build Portal ────────────────────────────────────────────────────────────
log "Building fc-portal (${PLATFORM})..."
docker build \
  --platform "$PLATFORM" \
  --file docker/Dockerfile.portal \
  --tag "${REGISTRY}/fc-portal:latest" \
  --tag "${REGISTRY}/fc-portal:$(git rev-parse --short HEAD 2>/dev/null || echo 'local')" \
  .
log "fc-portal built successfully."

# ── Push to GHCR ────────────────────────────────────────────────────────────
log "Pushing fc-api to GHCR..."
docker push "${REGISTRY}/fc-api:latest"
docker push "${REGISTRY}/fc-api:$(git rev-parse --short HEAD 2>/dev/null || echo 'local')" 2>/dev/null || true

log "Pushing fc-portal to GHCR..."
docker push "${REGISTRY}/fc-portal:latest"
docker push "${REGISTRY}/fc-portal:$(git rev-parse --short HEAD 2>/dev/null || echo 'local')" 2>/dev/null || true

log "═══ Done! Images pushed to GHCR ═══"
log "  ${REGISTRY}/fc-api:latest"
log "  ${REGISTRY}/fc-portal:latest"
log ""
log "Next: on OCI server, run:"
log "  cd /home/opc/fc/scripts/oci"
log "  sudo docker compose -f docker-compose.oci.yml --env-file .env.production pull api portal"
log "  sudo docker compose -f docker-compose.oci.yml --env-file .env.production up -d --no-deps api portal"
