# FactoryConnect — CI/CD Setup Guide

**Last updated:** 2026-04-09

---

## Overview

FactoryConnect uses GitHub Actions for CI/CD with Docker Hub as the container registry. The pipeline has two workflows:

1. **CI** (`ci.yml`) — Runs on every push/PR to `main` or `phase1-dev`. Validates code quality (typecheck, lint, format) and runs tests with real Postgres + Redis service containers. Also verifies Docker images build successfully.

2. **Deploy** (`deploy.yml`) — Runs on push to `main` or manual trigger. Builds multi-arch Docker images (amd64 + arm64), pushes to Docker Hub, then SSHs into the OCI VM to pull and deploy.

---

## Step 1: Create Docker Hub Repository

1. Sign in at [hub.docker.com](https://hub.docker.com)
2. Create two repositories:
   - `<username>/fc-api` (private)
   - `<username>/fc-portal` (private)
3. Generate an Access Token:
   - Account Settings → Security → New Access Token
   - Name: `github-actions-fc`
   - Permission: Read & Write
   - Save the token — you'll need it for GitHub secrets

---

## Step 2: Configure GitHub Repository Secrets

Go to: `https://github.com/kishord82/factory_connect/settings/secrets/actions`

Add these 4 repository secrets:

| Secret Name | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | The access token from Step 1 |
| `OCI_SSH_KEY` | Full contents of `~/.ssh/fc-key` (private key) |
| `OCI_HOST` | `92.4.94.2` |

---

## Step 3: Create GitHub Environment

Go to: `https://github.com/kishord82/factory_connect/settings/environments`

1. Create environment named `production`
2. (Optional) Add protection rules:
   - Required reviewers: add yourself
   - Wait timer: 0 minutes
   - Deployment branches: `main` only

---

## Step 4: Verify SSH Access

The deploy workflow SSHs into the OCI VM as `opc`. Verify the key works:

```bash
ssh -i ~/.ssh/fc-key opc@92.4.94.2 "echo 'SSH OK'"
```

The SSH key must NOT have a passphrase (GitHub Actions can't handle interactive prompts).

---

## How It Works

### CI Pipeline (every push/PR)

```
Push/PR → Install pnpm → Typecheck → Lint → Format Check
                                                    ↓
                                              Run Tests (with PG + Redis)
                                                    ↓
                                              Docker Build Check (verify images compile)
```

### Deploy Pipeline (push to main)

```
Push to main → CI Checks (reuse ci.yml)
                   ↓
              Build multi-arch images (amd64 + arm64)
                   ↓
              Push to Docker Hub (tagged with SHA + latest)
                   ↓
              SSH into OCI VM
                   ↓
              Pull new images → DB backup → Rolling restart → Health check → Auth test
```

---

## Manual Deployment

Trigger a deploy manually from GitHub:

1. Go to Actions → Deploy → Run workflow
2. Select branch: `main`
3. Choose environment: `production`
4. Click "Run workflow"

---

## Image Tags

Every deploy creates two tags per image:

- `<sha>` — Git commit SHA (e.g., `a1b2c3d`)
- `latest` — Always points to the most recent build

To roll back on the OCI VM:

```bash
# Find previous SHA tag
docker images kishord82/fc-api --format "{{.Tag}}" | head -5

# Pull and deploy specific version
docker pull kishord82/fc-api:<old-sha>
docker tag kishord82/fc-api:<old-sha> fc-api:latest
cd ~/fc/scripts/oci
docker compose -f docker-compose.local.yml --env-file .env.production up -d --no-build api
```

---

## Troubleshooting

### CI fails on typecheck/lint
Fix locally first: `pnpm typecheck && pnpm lint && pnpm fmt:check`

### Docker build fails in CI
The CI builds for `linux/amd64` only (faster). Deploy builds for `linux/amd64,linux/arm64`. If CI passes but deploy fails, it's likely an ARM64-specific issue — check native dependencies.

### Deploy SSH fails
Verify the `OCI_SSH_KEY` secret contains the full private key including `-----BEGIN` and `-----END` lines. Ensure no passphrase.

### Health check fails after deploy
SSH in manually and check:
```bash
ssh -i ~/.ssh/fc-key opc@92.4.94.2
docker ps --format "table {{.Names}}\t{{.Status}}"
docker logs fc-api --tail 30
```
