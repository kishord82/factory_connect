#!/usr/bin/env bash
# FactoryConnect — Development Setup & Test Runner
# Run on Mac with Docker Desktop running
# Usage: bash scripts/dev-setup.sh [step]
#   bash scripts/dev-setup.sh          # Run all steps
#   bash scripts/dev-setup.sh docker   # Just start Docker
#   bash scripts/dev-setup.sh migrate  # Just run migrations
#   bash scripts/dev-setup.sh seed     # Just seed data
#   bash scripts/dev-setup.sh test     # Just run tests
#   bash scripts/dev-setup.sh api      # Just start API
#   bash scripts/dev-setup.sh verify   # Run full verification

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERR]${NC} $1"; }
header() { echo -e "\n${BLUE}═══════════════════════════════════════${NC}"; echo -e "${BLUE} $1${NC}"; echo -e "${BLUE}═══════════════════════════════════════${NC}\n"; }

STEP="${1:-all}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ─── Step 1: Prerequisites ───────────────────────────────────────
check_prereqs() {
    header "Checking Prerequisites"

    command -v node >/dev/null 2>&1 || { err "Node.js not found. Install Node 22 LTS."; exit 1; }
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    [ "$NODE_VER" -ge 22 ] || { err "Node.js 22+ required, got $(node -v)"; exit 1; }
    ok "Node.js $(node -v)"

    command -v pnpm >/dev/null 2>&1 || { err "pnpm not found. Install: curl -fsSL https://get.pnpm.io/install.sh | sh -"; exit 1; }
    ok "pnpm $(pnpm -v)"

    command -v docker >/dev/null 2>&1 || { err "Docker not found. Install Docker Desktop."; exit 1; }
    docker info >/dev/null 2>&1 || { err "Docker not running. Start Docker Desktop first."; exit 1; }
    ok "Docker $(docker --version | awk '{print $3}')"

    [ -f .env ] || { warn ".env not found. Copying .env.example"; cp .env.example .env; }
    ok "Environment file exists"
}

# ─── Step 2: Install Dependencies ────────────────────────────────
install_deps() {
    header "Installing Dependencies"
    pnpm install
    ok "Dependencies installed"
}

# ─── Step 3: Start Docker Services ──────────────────────────────
start_docker() {
    header "Starting Docker Services"
    docker compose -f docker/docker-compose.yml up -d postgres redis vault minio

    info "Waiting for PostgreSQL to be ready..."
    for i in $(seq 1 30); do
        if docker exec fc-postgres pg_isready -U fc_app -d factoryconnect >/dev/null 2>&1; then
            ok "PostgreSQL ready"
            break
        fi
        [ "$i" -eq 30 ] && { err "PostgreSQL failed to start"; exit 1; }
        sleep 1
    done

    info "Waiting for Redis to be ready..."
    for i in $(seq 1 15); do
        if docker exec fc-redis redis-cli ping 2>/dev/null | grep -q PONG; then
            ok "Redis ready"
            break
        fi
        [ "$i" -eq 15 ] && { err "Redis failed to start"; exit 1; }
        sleep 1
    done

    ok "All Docker services running"
    docker compose -f docker/docker-compose.yml ps
}

# ─── Step 4: Run Migrations ─────────────────────────────────────
run_migrations() {
    header "Running Database Migrations"

    # Check if dbmate is available
    if ! command -v dbmate >/dev/null 2>&1; then
        info "Installing dbmate..."
        if [[ "$(uname)" == "Darwin" ]]; then
            brew install dbmate 2>/dev/null || {
                curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/latest/download/dbmate-darwin-arm64
                chmod +x /usr/local/bin/dbmate
            }
        else
            curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-arm64
            chmod +x /usr/local/bin/dbmate
        fi
    fi
    ok "dbmate available"

    export DATABASE_URL="postgres://fc_app:fc_password@localhost:5432/factoryconnect?sslmode=disable"
    cd packages/database
    dbmate up
    ok "Migrations complete"
    cd "$ROOT"
}

# ─── Step 5: Seed Data ──────────────────────────────────────────
seed_data() {
    header "Seeding Test Data"

    docker exec -i fc-postgres psql -U fc_app -d factoryconnect < packages/database/seed/test-data.sql
    ok "Test data seeded"

    # Verify
    info "Verifying seed data..."
    docker exec fc-postgres psql -U fc_app -d factoryconnect -c "
        SELECT 'core.factories' as tbl, count(*) FROM core.factories
        UNION ALL SELECT 'core.buyers', count(*) FROM core.buyers
        UNION ALL SELECT 'core.connections', count(*) FROM core.connections
        UNION ALL SELECT 'orders.canonical_orders', count(*) FROM orders.canonical_orders
        UNION ALL SELECT 'workflow.order_sagas', count(*) FROM workflow.order_sagas
        UNION ALL SELECT 'ai.mapping_configs', count(*) FROM ai.mapping_configs
        ORDER BY 1;
    "
    ok "Seed data verified"
}

# ─── Step 6: Build Packages ─────────────────────────────────────
build_packages() {
    header "Building TypeScript Packages"

    info "Building packages/shared..."
    npx tsc --project packages/shared/tsconfig.json
    ok "packages/shared built"

    info "Building packages/database..."
    npx tsc --project packages/database/tsconfig.json
    ok "packages/database built"

    info "Type-checking apps/api..."
    npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 | grep "error TS" | grep -v TS6059 | head -5
    API_ERRORS=$(npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 | grep "error TS" | grep -v TS6059 | wc -l)
    if [ "$API_ERRORS" -eq 0 ]; then
        ok "apps/api: 0 TypeScript errors"
    else
        warn "apps/api: $API_ERRORS TypeScript errors"
    fi

    info "Type-checking apps/bridge..."
    BRIDGE_ERRORS=$(npx tsc --noEmit --project apps/bridge/tsconfig.json 2>&1 | grep "error TS" | grep -v TS6059 | wc -l)
    if [ "$BRIDGE_ERRORS" -eq 0 ]; then
        ok "apps/bridge: 0 TypeScript errors"
    else
        warn "apps/bridge: $BRIDGE_ERRORS TypeScript errors"
    fi

    info "Type-checking apps/portal..."
    PORTAL_ERRORS=$(npx tsc --noEmit --project apps/portal/tsconfig.json 2>&1 | grep "error TS" | grep -v TS6059 | wc -l)
    if [ "$PORTAL_ERRORS" -eq 0 ]; then
        ok "apps/portal: 0 TypeScript errors"
    else
        warn "apps/portal: $PORTAL_ERRORS TypeScript errors"
    fi
}

# ─── Step 7: Run Tests ──────────────────────────────────────────
run_tests() {
    header "Running Unit Tests"

    info "Testing packages/shared..."
    cd packages/shared && npx vitest run --reporter=verbose 2>&1 || warn "Some shared tests failed"
    cd "$ROOT"

    info "Testing apps/api..."
    cd apps/api && npx vitest run --reporter=verbose 2>&1 || warn "Some API tests failed"
    cd "$ROOT"

    info "Testing apps/bridge..."
    cd apps/bridge && npx vitest run --reporter=verbose 2>&1 || warn "Some bridge tests failed"
    cd "$ROOT"

    info "Testing apps/portal..."
    cd apps/portal && npx vitest run --reporter=verbose 2>&1 || warn "Some portal tests failed"
    cd "$ROOT"

    ok "All test suites completed"
}

# ─── Step 8: Start API ──────────────────────────────────────────
start_api() {
    header "Starting API Server"
    info "Starting api-gateway on port 3000..."
    cd apps/api && npx tsx src/index.ts &
    API_PID=$!
    sleep 3

    if curl -sf http://localhost:3000/healthz >/dev/null 2>&1; then
        ok "API running at http://localhost:3000"
    else
        warn "API may still be starting..."
    fi

    cd "$ROOT"
}

# ─── Step 9: API Smoke Test ─────────────────────────────────────
smoke_test() {
    header "Running API Smoke Tests"

    BASE="http://localhost:3000"

    info "Testing health endpoints..."
    curl -sf "$BASE/healthz" && ok "GET /healthz" || err "GET /healthz failed"
    curl -sf "$BASE/readyz" && ok "GET /readyz" || err "GET /readyz failed"

    info "Testing factory endpoints..."
    curl -sf "$BASE/api/factories" -H "Content-Type: application/json" && ok "GET /api/factories" || warn "GET /api/factories (may need auth)"

    info "Testing order endpoints..."
    curl -sf "$BASE/api/orders" -H "Content-Type: application/json" && ok "GET /api/orders" || warn "GET /api/orders (may need auth)"

    ok "Smoke tests completed"
}

# ─── Step 10: Full Verification ─────────────────────────────────
full_verify() {
    header "Full Verification Report"

    echo ""
    echo "┌─────────────────────────────────────────────┐"
    echo "│          FactoryConnect Build Status         │"
    echo "├─────────────────────┬───────────────────────┤"

    # TypeScript
    SHARED_ERR=$(npx tsc --noEmit --project packages/shared/tsconfig.json 2>&1 | grep "error TS" | wc -l)
    DB_ERR=$(npx tsc --noEmit --project packages/database/tsconfig.json 2>&1 | grep "error TS" | wc -l)
    API_ERR=$(npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 | grep "error TS" | grep -v TS6059 | wc -l)
    BRIDGE_ERR=$(npx tsc --noEmit --project apps/bridge/tsconfig.json 2>&1 | grep "error TS" | grep -v TS6059 | wc -l)
    PORTAL_ERR=$(npx tsc --noEmit --project apps/portal/tsconfig.json 2>&1 | grep "error TS" | grep -v TS6059 | wc -l)

    printf "│ %-19s │ %21s │\n" "packages/shared" "$([ $SHARED_ERR -eq 0 ] && echo '✅ 0 errors' || echo "❌ $SHARED_ERR errors")"
    printf "│ %-19s │ %21s │\n" "packages/database" "$([ $DB_ERR -eq 0 ] && echo '✅ 0 errors' || echo "❌ $DB_ERR errors")"
    printf "│ %-19s │ %21s │\n" "apps/api" "$([ $API_ERR -eq 0 ] && echo '✅ 0 errors' || echo "❌ $API_ERR errors")"
    printf "│ %-19s │ %21s │\n" "apps/bridge" "$([ $BRIDGE_ERR -eq 0 ] && echo '✅ 0 errors' || echo "❌ $BRIDGE_ERR errors")"
    printf "│ %-19s │ %21s │\n" "apps/portal" "$([ $PORTAL_ERR -eq 0 ] && echo '✅ 0 errors' || echo "❌ $PORTAL_ERR errors")"
    echo "└─────────────────────┴───────────────────────┘"

    TOTAL=$((SHARED_ERR + DB_ERR + API_ERR + BRIDGE_ERR + PORTAL_ERR))
    echo ""
    if [ "$TOTAL" -eq 0 ]; then
        ok "All packages compile clean! Total errors: 0"
    else
        warn "Total TypeScript errors: $TOTAL"
    fi

    # File counts
    echo ""
    info "Source file counts:"
    echo "  - packages/shared: $(find packages/shared/src -name '*.ts' | wc -l | xargs) files"
    echo "  - packages/database: $(find packages/database/src -name '*.ts' | wc -l | xargs) files"
    echo "  - apps/api: $(find apps/api/src -name '*.ts' | wc -l | xargs) files"
    echo "  - apps/bridge: $(find apps/bridge/src -name '*.ts' | wc -l | xargs) files"
    echo "  - apps/portal: $(find apps/portal/src -name '*.tsx' -o -name '*.ts' | wc -l | xargs) files"
    echo "  - migrations: $(ls packages/database/migrations/*.sql | wc -l | xargs) SQL files"
}

# ─── Main ─────────────────────────────────────────────────────────
case "$STEP" in
    all)
        check_prereqs
        install_deps
        start_docker
        run_migrations
        seed_data
        build_packages
        run_tests
        full_verify
        ;;
    docker)    check_prereqs; start_docker ;;
    migrate)   run_migrations ;;
    seed)      seed_data ;;
    build)     build_packages ;;
    test)      run_tests ;;
    api)       start_api ;;
    smoke)     smoke_test ;;
    verify)    full_verify ;;
    *)
        echo "Usage: bash scripts/dev-setup.sh [all|docker|migrate|seed|build|test|api|smoke|verify]"
        exit 1
        ;;
esac

echo ""
ok "Done! 🏭"
