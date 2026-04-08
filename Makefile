# FactoryConnect — Development Commands
# Usage: make <target>

.PHONY: install dev dev-api dev-portal dev-bridge build test test-api test-portal test-bridge test-database test-shared lint fmt fmt-check typecheck clean docker-up docker-down db-migrate db-rollback db-reset oci-setup oci-deploy oci-update oci-rollback oci-backup oci-health oci-logs oci-build-api oci-build-portal

# ─── Setup ───────────────────────────────────────────────────────
install:
	pnpm install

# ─── Development ─────────────────────────────────────────────────
dev:
	pnpm run dev

dev-api:
	pnpm run dev:api

dev-portal:
	pnpm run dev:portal

dev-bridge:
	pnpm run dev:bridge

# ─── Build ───────────────────────────────────────────────────────
build:
	pnpm run build

# ─── Testing ─────────────────────────────────────────────────────
test:
	pnpm run test

test-api:
	pnpm run test:api

test-portal:
	pnpm run test:portal

test-bridge:
	pnpm run test:bridge

test-database:
	pnpm run test:database

test-shared:
	pnpm run test:shared

# ─── Code Quality ────────────────────────────────────────────────
lint:
	pnpm run lint

fmt:
	pnpm run fmt

fmt-check:
	pnpm run fmt:check

typecheck:
	pnpm run typecheck

# ─── Docker ──────────────────────────────────────────────────────
docker-up:
	docker compose -f docker/docker-compose.yml up -d

docker-down:
	docker compose -f docker/docker-compose.yml down

docker-ps:
	docker compose -f docker/docker-compose.yml ps

docker-logs:
	docker compose -f docker/docker-compose.yml logs -f

# ─── Database ────────────────────────────────────────────────────
db-migrate:
	cd packages/database && npx dbmate up

db-rollback:
	cd packages/database && npx dbmate rollback

db-reset:
	cd packages/database && npx dbmate drop && npx dbmate up

db-new:
	cd packages/database && npx dbmate new $(name)

# ─── Cleanup ─────────────────────────────────────────────────────
clean:
	pnpm run clean
	rm -rf node_modules

# ─── OCI Deployment ─────────────────────────────────────────────
oci-setup:
	@echo "Run on OCI instance: sudo bash scripts/oci/setup-instance.sh"

oci-deploy:
	bash scripts/oci/deploy.sh first-run

oci-update:
	bash scripts/oci/deploy.sh update

oci-rollback:
	bash scripts/oci/deploy.sh rollback

oci-backup:
	bash scripts/oci/backup.sh

oci-health:
	bash scripts/oci/health-check.sh

oci-logs:
	docker compose -f scripts/oci/docker-compose.oci.yml --env-file scripts/oci/.env.production logs -f

oci-build-api:
	docker build -f docker/Dockerfile.api -t fc-api:test .

oci-build-portal:
	docker build -f docker/Dockerfile.portal -t fc-portal:test .
