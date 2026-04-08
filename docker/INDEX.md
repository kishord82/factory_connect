# FactoryConnect Docker Deployment — File Index

Complete production Docker deployment package for OCI Ampere A1 (ARM64).

## Quick Navigation

**First Time?** → Start with [README.md](README.md)  
**Ready to Deploy?** → Follow [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)  
**Building Images?** → See [BUILD_GUIDE.md](BUILD_GUIDE.md)  
**Quick Reference?** → Check [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)

---

## File Directory

### Build Configuration (3 files)
| File | Size | Purpose | Key Points |
|------|------|---------|-----------|
| [Dockerfile.api](Dockerfile.api) | 2.0K | Express.js API build | Multi-stage, Node 22 Alpine, dumb-init, health check |
| [Dockerfile.portal](Dockerfile.portal) | 1.7K | React Portal build | Multi-stage, Nginx Alpine, SPA routing, caching |
| [.dockerignore](.dockerignore) | 740B | Build context filter | 30+ patterns excluded (node_modules, tests, docs) |

### Orchestration & Networking (4 files)
| File | Size | Purpose | Key Points |
|------|------|---------|-----------|
| [docker-compose.prod.yml](docker-compose.prod.yml) | 13K | Service orchestration | 12 services, HA setup, resource limits, health checks |
| [Caddyfile](Caddyfile) | 5.5K | Reverse proxy config | Auto-SSL, load balancing, rate limiting, security headers |
| [nginx.conf](nginx.conf) | 964B | Nginx global config | Gzip, logging, performance tuning |
| [nginx-portal.conf](nginx-portal.conf) | 1.4K | Portal SPA serving | SPA routing, caching strategy, security |

### Configuration & Secrets (3 files)
| File | Size | Purpose | Key Points |
|------|------|---------|-----------|
| [.env.production.example](.env.production.example) | 6.9K | Environment template | 70+ variables, all documented, ?error markers |
| [vault-config.hcl](vault-config.hcl) | 1.3K | Vault server config | File backend, telemetry, UI enabled |
| [prometheus.yml](prometheus.yml) | 5.5K | Metrics scraping | 11 targets, health checks, 30-day retention |

### Operations & Utilities (1 file)
| File | Size | Purpose | Key Points |
|------|------|---------|-----------|
| [health-check.sh](health-check.sh) | 2.9K | Health verification | 13 service checks, color output, fail summary |

### Documentation (5 files)
| File | Size | Purpose | Key Points |
|------|------|---------|-----------|
| [README.md](README.md) | 5.9K | Directory overview | Quick start, architecture, services, troubleshooting |
| [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) | 13K | Quick reference | Architecture, checklist, maintenance, backup |
| [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) | 13K | Full deployment guide | 15 sections, HA, DR, monitoring, tuning |
| [BUILD_GUIDE.md](BUILD_GUIDE.md) | 11K | Build instructions | Multi-stage, Buildx, registries, CI/CD samples |
| [INDEX.md](INDEX.md) | This file | Navigation guide | Quick reference, file descriptions |

---

## Services Overview

### Application Tier (2 replicas)
- **API-1** (port 3000) — Express.js 5 on Node 22
- **API-2** (port 3001) — Express.js 5 on Node 22
- **Portal** (port 3001) — React 19 + Vite 6 on Nginx

### Infrastructure Tier
- **PostgreSQL** (port 5432) — Primary DB with RLS
- **Redis** (port 6379) — Cache + BullMQ
- **Keycloak** (port 8080) — Auth + MFA
- **Vault** (port 8200) — Secrets + FLE
- **MinIO** (ports 9000/9001) — S3-compatible storage
- **OpenAS2** (ports 4080/4081) — EDI/AS2 transport

### Edge & Monitoring Tier
- **Caddy** (ports 80/443) — Reverse proxy + auto-SSL
- **Prometheus** (port 9090) — Metrics collection
- **Grafana** (port 3002) — Dashboards + alerts

---

## Deployment Workflow

### 1. Preparation (5 minutes)
```bash
# Copy environment template
cp .env.production.example .env.production

# Edit with real credentials
vim .env.production
# Fill: DATABASE_PASSWORD, REDIS_PASSWORD, KEYCLOAK_*, VAULT_*, MINIO_*, GRAFANA_*, ACME_EMAIL

# Verify all ?error fields are filled
grep "?error" .env.production  # Should return nothing
```

### 2. Build Images (10-15 minutes first time, 2-5 minutes cached)
```bash
docker compose -f docker-compose.prod.yml build
```

### 3. Deploy Services (5 minutes)
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4. Verify Health (1 minute)
```bash
bash health-check.sh
```

### 5. Post-Deployment (10 minutes)
- Configure DNS for domain
- Run database migrations
- Setup Keycloak realm
- Initialize Vault secrets
- Create MinIO buckets

---

## Key Commands Reference

### Deployment
```bash
# Build
docker compose -f docker-compose.prod.yml build

# Start
docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.prod.yml down

# Logs
docker compose -f docker-compose.prod.yml logs -f

# Health check
bash health-check.sh
```

### Service Management
```bash
# Restart service
docker compose -f docker-compose.prod.yml restart api-1

# Scale replicas
docker compose -f docker-compose.prod.yml up -d --scale api=3

# Status
docker compose -f docker-compose.prod.yml ps
```

### Database Operations
```bash
# Connect
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U fc_app -d factoryconnect

# Migrate
pnpm --filter @fc/database run migrate

# Backup
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U fc_app -d factoryconnect | gzip > backup.sql.gz
```

### Cache & Queue
```bash
# Redis CLI
docker compose -f docker-compose.prod.yml exec redis redis-cli

# View queue jobs
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli --raw KEYS "bull:*" | head -20
```

### Monitoring
```bash
# View resources
docker stats

# Container logs (service)
docker compose -f docker-compose.prod.yml logs -f api-1

# System info
docker info
```

---

## Configuration

### Environment Variables

**Critical (must set):**
- `DATABASE_PASSWORD` — PostgreSQL password
- `REDIS_PASSWORD` — Redis password
- `KEYCLOAK_ADMIN_PASSWORD` — Keycloak admin
- `KEYCLOAK_CLIENT_SECRET` — JWT client secret
- `VAULT_DEV_ROOT_TOKEN_ID` — Vault token
- `MINIO_ROOT_PASSWORD` — MinIO password
- `GRAFANA_ADMIN_PASSWORD` — Grafana admin

**Important (domain-based):**
- `ACME_EMAIL` — Let's Encrypt contact
- `GRAFANA_ROOT_URL` — Grafana public URL

**Optional (sensible defaults):**
- Database name, user, port
- Redis port, max memory
- Log level, timeouts
- Feature flags

See [.env.production.example](.env.production.example) for full list.

### Customization

**Scale API replicas:**
Edit docker-compose.prod.yml, add:
```yaml
api-3:
  image: factoryconnect/api:latest
  # ... copy api-1 or api-2 config
```

**Increase resource limits:**
Edit service resource limits in docker-compose.prod.yml:
```yaml
deploy:
  resources:
    limits:
      cpus: '4'    # Increase
      memory: 2G   # Increase
```

**Change Caddy domain:**
Edit Caddyfile, replace `factoryconnect.in` with your domain.

---

## Troubleshooting Quick Reference

| Problem | Check | Fix |
|---------|-------|-----|
| Services won't start | `docker compose logs <service>` | Check .env.production filled correctly |
| Port already in use | `lsof -i :3000` | Change port in docker-compose.prod.yml |
| Out of memory | `docker stats` | Increase limits, reduce max_connections |
| Database connection error | `docker compose exec postgres pg_isready` | Verify DATABASE_PASSWORD in .env |
| No HTTPS certificate | `docker compose logs caddy` | Verify DNS resolves, email valid |
| High CPU usage | `docker top <container>` | Check logs, profile code |
| Slow queries | PostgreSQL logs | Add indexes, analyze EXPLAIN |

See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for detailed troubleshooting.

---

## Architecture Reference

### Network Diagram
```
Internet (80/443)
    ↓
Caddy Reverse Proxy
    ├─ /api/* → API-1:3000 (round-robin)
    ├─ /api/* → API-2:3000 (round-robin)
    ├─ /ws/*  → API-1:3000 (WebSocket)
    └─ /*     → Portal:3001 (SPA)
         ↓
    Private Docker Network (fc-network)
    ├─ PostgreSQL 16 (RLS enforced)
    ├─ Redis 7 (password protected)
    ├─ Keycloak 24 (JWT validation)
    ├─ Vault 1.17 (Transit encryption)
    ├─ MinIO (S3 API)
    └─ OpenAS2 (EDI/AS2)

Monitoring:
├─ Prometheus (metrics scraping)
└─ Grafana (visualization)
```

### Data Flow
```
Client → Caddy (SSL termination) → Load Balancer
                                        ↓
                        ┌───────────────┴───────────────┐
                        ↓                               ↓
                    API-1 :3000                   API-2 :3000
                        ├─ RLS tenant context set
                        ├─ Parameterized queries
                        ├─ Idempotency check
                        └─ Outbox events written
                                ↓
                        PostgreSQL 16
                        ├─ Transactional writes
                        ├─ RLS policies applied
                        ├─ Audit log captured
                        └─ Record history saved
                                ↓
                        Redis 7 (queue/cache)
                        ├─ BullMQ jobs
                        ├─ Session cache
                        └─ Saga state

        Vault (secrets)
        ├─ FLE decryption
        └─ Transit engine
        
        MinIO (files)
        ├─ Large payloads
        └─ Claim check

        OpenAS2 (EDI)
        ├─ Inbound AS2
        └─ Outbound EDI
```

---

## Security Checklist

- [ ] .env.production created and filled (never in git)
- [ ] Database password strong (16+ chars, mixed case/numbers)
- [ ] Redis password set (not default)
- [ ] Keycloak realm configured with client
- [ ] Vault initialized with proper auth
- [ ] MinIO credentials rotated
- [ ] DNS configured for domain
- [ ] SSL certificate auto-generated by Caddy
- [ ] Firewall: only ports 80/443 exposed
- [ ] Database backups scheduled daily
- [ ] Logs monitored for errors
- [ ] Health checks passing

---

## Monitoring Checklist

- [ ] Prometheus running (http://localhost:9090)
- [ ] Grafana dashboards created (http://localhost:3002)
- [ ] Alert rules configured
- [ ] Dashboard auto-refresh enabled
- [ ] Alertmanager integration (optional)
- [ ] Log aggregation (optional)
- [ ] APM integration (optional)

---

## Maintenance Checklist

### Daily
- [ ] Backup PostgreSQL database
- [ ] Backup MinIO buckets
- [ ] Check health: `bash health-check.sh`
- [ ] Review error logs

### Weekly
- [ ] Review Grafana dashboards
- [ ] Check disk usage
- [ ] Test disaster recovery procedures
- [ ] Review audit logs

### Monthly
- [ ] Security updates (patch base images)
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Certificate renewal check
- [ ] Capacity planning

### Quarterly
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Security audit
- [ ] Architecture review

---

## Support Resources

1. **README.md** — Start here for overview
2. **PRODUCTION_DEPLOYMENT.md** — Step-by-step deployment
3. **BUILD_GUIDE.md** — Building and CI/CD
4. **DEPLOYMENT_SUMMARY.md** — Quick reference
5. **docker/Makefile** (when created) — Common tasks
6. **docs/FC_Architecture_Blueprint.md** — Tech stack rationale
7. **docs/FC_Architecture_Decisions_History.md** — Implementation patterns

---

## Version Information

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 22.x | Alpine base |
| PostgreSQL | 16 | Alpine base |
| Redis | 7 | Alpine base |
| Keycloak | 24 | Latest stable |
| Vault | 1.17 | Latest stable |
| MinIO | latest | S3-compatible |
| OpenAS2 | latest | EDI/AS2 |
| Caddy | 2 | Alpine base |
| Nginx | 1.27 | Alpine base |
| Prometheus | latest | Metrics |
| Grafana | latest | Visualization |
| Docker | 20.10+ | Compose v2 |

---

## Status

✓ **Ready for Production**
✓ **OCI Ampere A1 (ARM64) Tested**
✓ **Complete Documentation**
✓ **Zero Downtime Deployment Supported**

Last Updated: 2025-04-08
