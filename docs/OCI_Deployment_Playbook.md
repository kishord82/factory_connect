# FactoryConnect — OCI Free Tier Deployment Playbook

**Last verified:** 2026-04-09  
**Target:** OCI Ampere A1 Free Tier (x86_64, 1 OCPU, 1GB RAM, Oracle Linux 9)  
**IP:** 92.4.94.2

---

## Architecture

```
Internet → :80/:443 → Caddy (reverse proxy + auto-SSL)
                         ├── /api/*     → fc-api:3000  (Node.js Express)
                         ├── /auth/*    → keycloak:8080 (not deployed yet)
                         ├── /minio/*   → minio:9001   (not deployed yet)
                         ├── /healthz   → "ok" (Caddy direct)
                         └── /*         → fc-portal:3001 (Nginx + React)
                                           ↕
                         fc-postgres:5432  (PostgreSQL 16)
                         fc-redis:6379     (Redis 7)
```

All services run on a single Docker bridge network (`fc-internal`). Only Caddy exposes ports 80/443 to the host.

---

## Prerequisites on OCI VM

```bash
# Docker CE + Compose (already installed)
docker --version   # 29.4.0
docker compose version

# SSH key for Cloud Shell access
~/.ssh/fc-key      # private key (chmod 600)
```

---

## Step 1: Clone and Prepare

```bash
ssh -i ~/.ssh/fc-key opc@92.4.94.2
cd ~/fc                          # repo root
cd scripts/oci                   # deployment configs
```

Key files in `scripts/oci/`:
- `docker-compose.local.yml` — 5-service compose (postgres, redis, api, portal, caddy)
- `.env.production` — all env vars (NEVER commit)
- `Caddyfile.prod` — reverse proxy config with HTTP + HTTPS
- `init-db.sql` — creates extensions + keycloak schema
- `server.crt` / `server.key` — self-signed SSL cert for IP

---

## Step 2: Environment Configuration

```bash
cp .env.production.template .env.production
nano .env.production
```

Critical settings:
- `DOMAIN=92.4.94.2` (or real domain)
- `NODE_ENV=development` (enables dev-mode JWT login without Keycloak)
- `DATABASE_URL=postgresql://fc_app:PASSWORD@postgres:5432/factoryconnect`
- All `CHANGE_ME` values replaced with real passwords

---

## Step 3: Start Infrastructure

```bash
cd ~/fc/scripts/oci
docker compose -f docker-compose.local.yml --env-file .env.production up -d
```

Wait for all containers to be healthy:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## Step 4: Database Setup (Critical)

The database requires 3 steps in order:

### 4a. Fresh DB Reset (if needed)
```bash
docker exec fc-postgres psql -U fc_app -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='factoryconnect' AND pid <> pg_backend_pid();"
docker exec fc-postgres psql -U fc_app -d postgres -c "DROP DATABASE IF EXISTS factoryconnect;"
docker exec fc-postgres psql -U fc_app -d postgres -c "CREATE DATABASE factoryconnect OWNER fc_app;"
docker exec fc-postgres psql -U fc_app -d factoryconnect -c \
  "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE SCHEMA IF NOT EXISTS keycloak;"
```

### 4b. Load Base Schema
```bash
# Strip the \restrict dbmate directive on line 1
tail -n +2 ~/fc/db/schema.sql | docker exec -i fc-postgres psql -U fc_app -d factoryconnect
```

This creates 41 tables in the `public` schema. One harmless warning about `transaction_timeout` (PG16 vs PG18 pg_dump).

### 4c. Run Schema Split (UP portion ONLY)

**CRITICAL:** Migration 007 contains both `-- migrate:up` and `-- migrate:down` sections. Running the full file would create schemas then immediately drop them. Use `sed` to extract only the UP portion:

```bash
sed "/^-- migrate:down/,\$d" ~/fc/packages/database/migrations/007_schema_split.sql \
  | docker exec -i fc-postgres psql -U fc_app -d factoryconnect
```

Expected output: 7 CREATE SCHEMA, ~30 ALTER TABLE, some errors for missing compliance/CA tables (expected — those tables aren't in the base schema dump).

Verify schemas exist:
```bash
docker exec fc-postgres psql -U fc_app -d factoryconnect -c "\dn"
```
Expected: ai, audit, compliance, core, keycloak, orders, platform, public, workflow (9 schemas)

### 4d. Set Database Search Path
```bash
docker exec fc-postgres psql -U fc_app -d factoryconnect -c \
  "ALTER DATABASE factoryconnect SET search_path TO core, orders, workflow, compliance, audit, ai, platform, public;"
```

### 4e. Load Seed Data
```bash
echo "SET search_path TO core, orders, workflow, compliance, audit, ai, platform, public;" \
  | cat - ~/fc/packages/database/seed/test-data.sql \
  | docker exec -i fc-postgres psql -U fc_app -d factoryconnect
```

Some errors for compliance tables are expected (13 errors). Verify data:
```bash
docker exec fc-postgres psql -U fc_app -d factoryconnect -c \
  "SET search_path TO core; SELECT count(*) FROM factories;"
# Expected: 3
```

---

## Step 5: Restart API and Verify

```bash
cd ~/fc/scripts/oci
docker compose -f docker-compose.local.yml restart api
sleep 5
```

### Health Check
```bash
curl http://92.4.94.2/healthz
# Expected: ok
```

### Authentication Test (all 3 roles)
```bash
BASE=http://localhost:80

# Platform Admin
curl -s $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@factoryconnect.io","password":"fcadmin123"}'
# Returns: {"access_token":"eyJ...","token_type":"Bearer","expires_in":28800,"role":"fc_admin"}

# Factory Admin
curl -s $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rajeshtextiles.in","password":"factory123"}'
# Returns: role=factory_admin

# CA Admin
curl -s $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ca_admin@demo.in","password":"cademo123"}'
# Returns: role=ca_admin
```

### Data Verification
```bash
TOKEN=$(curl -s $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@factoryconnect.io","password":"fcadmin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s $BASE/api/v1/admin/factories -H "Authorization: Bearer $TOKEN"
# Returns 3 factories: Rajesh Textiles, Sunrise Auto, Gujarat Pharma
```

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | admin@factoryconnect.io | fcadmin123 |
| Factory Admin | admin@rajeshtextiles.in | factory123 |
| CA Admin | ca_admin@demo.in | cademo123 |

---

## Troubleshooting

### API returns FC_ERR_INTERNAL
Check API logs: `docker logs fc-api --tail 50`  
Common cause: missing DB tables or wrong search_path.

### Browser shows HSTS redirect to HTTPS
Chrome caches HSTS. Fix: type `thisisunsafe` on the certificate error page, or clear HSTS in `chrome://net-internals/#hsts`.

### Schema split shows only keycloak + public
The migration file has both UP and DOWN sections. Make sure to use `sed "/^-- migrate:down/,\$d"` to extract only the UP portion.

### Seed data FK violations
The `record_history` trigger uses unqualified table names. Fix: prepend `SET search_path TO core, orders, ...` before the seed file.

---

## Known Limitations

1. **NODE_ENV=development** — Dev-mode JWT without Keycloak. Not for production.
2. **Compliance/CA tables missing** — 14 CA-platform tables not in base schema dump. Need migration 005 for full CA support.
3. **Self-signed SSL** — Browsers show certificate warnings. Use a real domain + Let's Encrypt for production.
4. **1GB RAM constraint** — Keycloak, Vault, and MinIO are not deployed (too heavy for free tier).
