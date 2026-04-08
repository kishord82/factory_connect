#!/bin/bash
###############################################################################
# FactoryConnect — Production Health Check Script
# Verifies all services are running and healthy
# Usage: bash docker/health-check.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Helper function for checks
check_service() {
  local name=$1
  local command=$2
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name"
    ((FAILED++))
  fi
}

# Helper function for HTTP checks
check_http() {
  local name=$1
  local url=$2
  
  if curl -sf "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name"
    ((FAILED++))
  fi
}

echo "================================"
echo "FactoryConnect Health Check"
echo "================================"
echo ""

# PostgreSQL
echo "Database:"
check_service "PostgreSQL" \
  "docker compose -f docker/docker-compose.prod.yml exec postgres pg_isready -U fc_app -d factoryconnect"

# Redis
echo ""
echo "Cache & Queue:"
check_service "Redis" \
  "docker compose -f docker/docker-compose.prod.yml exec redis redis-cli ping"

# Authentication
echo ""
echo "Authentication:"
check_http "Keycloak Health" "http://localhost:8080/health/ready"

# Secrets Management
echo ""
echo "Secrets:"
check_http "Vault Health" "http://localhost:8200/v1/sys/health"

# Object Storage
echo ""
echo "File Storage:"
check_service "MinIO" \
  "docker compose -f docker/docker-compose.prod.yml exec minio mc ready local"

# API Servers
echo ""
echo "API Servers:"
check_http "API Server 1" "http://localhost:3000/health"
check_http "API Server 2" "http://localhost:3001/health"

# Portal
echo ""
echo "Frontend:"
check_http "Portal UI" "http://localhost:3001/health"

# Reverse Proxy
echo ""
echo "Reverse Proxy:"
check_service "Caddy" \
  "docker compose -f docker/docker-compose.prod.yml exec caddy caddy version"

# EDI Transport
echo ""
echo "EDI Transport:"
check_http "OpenAS2" "http://localhost:4080/"

# Monitoring
echo ""
echo "Monitoring:"
check_http "Prometheus" "http://localhost:9090/-/healthy"
check_http "Grafana" "http://localhost:3002/api/health"

# Summary
echo ""
echo "================================"
echo "Health Check Summary"
echo "================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}Failed: $FAILED${NC}"
  echo ""
  echo -e "${GREEN}All services healthy!${NC}"
  exit 0
else
  echo -e "${RED}Failed: $FAILED${NC}"
  echo ""
  echo -e "${RED}Some services are unhealthy. Check logs:${NC}"
  echo "  docker compose -f docker/docker-compose.prod.yml logs"
  exit 1
fi
