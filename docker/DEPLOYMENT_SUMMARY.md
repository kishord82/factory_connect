# FactoryConnect — Production Docker Deployment Summary

## Files Created

This deployment package includes all necessary Docker configurations for production deployment on OCI Ampere A1 (ARM64).

### Docker Images & Build Configuration

| File | Purpose |
|------|---------|
| `Dockerfile.api` | Multi-stage API server build (Express.js 5, Node 22) |
| `Dockerfile.portal` | Multi-stage Portal UI build (React 19 + Vite 6, Nginx) |
| `.dockerignore` | Exclude unnecessary files from Docker context |

### Orchestration & Infrastructure

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production service orchestration (PostgreSQL, Redis, Keycloak, Vault, MinIO, OpenAS2, Caddy, Prometheus, Grafana) |
| `Caddyfile` | Reverse proxy configuration (auto-SSL, routing, security headers) |
| `nginx.conf` | Nginx global configuration (gzip, logging, performance) |
| `nginx-portal.conf` | Portal SPA serving configuration (routing, caching, security) |

### Configuration & Secrets

| File | Purpose |
|------|---------|
| `.env.production.example` | Environment template with all required variables (gitignored in production) |
| `vault-config.hcl` | Vault server configuration (file backend, telemetry, UI) |
| `prometheus.yml` | Prometheus scrape configuration (metrics from all services) |

### Documentation & Operations

| File | Purpose |
|------|---------|
| `PRODUCTION_DEPLOYMENT.md` | Complete deployment guide (setup, monitoring, maintenance, DR) |
| `BUILD_GUIDE.md` | Image building instructions (multi-stage, cross-platform, registry, CI/CD) |
| `health-check.sh` | Automated health verification script |
| `DEPLOYMENT_SUMMARY.md` | This file — overview and quick reference |

## Quick Start (5 minutes)

```bash
# 1. Prepare environment
cp docker/.env.production.example docker/.env.production
vim docker/.env.production  # Edit with real credentials

# 2. Build images
docker compose -f docker/docker-compose.prod.yml build

# 3. Start services
docker compose -f docker/docker-compose.prod.yml up -d

# 4. Verify
bash docker/health-check.sh
```

## Architecture

### Services Included

**Core Application:**
- **API Gateway** (2 replicas) — Express.js 5 on Node 22
- **Portal UI** (1 instance) — React 19 + Vite 6 on Nginx

**Data Layer:**
- **PostgreSQL 16** — Main database with RLS + audit
- **Redis 7** — Cache + BullMQ queue backend

**Authentication & Secrets:**
- **Keycloak 24** — Auth + TOTP MFA
- **Vault 1.17** — Secrets + FLE Transit engine

**File Storage & EDI:**
- **MinIO** — S3-compatible object storage (claim checks)
- **OpenAS2** — EDI AS2 transport sidecar

**Networking & Reverse Proxy:**
- **Caddy 2** — Auto-SSL, load balancing, security headers

**Monitoring & Observability:**
- **Prometheus** — Metrics collection & scraping
- **Grafana** — Metrics dashboards & alerts

### Deployment Topology

```
Internet
   │
   ├─ HTTP/HTTPS (ports 80, 443)
   │
   ▼
┌─────────────────────────────┐
│  Caddy Reverse Proxy        │
│  (Auto-SSL + Load Balancing)│
└──────┬──────────────────────┘
       │
       ├─▶ API-1 :3000
       ├─▶ API-2 :3000
       └─▶ Portal :3001 ──▶ Nginx
                          (Static SPA serving)

All services connected to:
├─ PostgreSQL (RLS enforced)
├─ Redis (password protected)
├─ Keycloak (JWT validation)
├─ Vault (Transit engine)
├─ MinIO (S3 files)
└─ OpenAS2 (EDI transport)

Monitoring:
├─ Prometheus (metrics collection)
└─ Grafana (visualization)
```

## Key Features

### Security

✓ **TLS/SSL** — Auto-generated Let's Encrypt certificates via Caddy  
✓ **RLS** — Row-level security enforced on all tenant tables  
✓ **Secrets** — Vault for sensitive data (GSTIN, PAN, bank accounts)  
✓ **PII Redaction** — Automatic redaction in logs  
✓ **Network Isolation** — Private Docker network, only Caddy exposed  
✓ **Authentication** — Keycloak + JWT + MFA (TOTP)  
✓ **Parameterized Queries** — Protection against SQL injection  
✓ **Security Headers** — HSTS, CSP, X-Frame-Options, etc.  

### Reliability

✓ **Multi-replica API** — 2 instances with round-robin load balancing  
✓ **Health Checks** — All services have automated health verification  
✓ **Restart Policies** — `always` for production availability  
✓ **Resource Limits** — CPU + memory constraints per service  
✓ **Health Monitoring** — Prometheus + Grafana for real-time visibility  
✓ **Circuit Breaker** — Built into API (Opossum) for resilience  
✓ **Graceful Shutdown** — dumb-init ensures proper signal handling  

### Performance

✓ **Gzip Compression** — Response compression via Caddy + Nginx  
✓ **Caching** — Redis + HTTP cache headers  
✓ **Lazy Loading** — React code splitting via Vite  
✓ **Database Optimization** — Connection pooling, indexes  
✓ **Asset Optimization** — Nginx long-term caching for hashed files  
✓ **Load Balancing** — Round-robin across 2 API replicas  
✓ **ARM64 Optimization** — Native OCI Ampere A1 support  

### Observability

✓ **Prometheus Metrics** — Scraped from all services  
✓ **Grafana Dashboards** — Pre-built for API, DB, cache, system  
✓ **Structured Logging** — Pino JSON logs with correlation IDs  
✓ **Audit Logs** — Immutable audit trail with hash chain  
✓ **Health Endpoints** — `/health` on all services  
✓ **Request Tracing** — X-Correlation-ID header propagation  

## Resource Requirements

### Minimum (Development-like)

```
Total: 4 CPU + 6GB RAM
- Suitable for testing/staging
```

### Recommended (Production)

```
Total: 8 CPU + 16GB RAM
- OCI Ampere A1 Compute (2 OCPU = 8 vCPU, 16GB RAM)
- Comfortable headroom for traffic spikes
```

### Scaling Beyond

```
- Add PostgreSQL replicas (read-only)
- Add Redis cluster nodes
- Add API replicas (just change compose file)
- Use managed Vault/MinIO/PostgreSQL
```

## Environment Variables

Critical variables that MUST be set in `.env.production`:

```
DATABASE_PASSWORD           # Strong PostgreSQL password
REDIS_PASSWORD              # Strong Redis password
KEYCLOAK_ADMIN_PASSWORD     # Keycloak admin password
KEYCLOAK_CLIENT_SECRET      # JWT client secret
VAULT_DEV_ROOT_TOKEN_ID     # Vault root token
MINIO_ROOT_PASSWORD         # MinIO password
GRAFANA_ADMIN_PASSWORD      # Grafana password
ACME_EMAIL                  # Let's Encrypt contact email
```

See `.env.production.example` for all options.

## Deployment Checklist

- [ ] Clone repository to OCI instance
- [ ] Copy `.env.production.example` → `.env.production`
- [ ] Fill in all `?error` variables
- [ ] Verify environment: `cat docker/.env.production`
- [ ] Build images: `docker compose -f docker/docker-compose.prod.yml build`
- [ ] Start services: `docker compose -f docker/docker-compose.prod.yml up -d`
- [ ] Wait 30 seconds for services to initialize
- [ ] Run health check: `bash docker/health-check.sh`
- [ ] Verify API: `curl http://localhost:3000/health`
- [ ] Verify Portal: `curl http://localhost:3001/health`
- [ ] Access Portal: Open `http://localhost:3001` in browser
- [ ] Configure domain DNS → reverse proxy IP
- [ ] Caddy auto-generates HTTPS certificate
- [ ] Access via HTTPS: `https://factoryconnect.in`

## Post-Deployment

### 1. Run Database Migrations

```bash
cd /path/to/factory_connect
pnpm --filter @fc/database run migrate
```

### 2. Seed Initial Data (if needed)

```bash
docker compose -f docker/docker-compose.prod.yml exec postgres \
  psql -U fc_app -d factoryconnect < scripts/seed.sql
```

### 3. Configure Keycloak

- Navigate to http://localhost:8080
- Create realm, configure JWT client
- Set client secret in `.env.production`

### 4. Initialize Vault

```bash
docker compose -f docker/docker-compose.prod.yml exec vault \
  vault secrets enable transit
```

### 5. Setup MinIO Buckets

```bash
docker compose -f docker/docker-compose.prod.yml exec minio \
  mc mb local/fc-orders
  
docker compose -f docker/docker-compose.prod.yml exec minio \
  mc mb local/fc-invoices
```

## Monitoring Setup

### Access Monitoring Services

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3002 (admin/password)
- **Keycloak:** http://localhost:8080 (admin/password)
- **Vault:** http://localhost:8200 (UI enabled)
- **MinIO Console:** http://localhost:9001 (access key/secret)

### Import Grafana Dashboards

1. Login to Grafana
2. Data Sources → Add Prometheus
   - URL: `http://prometheus:9090`
3. Create Dashboard → Import
   - Search for "Node Exporter" or "Prometheus 2.0 Stats"

## Backup & Recovery

### Daily Backup

```bash
# Database
docker compose -f docker/docker-compose.prod.yml exec postgres \
  pg_dump -U fc_app -d factoryconnect | gzip > /backup/db-$(date +%Y%m%d).sql.gz

# MinIO buckets
docker compose -f docker/docker-compose.prod.yml exec minio \
  mc mirror local/fc-orders /backup/orders-$(date +%Y%m%d)/

# Vault data (if using file backend)
docker exec fc-vault-prod tar czf /vault/data-backup.tar.gz /vault/data
```

### Restore Database

```bash
gunzip < /backup/db-YYYYMMDD.sql.gz | \
  docker compose -f docker/docker-compose.prod.yml exec -T postgres \
  psql -U fc_app -d factoryconnect
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose -f docker/docker-compose.prod.yml logs

# Verify environment
cat docker/.env.production | grep -v "^#"

# Check disk space
df -h

# Restart docker daemon
sudo systemctl restart docker
```

### High memory usage

```bash
# Check which service is consuming memory
docker stats

# Increase container limits in docker-compose.prod.yml
# Or increase host memory

# Restart service
docker compose -f docker/docker-compose.prod.yml restart <service>
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker compose -f docker/docker-compose.prod.yml exec postgres \
  pg_isready -U fc_app

# Check network connectivity
docker compose -f docker/docker-compose.prod.yml exec api-1 \
  ping postgres

# View database logs
docker compose -f docker/docker-compose.prod.yml logs postgres
```

### Certificate not renewing

```bash
# Check Caddy logs
docker compose -f docker/docker-compose.prod.yml logs caddy

# Verify domain DNS resolves
nslookup factoryconnect.in

# Manually renew (if needed)
docker compose -f docker/docker-compose.prod.yml exec caddy \
  caddy reload
```

## Maintenance Commands

### View Logs

```bash
# All services
docker compose -f docker/docker-compose.prod.yml logs -f --tail=100

# Specific service
docker compose -f docker/docker-compose.prod.yml logs -f api-1
```

### Restart Services

```bash
# Graceful restart (recommended)
docker compose -f docker/docker-compose.prod.yml restart api-1

# Hard restart (use only if needed)
docker compose -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.prod.yml up -d
```

### Execute Commands

```bash
# Database shell
docker compose -f docker/docker-compose.prod.yml exec postgres \
  psql -U fc_app -d factoryconnect

# Redis CLI
docker compose -f docker/docker-compose.prod.yml exec redis redis-cli

# API container shell
docker compose -f docker/docker-compose.prod.yml exec api-1 /bin/sh
```

## Documentation References

- **Full Deployment Guide:** See `PRODUCTION_DEPLOYMENT.md`
- **Build Instructions:** See `BUILD_GUIDE.md`
- **Architecture:** See `docs/FC_Architecture_Blueprint.md` (in main repo)
- **Development:** See root `Makefile` for dev commands

## Support & Issues

1. Check logs: `docker compose logs -f <service>`
2. Verify health: `bash docker/health-check.sh`
3. Review Prometheus metrics: `http://localhost:9090`
4. Check Grafana dashboards: `http://localhost:3002`
5. Inspect container: `docker ps` and `docker inspect <container-id>`

## Version Information

| Component | Version |
|-----------|---------|
| Node.js | 22.x |
| PostgreSQL | 16 Alpine |
| Redis | 7 Alpine |
| Keycloak | 24 |
| Vault | 1.17 |
| MinIO | latest |
| OpenAS2 | latest |
| Caddy | 2 Alpine |
| Nginx | 1.27 Alpine |
| Prometheus | latest |
| Grafana | latest |

## Architecture Decision Records (ADRs)

These deployments implement decisions documented in:
- `FC_Architecture_Blueprint.md` — Tech stack selection
- `FC_Architecture_Decisions_History.md` — Implementation patterns

Key decisions reflected:
- **C1:** Transactional outbox for event reliability
- **C2:** Circuit breaker for cross-service resilience
- **C3:** PII redaction in logs (Pino transport)
- **C6:** Vault Transit for field-level encryption
- **C12:** Saga coordinator (15-state lifecycle)
- **C13:** Immutable audit log with hash chain

---

**Status:** Ready for production deployment  
**Last Updated:** 2025-04-08  
**Tested On:** OCI Ampere A1 (ARM64)  
**Estimated Deployment Time:** 15-30 minutes
