#!/usr/bin/env bash
###############################################################################
# FactoryConnect — Health Check Script
# Verifies all production services are running and healthy
# Usage: ./health-check.sh
###############################################################################
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.oci.yml"
ENV_FILE="$SCRIPT_DIR/.env.production"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN_COUNT=0

check_pass() { echo -e "  ${GREEN}✓${NC} $*"; PASS=$((PASS + 1)); }
check_fail() { echo -e "  ${RED}✗${NC} $*"; FAIL=$((FAIL + 1)); }
check_warn() { echo -e "  ${YELLOW}!${NC} $*"; WARN_COUNT=$((WARN_COUNT + 1)); }

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  FactoryConnect — Health Check"
echo "  $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Load env
if [ -f "$ENV_FILE" ]; then
  DOMAIN=$(grep "^DOMAIN=" "$ENV_FILE" | cut -d= -f2)
  POSTGRES_USER=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d= -f2)
  POSTGRES_DB=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d= -f2)
  REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" "$ENV_FILE" | cut -d= -f2)
else
  DOMAIN="localhost"
  POSTGRES_USER="fc_app"
  POSTGRES_DB="factoryconnect"
  REDIS_PASSWORD=""
fi

# ── Docker containers ────────────────────────────────────────────────────────
echo "Docker Containers:"
for svc in postgres redis vault minio keycloak api portal caddy; do
  container="fc-$svc"
  status=$(docker inspect "$container" --format='{{.State.Status}}' 2>/dev/null || echo "not found")
  health=$(docker inspect "$container" --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")

  if [ "$status" = "running" ]; then
    if [ "$health" = "healthy" ]; then
      check_pass "$svc: running (healthy)"
    elif [ "$health" = "none" ]; then
      check_pass "$svc: running (no healthcheck)"
    else
      check_warn "$svc: running ($health)"
    fi
  else
    check_fail "$svc: $status"
  fi
done

echo ""

# ── PostgreSQL connection ────────────────────────────────────────────────────
echo "PostgreSQL:"
if docker exec fc-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; then
  check_pass "Connection OK"

  # Check schemas exist
  schema_count=$(docker exec fc-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name IN ('core','orders','workflow','compliance','audit','ai','platform');" 2>/dev/null)
  if [ "$schema_count" -ge 7 ] 2>/dev/null; then
    check_pass "All 7 schemas present"
  else
    check_warn "Only $schema_count of 7 schemas found"
  fi

  # Check factory count
  factory_count=$(docker exec fc-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT COUNT(*) FROM core.factories;" 2>/dev/null || echo "0")
  if [ "$factory_count" -gt 0 ] 2>/dev/null; then
    check_pass "Seed data: $factory_count factories"
  else
    check_warn "No factory seed data found"
  fi
else
  check_fail "Connection failed"
fi

echo ""

# ── Redis ────────────────────────────────────────────────────────────────────
echo "Redis:"
if [ -n "$REDIS_PASSWORD" ]; then
  redis_pong=$(docker exec fc-redis redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null)
else
  redis_pong=$(docker exec fc-redis redis-cli ping 2>/dev/null)
fi
if [ "$redis_pong" = "PONG" ]; then
  check_pass "PING → PONG"
else
  check_fail "PING failed"
fi

echo ""

# ── API endpoint ─────────────────────────────────────────────────────────────
echo "API:"
api_response=$(docker exec fc-api wget -qO- --timeout=5 http://localhost:3000/healthz 2>/dev/null || echo "")
if [ -n "$api_response" ]; then
  check_pass "/healthz responds: $(echo "$api_response" | head -c 100)"
else
  # Try from host
  api_response=$(curl -sf --max-time 5 http://localhost:3000/healthz 2>/dev/null || echo "")
  if [ -n "$api_response" ]; then
    check_pass "/healthz responds (via host): $(echo "$api_response" | head -c 100)"
  else
    check_fail "/healthz not responding"
  fi
fi

echo ""

# ── Portal ───────────────────────────────────────────────────────────────────
echo "Portal:"
portal_response=$(docker exec fc-portal wget -qO- --timeout=5 http://localhost:3001/ 2>/dev/null | head -c 200 || echo "")
if echo "$portal_response" | grep -q "FactoryConnect\|root\|html" 2>/dev/null; then
  check_pass "Serves index.html"
else
  check_fail "Not serving content"
fi

echo ""

# ── Caddy (external access) ─────────────────────────────────────────────────
echo "Caddy (Reverse Proxy):"
caddy_http=$(curl -sf --max-time 5 -o /dev/null -w "%{http_code}" "http://localhost/" 2>/dev/null || echo "000")
if [ "$caddy_http" = "200" ] || [ "$caddy_http" = "308" ] || [ "$caddy_http" = "301" ]; then
  check_pass "HTTP port 80: $caddy_http"
else
  check_fail "HTTP port 80: $caddy_http"
fi

caddy_api=$(curl -sf --max-time 5 -o /dev/null -w "%{http_code}" "http://localhost/api/healthz" 2>/dev/null || echo "000")
if [ "$caddy_api" = "200" ]; then
  check_pass "API proxy /api/healthz: $caddy_api"
else
  check_warn "API proxy /api/healthz: $caddy_api"
fi

echo ""

# ── Resource usage ───────────────────────────────────────────────────────────
echo "Resource Usage:"
echo "  $(docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' 2>/dev/null | head -10 || echo 'Unable to get stats')"
echo ""

# ── Disk usage ───────────────────────────────────────────────────────────────
echo "Disk:"
df_output=$(df -h / | tail -1)
disk_used=$(echo "$df_output" | awk '{print $5}')
echo "  Root partition: $disk_used used"
docker_size=$(docker system df --format '{{.Size}}' 2>/dev/null | head -1 || echo "unknown")
echo "  Docker images: $docker_size"
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}All checks passed${NC}: $PASS passed, $WARN_COUNT warnings"
  echo "═══════════════════════════════════════════════════════════════"
  exit 0
else
  echo -e "  ${RED}Issues detected${NC}: $PASS passed, $FAIL failed, $WARN_COUNT warnings"
  echo "═══════════════════════════════════════════════════════════════"
  exit 1
fi
