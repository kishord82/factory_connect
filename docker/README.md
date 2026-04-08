# FactoryConnect Docker Production Deployment

## Directory Contents

This directory contains complete production Docker configurations for FactoryConnect, a B2B factory ERP-to-global-buyer EDI/Ariba SaaS platform.

### Build Configuration

- **Dockerfile.api** — Multi-stage build for Express.js API server (Node 22 Alpine)
- **Dockerfile.portal** — Multi-stage build for React Portal UI (Node 22 → Nginx Alpine)
- **.dockerignore** — Files to exclude from Docker context

### Infrastructure & Orchestration

- **docker-compose.prod.yml** — Production service composition (12 services)
  - API Gateway (2 replicas for HA)
  - Portal UI (React 19 + Vite 6)
  - PostgreSQL 16 (main database with RLS)
  - Redis 7 (cache + BullMQ queue)
  - Keycloak 24 (authentication + MFA)
  - Vault 1.17 (secrets + FLE Transit)
  - MinIO (S3-compatible file storage)
  - OpenAS2 (EDI/AS2 transport sidecar)
  - Caddy 2 (reverse proxy + auto-SSL)
  - Prometheus (metrics collection)
  - Grafana (metrics visualization)

### Reverse Proxy & Web Server

- **Caddyfile** — Caddy reverse proxy configuration
  - Route `/api/*` → API (load-balanced)
  - Route `/ws/*` → WebSocket tunnel
  - Route `/*` → Portal SPA
  - Auto-SSL via Let's Encrypt
  - Rate limiting, security headers
  - Health checks on routing

- **nginx.conf** — Nginx global configuration
- **nginx-portal.conf** — Nginx site config for Portal SPA serving

### Configuration & Secrets

- **.env.production.example** — Environment template
  - All required variables documented
  - Copy to `.env.production` and fill with real values
  - Never commit `.env.production` to git

- **vault-config.hcl** — Vault server configuration (file backend)
  - Telemetry enabled
  - UI enabled
  - IPC_LOCK support for Docker

- **prometheus.yml** — Prometheus scrape configuration
  - Scrapes from all services
  - Health checks, retry logic
  - Long-term retention (30 days)

### Operations & Utilities

- **health-check.sh** — Automated health verification script
  - Tests all service endpoints
  - Reports pass/fail for each service
  - Useful for monitoring + CI/CD

### Documentation

**Quick Start:**
- **DEPLOYMENT_SUMMARY.md** — Architecture overview, quick reference, checklists

**Complete Guides:**
- **PRODUCTION_DEPLOYMENT.md** — Full deployment guide (15 sections)
  - Setup, verification, monitoring
  - Troubleshooting, maintenance
  - Backup/recovery procedures
  - Performance tuning

- **BUILD_GUIDE.md** — Image building instructions
  - Multi-stage builds explained
  - Cross-platform builds (Buildx)
  - Registry integration
  - CI/CD examples (GitHub Actions, GitLab)

## Quick Start

```bash
# 1. Prepare environment
cp .env.production.example .env.production
vim .env.production  # Edit with real values

# 2. Build images
docker compose -f docker-compose.prod.yml build

# 3. Start services
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
bash health-check.sh
```

## Architecture

### Service Topology

```
Internet (80, 443)
    ↓
Caddy (Reverse Proxy + Auto-SSL)
    ├─→ API-1 :3000 ─┐
    ├─→ API-2 :3000  ├─→ Shared Infrastructure
    └─→ Portal :3001┘
                     ├─ PostgreSQL 16 (RLS enforced)
                     ├─ Redis 7 (cache + queue)
                     ├─ Keycloak 24 (auth + MFA)
                     ├─ Vault 1.17 (secrets + FLE)
                     ├─ MinIO (S3 files)
                     └─ OpenAS2 (EDI/AS2)

Monitoring:
    ├─ Prometheus (metrics collection)
    └─ Grafana (dashboards)
```

### Services Included

| Service | Port | Purpose |
|---------|------|---------|
| API-1 | 3000 | Express.js server #1 |
| API-2 | 3001 | Express.js server #2 |
| Portal | 3001 | React SPA via Nginx |
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | Cache + BullMQ |
| Keycloak | 8080 | Auth + MFA |
| Vault | 8200 | Secrets + FLE |
| MinIO API | 9000 | S3-compatible |
| MinIO Console | 9001 | S3 management |
| OpenAS2 | 4080/4081 | EDI transport |
| Caddy | 80/443 | Reverse proxy |
| Prometheus | 9090 | Metrics |
| Grafana | 3002 | Dashboard |

## Key Features

### Security
- TLS/SSL with auto-renewal (Let's Encrypt)
- Row-level security (PostgreSQL RLS)
- Field-level encryption (Vault Transit)
- PII redaction in logs
- Network isolation (Docker network)
- Non-root containers

### Reliability
- 2 API replicas with load balancing
- Health checks on all services
- Automatic restart policies
- Resource limits (CPU + memory)
- Graceful shutdown (dumb-init)

### Observability
- Prometheus metrics collection
- Grafana dashboards
- Structured logging (Pino JSON)
- Correlation ID tracking
- Audit logging with hash chain

### Performance
- Multi-stage Docker builds (~200MB API, ~150MB Portal)
- ARM64 optimization (OCI Ampere A1)
- Gzip compression
- HTTP caching headers
- Database connection pooling

## Resource Requirements

**Recommended (Production):**
- CPU: 8 vCPU (OCI Ampere A1 = 2 OCPU = 8 vCPU)
- RAM: 16 GB
- Disk: 100 GB (depends on data volume)

**Minimum (Development):**
- CPU: 4 vCPU
- RAM: 6 GB

## Deployment Checklist

### Preparation
- [ ] Copy `.env.production.example` → `.env.production`
- [ ] Fill all `?error` fields with real values
- [ ] Verify `.env.production` not in git

### Building
- [ ] `docker compose -f docker-compose.prod.yml build`
- [ ] Verify images: `docker images | grep factoryconnect`

### Deployment
- [ ] `docker compose -f docker-compose.prod.yml up -d`
- [ ] Wait 30 seconds for initialization
- [ ] Run health check: `bash health-check.sh`

### Verification
- [ ] All services report healthy
- [ ] Test endpoints manually
- [ ] Configure DNS for domain
- [ ] Verify HTTPS certificate generation

### Post-Deployment
- [ ] Run database migrations
- [ ] Configure Keycloak
- [ ] Initialize Vault
- [ ] Create MinIO buckets
- [ ] Setup Grafana dashboards

## Common Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Health check
bash health-check.sh

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart a service
docker compose -f docker-compose.prod.yml restart api-1

# Database shell
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U fc_app -d factoryconnect

# Redis CLI
docker compose -f docker-compose.prod.yml exec redis redis-cli
```

## Monitoring

### Accessing Monitoring Services

| Service | URL |
|---------|-----|
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3002 |
| Keycloak | http://localhost:8080 |
| Vault | http://localhost:8200 |
| MinIO Console | http://localhost:9001 |

### Health Endpoints

All services expose health checks:
- API: http://localhost:3000/health
- Portal: http://localhost:3001/health
- Prometheus: http://localhost:9090/-/healthy
- Keycloak: http://localhost:8080/health/ready
- Vault: http://localhost:8200/v1/sys/health

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs <service>

# Verify environment
cat .env.production | grep -v "^#"

# Check disk space
df -h
```

### High memory usage
```bash
# Monitor resources
docker stats

# Increase limits in docker-compose.prod.yml
# Restart: docker compose restart
```

### Database connection errors
```bash
# Test PostgreSQL connectivity
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check logs
docker compose -f docker-compose.prod.yml logs postgres
```

## Documentation

### In This Directory
- **DEPLOYMENT_SUMMARY.md** — Quick reference + architecture
- **PRODUCTION_DEPLOYMENT.md** — Complete deployment guide
- **BUILD_GUIDE.md** — Building instructions + CI/CD

### In Main Repository
- **docs/FC_Architecture_Blueprint.md** — Tech stack, patterns
- **docs/FC_Architecture_Decisions_History.md** — Implementation samples
- **docs/FC_SalesOrder_Connector_Design.md** — Phase 1 design
- **docs/FC_Development_Plan.md** — Task breakdown

## Support

1. Check DEPLOYMENT_SUMMARY.md for quick answers
2. Review PRODUCTION_DEPLOYMENT.md for detailed guidance
3. Consult logs: `docker compose logs -f <service>`
4. Verify health: `bash health-check.sh`
5. Check Prometheus: http://localhost:9090
6. Review Grafana: http://localhost:3002

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

## Status

✓ **Ready for Production Deployment**
✓ **Tested on OCI Ampere A1 (ARM64)**
✓ **Complete Documentation Included**

---

**Last Updated:** 2025-04-08  
**Estimated Deployment Time:** 15-30 minutes  
**Target Environment:** OCI Ampere A1 Compute (2 OCPU, 16GB RAM)
