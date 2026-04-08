# FactoryConnect — Docker Build & Deployment Guide

## Overview

This guide covers building Docker images for production deployment on OCI Ampere A1 (ARM64).

## Build Architecture

### Multi-Stage Builds

Both Dockerfile.api and Dockerfile.portal use multi-stage builds:

1. **Builder Stage:** Full Node.js 22 Alpine + build tools
   - Installs dependencies
   - Compiles TypeScript
   - Runs tests (optional)
   - Creates optimized bundles

2. **Runtime Stage:** Minimal production image
   - Only runtime dependencies
   - Non-root user
   - Health checks
   - Optimized for ARM64

### Why Multi-Stage?

- **Smaller image size:** ~400MB → ~200MB for API, ~150MB for Portal
- **Security:** No build tools in production
- **Performance:** Faster cold starts
- **Efficiency:** Reduced attack surface

## Prerequisites

### Local Development

```bash
# Install Docker (compatible with ARM64)
# On M1/M2 Mac: native support
# On Linux ARM64 (e.g., Raspberry Pi): native support
# On x86_64: requires qemu or native ARM64 build agent

# Verify Docker supports linux/arm64
docker buildx ls

# If not available, create builder:
docker buildx create --use --platform linux/amd64,linux/arm64 --name fc-builder
```

### OCI Compute Instance (Target)

```bash
# Ubuntu 22.04 LTS or CentOS 8+
# ARM64-based (e.g., OCI Ampere A1)

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Building Images

### Option 1: Build Locally (M1/M2 Mac or ARM64 Linux)

```bash
cd /path/to/factory_connect

# Build API image
docker compose -f docker/docker-compose.prod.yml build api-1

# Build Portal image
docker compose -f docker/docker-compose.prod.yml build portal

# Or build all images
docker compose -f docker/docker-compose.prod.yml build

# View images
docker images | grep factoryconnect
```

### Option 2: Build with Buildx (Cross-platform)

For building on x86_64 for ARM64 deployment:

```bash
cd /path/to/factory_connect

# Create buildx context
docker buildx create --use --name fc-builder

# Build API for ARM64
docker buildx build \
  --platform linux/arm64 \
  --tag factoryconnect/api:latest \
  --tag factoryconnect/api:v1.0.0 \
  --file docker/Dockerfile.api \
  .

# Build Portal for ARM64
docker buildx build \
  --platform linux/arm64 \
  --tag factoryconnect/portal:latest \
  --tag factoryconnect/portal:v1.0.0 \
  --file docker/Dockerfile.portal \
  .
```

### Option 3: Push to Registry (CI/CD)

```bash
# Build and push to Docker Hub
docker buildx build \
  --platform linux/arm64 \
  --push \
  --tag your-registry/factoryconnect/api:latest \
  --file docker/Dockerfile.api \
  .

# Or use private OCI registry
docker buildx build \
  --platform linux/arm64 \
  --push \
  --tag region.ocir.io/namespace/factoryconnect/api:latest \
  --file docker/Dockerfile.api \
  .
```

## Image Verification

```bash
# Inspect image (check architecture)
docker image inspect factoryconnect/api:latest | grep -A 5 'Architecture'
# Should show: "Architecture": "arm64"

# Check image size
docker images factoryconnect/api:latest

# Run image locally (on ARM64)
docker run --rm factoryconnect/api:latest node --version
# Should print: v22.x.x

# Check build time
docker images --no-trunc --all factoryconnect/api:latest
```

## Deployment

### 1. Prepare Server

```bash
# SSH to OCI instance
ssh -i /path/to/key.pem ubuntu@instance-ip

# Clone repository
git clone https://github.com/your-org/factory_connect.git
cd factory_connect

# Create production environment
cp docker/.env.production.example docker/.env.production

# Edit with real credentials
nano docker/.env.production
```

### 2. Pull or Build Images

**Option A: Pull from Registry**
```bash
docker pull region.ocir.io/namespace/factoryconnect/api:latest
docker pull region.ocir.io/namespace/factoryconnect/portal:latest

# Or update docker-compose.prod.yml to use registry images
```

**Option B: Build on Server**
```bash
# Install build dependencies
sudo apt-get update && sudo apt-get install -y build-essential python3

# Build images (may take 5-10 minutes)
docker compose -f docker/docker-compose.prod.yml build --no-cache
```

### 3. Start Services

```bash
# Load environment
set -a
source docker/.env.production
set +a

# Start all services
docker compose -f docker/docker-compose.prod.yml up -d

# Verify
docker compose -f docker/docker-compose.prod.yml ps

# Check logs
docker compose -f docker/docker-compose.prod.yml logs -f
```

### 4. Health Check

```bash
# Run health check script
bash docker/health-check.sh

# Or manual checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:9090/-/healthy
```

## Troubleshooting Build Issues

### Out of Memory During Build

```bash
# Increase Docker memory limit
# Edit /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "memory": "4g",
  "memswap": "8g"
}

# Restart Docker
sudo systemctl restart docker
```

### Slow Build on Arm64

```bash
# Increase build cache
docker builder prune

# Build with parallel layers
docker compose -f docker/docker-compose.prod.yml build --parallel

# Skip unnecessary dependencies
# Edit pnpm-workspace.yaml: only include needed packages
```

### Platform Mismatch

```bash
# If error: "image operating system linux/amd64 cannot be used on this platform"
# Rebuild explicitly for your platform
docker compose -f docker/docker-compose.prod.yml build \
  --no-cache \
  --progress=plain \
  api-1

# Or pull multi-arch image
docker pull --platform linux/arm64 node:22-alpine
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/build-deploy.yml
name: Build & Deploy

on:
  push:
    branches: [main, Phase1]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to registry
        uses: docker/login-action@v2
        with:
          registry: region.ocir.io
          username: ${{ secrets.OCI_USERNAME }}
          password: ${{ secrets.OCI_PASSWORD }}
      
      - name: Build & Push API
        uses: docker/build-push-action@v4
        with:
          context: .
          file: docker/Dockerfile.api
          platforms: linux/arm64
          push: true
          tags: |
            region.ocir.io/namespace/api:latest
            region.ocir.io/namespace/api:${{ github.sha }}
      
      - name: Build & Push Portal
        uses: docker/build-push-action@v4
        with:
          context: .
          file: docker/Dockerfile.portal
          platforms: linux/arm64
          push: true
          tags: |
            region.ocir.io/namespace/portal:latest
            region.ocir.io/namespace/portal:${{ github.sha }}
      
      - name: Deploy to OCI
        run: |
          ssh -i ${{ secrets.OCI_SSH_KEY }} ubuntu@${{ secrets.OCI_HOST }} \
            'cd factory_connect && git pull && docker compose -f docker/docker-compose.prod.yml pull && docker compose -f docker/docker-compose.prod.yml up -d'
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:api:
  stage: build
  script:
    - docker buildx build --platform linux/arm64 --push --tag registry.example.com/api:$CI_COMMIT_SHA docker/Dockerfile.api

build:portal:
  stage: build
  script:
    - docker buildx build --platform linux/arm64 --push --tag registry.example.com/portal:$CI_COMMIT_SHA docker/Dockerfile.portal

deploy:
  stage: deploy
  script:
    - ssh ubuntu@$OCI_HOST "cd factory_connect && git pull && docker compose pull && docker compose up -d"
```

## Image Registry Options

### Docker Hub
```bash
docker login
docker tag factoryconnect/api:latest your-username/factoryconnect/api:latest
docker push your-username/factoryconnect/api:latest
```

### OCI Registry (OCIR)

```bash
# Login
docker login region.ocir.io

# Tag and push
docker tag factoryconnect/api:latest region.ocir.io/namespace/factoryconnect/api:latest
docker push region.ocir.io/namespace/factoryconnect/api:latest
```

### Private Harbor Registry

```bash
docker login harbor.example.com
docker tag factoryconnect/api:latest harbor.example.com/factoryconnect/api:latest
docker push harbor.example.com/factoryconnect/api:latest
```

## Performance Optimization

### Reduce Image Size

```dockerfile
# In Dockerfile.api build stage, use .dockerignore to exclude:
- node_modules/.bin (symlinks)
- Test files
- Development dependencies
- Source maps (in production)
- Documentation
```

### Layer Caching

```dockerfile
# Order Dockerfile commands by frequency of change (least frequent first)
FROM node:22-alpine
COPY pnpm-workspace.yaml package.json ./  # Changes rarely
COPY packages ./packages                   # Changes often
RUN pnpm install                           # This will cache if deps unchanged
COPY apps/api ./apps/api                   # Changes very often
RUN pnpm build                             # Rerun only if needed
```

### Multi-Registry Push

```bash
# Push to multiple registries simultaneously
docker tag api:latest \
  docker.io/user/api:latest \
  region.ocir.io/namespace/api:latest \
  harbor.example.com/api:latest

# Push to all
for registry in docker.io region.ocir.io harbor.example.com; do
  docker push $registry/user/api:latest
done
```

## Security Scanning

```bash
# Scan images with Trivy
trivy image factoryconnect/api:latest

# Scan with Snyk
snyk container test factoryconnect/api:latest

# Sign images (with Cosign)
cosign sign --key cosign.key region.ocir.io/namespace/api:latest
```

## Monitoring Build Metrics

```bash
# Check Docker daemon logs
docker logs $(docker inspect --format='{{.Id}}' $(docker ps -aq))

# Monitor build progress
docker buildx build --progress=plain \
  --platform linux/arm64 \
  --tag factoryconnect/api:latest \
  --file docker/Dockerfile.api \
  .

# Check build history
docker buildx du

# Clean build cache
docker buildx prune
```

---

**Last Updated:** 2025-01-15
**Build Time:** ~5-10 minutes (depending on network + instance size)
**Final Image Size:** API ~200MB, Portal ~150MB (both compressed)
