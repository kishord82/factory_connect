# FactoryConnect — OCI Free Tier Deployment Guide

**Target:** Oracle Cloud Infrastructure Free Tier — Ampere A1 (4 OCPU, 24 GB RAM, ARM64)
**Stack:** PostgreSQL 16 · Redis 7 · Node.js API · React Portal · Caddy reverse proxy
**Purpose:** Live demo environment for CA firm testing

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Provision OCI Instance](#2-provision-oci-instance)
3. [Configure OCI Security Rules](#3-configure-oci-security-rules)
4. [SSH into the Instance and Run Setup](#4-ssh-into-the-instance-and-run-setup)
5. [Clone the Repository](#5-clone-the-repository)
6. [Configure Environment](#6-configure-environment)
7. [First-Run Deployment](#7-first-run-deployment)
8. [Configure DNS and SSL](#8-configure-dns-and-ssl)
9. [Verify Deployment](#9-verify-deployment)
10. [Operations: Update, Rollback, Backup](#10-operations-update-rollback-backup)
11. [Makefile Shortcuts (from dev machine)](#11-makefile-shortcuts-from-dev-machine)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

On your **local machine**:
- OCI account with Free Tier access
- OCI CLI installed (`brew install oci-cli`) — optional but useful
- SSH key pair for instance access

Verify your OCI account allows Always Free resources:
- 4 x Ampere A1 OCPUs (ARM64) — free
- 24 GB RAM — free
- 200 GB block storage — free
- 1 public IP — free

---

## 2. Provision OCI Instance

### Option A — OCI Console (recommended for first time)

1. Log into [cloud.oracle.com](https://cloud.oracle.com)
2. Navigate to **Compute → Instances → Create Instance**
3. Configure:

| Field | Value |
|-------|-------|
| Name | `factoryconnect-demo` |
| Image | **Oracle Linux 9** |
| Shape | **VM.Standard.A1.Flex** (Ampere) |
| OCPUs | **4** |
| Memory | **24 GB** |
| Boot volume | **100 GB** |
| SSH keys | Upload your public key (`~/.ssh/id_rsa.pub`) |

4. Note the **Public IP address** after creation.

### Option B — OCI CLI

```bash
# List available shapes in your region
oci compute shape list --compartment-id <COMPARTMENT_ID> | grep A1

# Create instance
oci compute instance launch \
  --compartment-id <COMPARTMENT_ID> \
  --availability-domain <AD_NAME> \
  --shape VM.Standard.A1.Flex \
  --shape-config '{"ocpus": 4, "memoryInGBs": 24}' \
  --image-id <ORACLE_LINUX_9_ARM64_IMAGE_ID> \
  --subnet-id <SUBNET_ID> \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub \
  --display-name factoryconnect-demo \
  --boot-volume-size-in-gbs 100
```

---

## 3. Configure OCI Security Rules

The default OCI security list **blocks all ingress traffic**. You must open ports 80 and 443.

1. OCI Console → **Networking → Virtual Cloud Networks**
2. Click your VCN → **Security Lists** → **Default Security List**
3. Click **Add Ingress Rules** and add two rules:

| Source CIDR | Protocol | Dest Port | Description |
|-------------|----------|-----------|-------------|
| `0.0.0.0/0` | TCP | `80` | HTTP |
| `0.0.0.0/0` | TCP | `443` | HTTPS |

> **Note:** Without these rules, Caddy cannot reach Let's Encrypt and your browser cannot reach the app — even if the instance firewall is open.

---

## 4. SSH into the Instance and Run Setup

```bash
# SSH as opc (Oracle Linux default user)
ssh -i ~/.ssh/id_rsa opc@<INSTANCE_PUBLIC_IP>

# Download and run the setup script
# (installs Docker, Docker Compose, Node.js 22, creates deploy user, tunes kernel)
curl -fsSL https://raw.githubusercontent.com/<YOUR_ORG>/factory_connect/main/scripts/oci/setup-instance.sh \
  -o setup-instance.sh

sudo bash setup-instance.sh
```

The script:
- Updates system packages
- Creates 4 GB swap
- Installs Docker CE + Compose plugin
- Installs Node.js 22 LTS
- Creates a `deploy` user in the `docker` group
- Opens firewall ports 80, 443, 3000, 5173
- Applies kernel tuning for PostgreSQL + Redis

After it completes, **switch to the deploy user** for all further steps:

```bash
sudo su - deploy
```

---

## 5. Clone the Repository

```bash
cd /opt/factoryconnect

# Clone via HTTPS (use a deploy token or PAT for private repos)
git clone https://<TOKEN>@github.com/<YOUR_ORG>/factory_connect.git .

# Or if you've set up SSH keys for the deploy user:
git clone git@github.com:<YOUR_ORG>/factory_connect.git .
```

---

## 6. Configure Environment

```bash
cd /opt/factoryconnect/scripts/oci

# Copy the template
cp .env.production.template .env.production

# Edit and replace ALL CHANGE_ME values with real passwords
nano .env.production
```

### Critical values to set

| Variable | What to put |
|----------|-------------|
| `DOMAIN` | Your OCI public IP (`X.X.X.X`) or a real hostname (`demo.factoryconnect.in`) |
| `POSTGRES_PASSWORD` | Strong random password, e.g. `openssl rand -hex 32` |
| `DATABASE_URL` | `postgresql://fc_app:<POSTGRES_PASSWORD>@postgres:5432/factoryconnect` |
| `REDIS_PASSWORD` | Strong random password |
| `KEYCLOAK_ADMIN_PASSWORD` | Strong random password |
| `KEYCLOAK_CLIENT_SECRET` | Fill in after step 7 (Keycloak setup) |
| `VAULT_DEV_ROOT_TOKEN_ID` | Any strong token, e.g. `openssl rand -hex 20` |
| `VAULT_TOKEN` | Same value as `VAULT_DEV_ROOT_TOKEN_ID` |
| `MINIO_ROOT_PASSWORD` | Strong random password |
| `MINIO_SECRET_KEY` | Same value as `MINIO_ROOT_PASSWORD` |
| `ACME_EMAIL` | Your email (used by Let's Encrypt) |

### Generate all passwords at once

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)"
echo "REDIS_PASSWORD=$(openssl rand -hex 32)"
echo "KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -hex 16)"
echo "VAULT_DEV_ROOT_TOKEN_ID=$(openssl rand -hex 20)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)"
```

---

## 7. First-Run Deployment

```bash
cd /opt/factoryconnect/scripts/oci

# One command does everything:
#   - builds Docker images (API + Portal)
#   - starts PostgreSQL, Redis, Vault, MinIO
#   - runs all database migrations
#   - loads demo/seed data
#   - starts Keycloak, API, Portal, Caddy
#   - runs health checks
bash deploy.sh first-run
```

Expected duration: **5–15 minutes** (image builds take the most time on the first run).

### What `first-run` does step by step

```
1. Validate .env.production (fails if CHANGE_ME remains)
2. Build API image    (node:22-alpine, multi-stage, ~300 MB)
3. Build Portal image (vite build → nginx:1.27-alpine, ~50 MB)
4. Start: postgres, redis, vault, minio
5. Wait for postgres healthcheck (pg_isready)
6. Run migrations (packages/database/migrations/001–008)
7. Load seed data (packages/database/seed/test-data.sql)
8. Start: keycloak
9. Start: api, portal
10. Start: caddy (reverse proxy, auto-SSL if domain configured)
11. Run health-check.sh
```

---

## 8. Configure DNS and SSL

### Using a real domain (recommended for demos)

1. In your DNS provider, create an **A record**:
   ```
   demo.factoryconnect.in  →  <OCI_PUBLIC_IP>  (TTL: 300)
   ```

2. Update `.env.production`:
   ```
   DOMAIN=demo.factoryconnect.in
   ACME_EMAIL=kishor@factoryconnect.in
   ```

3. Reload Caddy to pick up the new domain:
   ```bash
   docker compose -f docker-compose.oci.yml --env-file .env.production \
     exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

   Caddy will automatically obtain a Let's Encrypt certificate. Check logs:
   ```bash
   docker logs fc-caddy --tail 50
   ```

### IP-only access (no domain needed)

Caddy serves plain HTTP when `DOMAIN` is an IP address. No certificate needed.
Access the app at `http://<OCI_PUBLIC_IP>/`.

---

## 9. Verify Deployment

```bash
# Run the full health check
bash /opt/factoryconnect/scripts/oci/health-check.sh
```

Expected output (all green):
```
═══════════════════════════════════════════════════════════════
  FactoryConnect — Health Check
═══════════════════════════════════════════════════════════════

Docker Containers:
  ✓ postgres: running (healthy)
  ✓ redis: running (healthy)
  ✓ vault: running (healthy)
  ✓ minio: running (healthy)
  ✓ keycloak: running (healthy)
  ✓ api: running (healthy)
  ✓ portal: running (no healthcheck)
  ✓ caddy: running (no healthcheck)

PostgreSQL:
  ✓ Connection OK
  ✓ All 7 schemas present
  ✓ Seed data: 3 factories

Redis:
  ✓ PING → PONG

API:
  ✓ /healthz responds: {"status":"ok","timestamp":"..."}

Portal:
  ✓ Serves index.html

Caddy (Reverse Proxy):
  ✓ HTTP port 80: 200
  ✓ Caddy /healthz: 200

All checks passed: 14 passed, 0 warnings
```

### Manual spot checks

```bash
# API liveness
curl http://<IP>/api/health

# API readiness (checks DB connection)
curl http://<IP>/api/ready

# Portal loads
curl -I http://<IP>/

# Check all container statuses
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

---

## 10. Operations: Update, Rollback, Backup

### Deploy an update

```bash
cd /opt/factoryconnect/scripts/oci
bash deploy.sh update
```

The update script:
1. Saves current image IDs (for rollback)
2. Takes a database backup
3. Pulls latest code (`git pull`)
4. Rebuilds API and Portal images
5. Runs any new migrations
6. Rolling-restarts API then Portal
7. Reloads Caddy config
8. Runs health checks

### Roll back to previous version

```bash
bash deploy.sh rollback
```

> Rollback only works after at least one `update` has been run (it uses saved image IDs).

### Manual database backup

```bash
bash /opt/factoryconnect/scripts/oci/backup.sh
# Backups saved to: /opt/factoryconnect/backups/
```

### Set up automatic daily backups

```bash
# Add to deploy user's crontab
crontab -e

# Add this line (runs backup at 02:00 UTC daily)
0 2 * * * /opt/factoryconnect/scripts/oci/backup.sh >> /var/log/factoryconnect/backup.log 2>&1
```

### View logs

```bash
# All services
docker compose -f /opt/factoryconnect/scripts/oci/docker-compose.oci.yml logs -f --tail=100

# Specific service
docker logs fc-api -f --tail=100
docker logs fc-portal -f --tail=100
docker logs fc-caddy -f --tail=100
docker logs fc-postgres -f --tail=100
```

---

## 11. Makefile Shortcuts (from dev machine)

Set `OCI_HOST` in your shell to enable these:

```bash
export OCI_HOST=opc@<OCI_PUBLIC_IP>
export OCI_KEY=~/.ssh/id_rsa

# From your local machine:
make oci-setup      # Run setup-instance.sh on the server
make oci-deploy     # Run deploy.sh first-run
make oci-update     # Run deploy.sh update
make oci-rollback   # Run deploy.sh rollback
make oci-backup     # Run backup.sh
make oci-health     # Run health-check.sh
make oci-logs       # Tail all service logs
make oci-build-api  # Build API image only (no restart)
make oci-build-portal # Build Portal image only (no restart)
```

---

## 12. Troubleshooting

### Container won't start

```bash
# Check container logs
docker logs fc-<service> --tail=100

# Check docker-compose config is valid
docker compose -f scripts/oci/docker-compose.oci.yml --env-file scripts/oci/.env.production config
```

### PostgreSQL won't connect

```bash
# Verify postgres is healthy
docker inspect fc-postgres --format='{{.State.Health.Status}}'

# Connect manually
docker exec -it fc-postgres psql -U fc_app -d factoryconnect

# Check schemas exist
docker exec fc-postgres psql -U fc_app -d factoryconnect \
  -c "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;"
```

### Migrations failed

```bash
# Check which migrations were applied
docker exec fc-postgres psql -U fc_app -d factoryconnect \
  -c "SELECT version, applied_at FROM public.schema_migrations ORDER BY applied_at;"

# Re-run migrations manually (idempotent — safe to re-run)
bash /opt/factoryconnect/scripts/oci/run-migrations.sh
```

### Caddy not getting SSL cert

```bash
# Check Caddy logs for ACME errors
docker logs fc-caddy --tail=100 | grep -i acme

# Common causes:
# 1. DOMAIN env var is an IP (Caddy won't try ACME for IPs — expected behavior)
# 2. Port 80/443 not open in OCI Security List (see step 3)
# 3. DNS A record not propagated yet (wait 5 min, check with: dig <DOMAIN>)
```

### API health check failing

```bash
# Direct check inside container
docker exec fc-api wget -qO- http://localhost:3000/healthz

# Check environment variables loaded
docker exec fc-api env | grep -E "DATABASE_URL|REDIS_HOST|NODE_ENV"

# Check API started correctly
docker logs fc-api --tail=50
```

### Out of disk space

```bash
# Check disk
df -h /

# Clean up unused Docker images/containers
docker system prune -f

# List large log files
du -sh /var/log/factoryconnect/* /var/lib/docker/containers/*/
```

### Keycloak not ready

Keycloak takes 60–90 seconds to initialize against PostgreSQL.

```bash
# Watch keycloak startup
docker logs fc-keycloak -f --tail=50

# Keycloak admin console (after it's up):
# http://<DOMAIN>/auth/  → admin / <KEYCLOAK_ADMIN_PASSWORD>
```

After Keycloak is up, create the `factoryconnect` realm and `fc-api` client, then copy the client secret into `.env.production` as `KEYCLOAK_CLIENT_SECRET` and run `bash deploy.sh update`.

---

## Architecture Overview

```
Internet
    │
    ▼
┌──────────┐  :80/:443
│  Caddy   │  ← auto-SSL (Let's Encrypt)
└────┬─────┘
     │
     ├── /api/*    → fc-api:3000      (Node.js / Express)
     ├── /auth/*   → fc-keycloak:8080 (Keycloak)
     ├── /minio/*  → fc-minio:9001    (MinIO console)
     ├── /healthz  → static "ok"
     └── /*        → fc-portal:3001   (React SPA via nginx)

Internal network (fc-internal):
  fc-api   → fc-postgres:5432
  fc-api   → fc-redis:6379
  fc-api   → fc-vault:8200
  fc-api   → fc-minio:9000
  fc-api   → fc-keycloak:8080
```

## File Reference

| File | Purpose |
|------|---------|
| `scripts/oci/setup-instance.sh` | One-time server setup (Docker, Node.js, kernel tuning) |
| `scripts/oci/deploy.sh` | `first-run` / `update` / `rollback` |
| `scripts/oci/run-migrations.sh` | Idempotent migration runner |
| `scripts/oci/health-check.sh` | Full service verification |
| `scripts/oci/backup.sh` | PostgreSQL backup to local + optional MinIO |
| `scripts/oci/docker-compose.oci.yml` | Production service definitions (ARM64, resource limits) |
| `scripts/oci/Caddyfile.prod` | Reverse proxy + auto-SSL config |
| `scripts/oci/.env.production.template` | Environment variable template |
| `docker/Dockerfile.api` | Multi-stage API image (node:22-alpine) |
| `docker/Dockerfile.portal` | Multi-stage Portal image (vite → nginx:1.27-alpine) |
| `packages/database/migrations/` | SQL migration files (001–008) |
| `packages/database/seed/test-data.sql` | Demo seed data |
