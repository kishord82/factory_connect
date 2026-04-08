# FactoryConnect — Production Deployment Guide

## Quick Start

### 1. Prepare Environment

```bash
# Clone production environment template
cp docker/.env.production.example docker/.env.production

# Edit with real credentials (NEVER commit this file)
vim docker/.env.production
```

**Critical Environment Variables to Set:**
- `DATABASE_PASSWORD` — Strong PostgreSQL password
- `REDIS_PASSWORD` — Strong Redis password
- `KEYCLOAK_ADMIN_PASSWORD` — Keycloak admin password
- `KEYCLOAK_CLIENT_SECRET` — JWT client secret from Keycloak
- `VAULT_DEV_ROOT_TOKEN_ID` — Vault root token (migrate to proper auth in prod)
- `MINIO_ROOT_PASSWORD` — MinIO root password
- `ACME_EMAIL` — Let's Encrypt contact email
- `GRAFANA_ADMIN_PASSWORD` — Grafana admin password

### 2. Build Images

```bash
# Build API image (targets linux/arm64)
docker compose -f docker/docker-compose.prod.yml build api-1

# Build Portal image
docker compose -f docker/docker-compose.prod.yml build portal

# Or build all images
docker compose -f docker/docker-compose.prod.yml build
```

### 3. Start Services

```bash
# Start all services (daemon mode)
docker compose -f docker/docker-compose.prod.yml up -d

# Check service status
docker compose -f docker/docker-compose.prod.yml ps

# Follow logs
docker compose -f docker/docker-compose.prod.yml logs -f
```

### 4. Verify Deployment

```bash
# Health check script
bash docker/health-check.sh

# Or manually check each service:

# PostgreSQL
docker compose -f docker/docker-compose.prod.yml exec postgres \
  pg_isready -U fc_app -d factoryconnect

# Redis
docker compose -f docker/docker-compose.prod.yml exec redis \
  redis-cli ping

# Keycloak
curl http://localhost:8080/health/ready

# Vault
curl http://localhost:8200/v1/sys/health

# API
curl http://localhost:3000/health

# Portal
curl http://localhost:3001/health

# Prometheus
curl http://localhost:9090/-/healthy
```

## Architecture Overview

### Service Topology

```
                    ┌─── Caddy (Reverse Proxy) ───┐
                    │   Auto-SSL, Load Balancing   │
                    │   80 (HTTP), 443 (HTTPS)     │
                    └──────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼──┐   ┌─────▼──┐   ┌──┐
         │ API-1 │   │ API-2  │   │  │
         │  :3000│   │ :3000  │   │  │
         └──┬──┬─┘   └──┬──┬──┘   │  │
            │  │        │  │      │  │
        ┌───┴──┴────────┴──┴──┐   │  │
        │   Shared Services   │   │  │
        │  ┌──────────────┐   │   │  │
        │  │  PostgreSQL  │   │   │  │
        │  │   (RLS+Audit)│   │   │  │
        │  └──────────────┘   │   │  │
        │  ┌──────────────┐   │   │  │
        │  │    Redis     │   │   │  │
        │  │  (Queue+Cache)  │   │  │
        │  └──────────────┘   │   │  │
        │  ┌──────────────┐   │   │  │
        │  │  Keycloak    │   │   │  │
        │  │ (Auth + MFA) │   │   │  │
        │  └──────────────┘   │   │  │
        │  ┌──────────────┐   │   │  │
        │  │    Vault     │   │   │  │
        │  │ (Secrets+FLE)│   │   │  │
        │  └──────────────┘   │   │  │
        │  ┌──────────────┐   │   │  │
        │  │    MinIO     │   │   │  │
        │  │  (S3/Files)  │   │   │  │
        │  └──────────────┘   │   │  │
        │  ┌──────────────┐   │   │  │
        │  │   OpenAS2    │   │   │  │
        │  │  (EDI/AS2)   │   │   │  │
        │  └──────────────┘   │   │  │
        └─────────────────────┘   │  │
                                  │  │
                            ┌─────▼──┴──┐
                            │   Portal   │
                            │   :3001    │
                            └────────────┘

        Monitoring Stack:
        ┌──────────────┐     ┌──────────┐
        │  Prometheus  │────▶│ Grafana  │
        │  :9090       │     │  :3002   │
        └──────────────┘     └──────────┘
```

### Port Mappings

| Service | Port | Purpose |
|---------|------|---------|
| Caddy | 80, 443 | Reverse proxy, auto-SSL |
| API | 3000, 3001 | Express.js servers (2 replicas) |
| Portal | 3001 | React UI |
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | Cache + BullMQ queue |
| Keycloak | 8080 | Authentication + MFA |
| Vault | 8200 | Secrets + FLE Transit |
| MinIO API | 9000 | S3-compatible storage |
| MinIO Console | 9001 | S3 management UI |
| OpenAS2 | 4080, 4081 | EDI AS2 transport |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3002 | Metrics dashboard |

## Deployment Patterns

### High Availability

**Current Setup:** 2 replicas of API server with:
- Load balancing via Caddy (round-robin)
- Shared PostgreSQL (single primary)
- Shared Redis (single instance, can add replicas)
- Health checks on all services

**To Scale Further:**
1. Add PostgreSQL replication (primary + replicas)
2. Add Redis clustering
3. Use managed Vault (not file backend)
4. Use managed MinIO (Wasabi, AWS S3)

### Disaster Recovery

**Backup Strategy:**
```bash
# Daily PostgreSQL backup
docker compose -f docker/docker-compose.prod.yml exec postgres \
  pg_dump -U fc_app -d factoryconnect | gzip > backups/db-$(date +%Y%m%d).sql.gz

# MinIO bucket backup (to cloud storage)
mc mirror minio/fc-orders s3://backup-bucket/fc-orders

# Vault data backup (if using file backend)
tar czf backups/vault-$(date +%Y%m%d).tar.gz docker/vault-data/
```

**Recovery:**
```bash
# Restore database
gunzip < backups/db-YYYYMMDD.sql.gz | \
  docker compose -f docker/docker-compose.prod.yml exec -T postgres psql -U fc_app -d factoryconnect

# Restore MinIO
mc mirror s3://backup-bucket/fc-orders minio/fc-orders
```

### Resource Limits

All services have CPU + memory limits configured:

| Service | CPU | Memory |
|---------|-----|--------|
| API (per instance) | 2 | 1G |
| Portal | 1 | 512M |
| PostgreSQL | 2 | 2G |
| Redis | 1 | 1G |
| Keycloak | 2 | 2G |
| Vault | 1 | 512M |
| MinIO | 2 | 2G |
| Prometheus | 1 | 512M |
| Grafana | 1 | 512M |

**Total: ~16 CPU, ~13GB RAM** (adjust for your OCI instance)

## Security

### Network Isolation

- All services on private Docker network (`fc-network`)
- Caddy is only exposed service (ports 80, 443)
- Database, cache, secrets only accessible from API containers
- Health check endpoints not authenticated (configure firewall rules)

### Secrets Management

**Development/Staging:**
- Store secrets in `.env.production` (gitignored)
- Vault runs in DEV mode (not suitable for production)

**Production:**
1. Migrate Vault to managed instance (OCI Vault, AWS Secrets Manager, etc.)
2. Use Vault AppRole or JWT auth (not root token)
3. Implement Vault auto-unseal
4. Store `.env.production` in secret manager (not on disk)

### TLS/SSL

- Caddy auto-generates certificates via Let's Encrypt
- Requires DNS to point to your domain
- Certificates renewed automatically 30 days before expiration

**To use custom certificates:**
1. Place cert in `docker/certs/cert.crt` and `docker/certs/key.key`
2. Update Caddyfile to reference them
3. Restart Caddy

## Monitoring

### Prometheus Scrape Targets

Configured in `docker/prometheus.yml`:
- API instances (`:3000/metrics`)
- Portal (`:3001/metrics`)
- PostgreSQL (`:5432` — requires postgres_exporter)
- Redis (`:6379` — requires redis_exporter)
- Keycloak (`:8080/metrics`)
- Vault (`:8200/v1/sys/metrics`)
- MinIO (`:9000/minio/v2/metrics/cluster`)

### Grafana Dashboards

Pre-built dashboards for:
- API response times, error rates
- Database connection pool, query latency
- Redis memory, cache hit ratio
- System CPU/memory/disk

**Add dashboard:**
```bash
# Port forward Grafana (if remote)
ssh -L 3002:localhost:3002 user@prod-server

# Navigate to http://localhost:3002
# Login: admin / (your password)
# Add Prometheus data source: http://prometheus:9090
# Import dashboard: Grafana ID 3662 (Node Exporter)
```

### Alerts (Optional)

Create alert rules in `docker/alerts.yml`:
```yaml
groups:
  - name: factoryconnect
    rules:
      - alert: APIDown
        expr: up{job="api-gateway"} == 0
        for: 2m
        annotations:
          summary: "API server {{ $labels.instance }} is down"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "PostgreSQL is unreachable"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
```

## Maintenance

### Rolling Updates

**Zero-downtime API update:**
```bash
# Build new image
docker compose -f docker/docker-compose.prod.yml build api-1

# Stop api-1 (Caddy routes to api-2)
docker compose -f docker/docker-compose.prod.yml restart api-1

# Verify api-1 is healthy
sleep 10 && curl http://localhost:3000/health

# Update api-2
docker compose -f docker/docker-compose.prod.yml build api-2
docker compose -f docker/docker-compose.prod.yml restart api-2
```

### Database Migrations

```bash
# SSH to server, then:
cd /path/to/factory_connect

# Run pending migrations
pnpm --filter @fc/database run migrate

# Check migration status
pnpm --filter @fc/database run migrate:status

# Rollback (if needed)
pnpm --filter @fc/database run migrate:rollback
```

### Log Aggregation

**View logs from all services:**
```bash
docker compose -f docker/docker-compose.prod.yml logs --tail=100 -f
```

**For production, integrate with centralized logging:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Datadog
- Cloud provider's logging service (OCI, AWS CloudWatch)

## Troubleshooting

### Service won't start

```bash
# Check logs
docker compose -f docker/docker-compose.prod.yml logs <service-name>

# Verify volumes exist
docker volume ls | grep fc_

# Check environment variables
docker inspect fc-api-1 | grep -A 100 "Env"
```

### Database connection errors

```bash
# Verify PostgreSQL is healthy
docker compose -f docker/docker-compose.prod.yml exec postgres \
  pg_isready -U fc_app -d factoryconnect

# Check network connectivity
docker compose -f docker/docker-compose.prod.yml exec api-1 \
  ping postgres

# View database logs
docker compose -f docker/docker-compose.prod.yml logs postgres
```

### Out of memory

```bash
# Check memory usage
docker stats

# Increase Docker memory limit (usually in /etc/docker/daemon.json)
# Restart Docker

# Reduce log retention: update docker-compose.prod.yml limits
```

## Performance Tuning

### PostgreSQL

Edit `docker-compose.prod.yml` postgres environment:
```yaml
POSTGRES_INIT_ARGS: >
  -c max_connections=200
  -c shared_buffers=256MB
  -c effective_cache_size=1GB
  -c work_mem=4MB
  -c maintenance_work_mem=64MB
```

### Redis

```bash
# Increase max clients
docker compose -f docker/docker-compose.prod.yml exec redis \
  redis-cli config set maxclients 10000
```

### API

```bash
# Increase Node.js memory (in Dockerfile.api)
ENV NODE_OPTIONS="--max_old_space_size=2048"
```

## Support

For issues:
1. Check logs: `docker compose logs -f <service>`
2. Review health checks: `docker ps`
3. Check disk space: `df -h`
4. Monitor resources: `docker stats`
5. Review Prometheus graphs
6. Check Grafana dashboards

---

**Last Updated:** 2025-01-15
**OCI Ampere A1 (ARM64) Tested:** Yes
**Estimated Setup Time:** 15-30 minutes
