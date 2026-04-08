#!/usr/bin/env bash
###############################################################################
# FactoryConnect — OCI Instance Setup Script
# Target: Oracle Linux 8/9 ARM64 (Ampere A1 Free Tier)
# Usage: sudo bash setup-instance.sh
###############################################################################
set -euo pipefail

echo "═══════════════════════════════════════════════════════════════"
echo "  FactoryConnect — OCI Instance Setup"
echo "═══════════════════════════════════════════════════════════════"

# ── Verify running as root ───────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "ERROR: This script must be run as root (sudo)"
  exit 1
fi

# ── Detect OS ────────────────────────────────────────────────────────────────
if [ -f /etc/oracle-release ]; then
  OS_VERSION=$(cat /etc/oracle-release)
  echo "Detected: $OS_VERSION"
else
  echo "WARNING: Not Oracle Linux. Proceeding anyway..."
fi

# ── System updates ───────────────────────────────────────────────────────────
echo ""
echo "── Updating system packages..."
dnf update -y -q

# ── Setup swap (4GB) ────────────────────────────────────────────────────────
echo ""
echo "── Setting up 4GB swap..."
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap created and enabled"
else
  echo "Swap already exists, skipping"
fi

# Tune swappiness for a server workload
sysctl vm.swappiness=10
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf

# ── Install Docker ───────────────────────────────────────────────────────────
echo ""
echo "── Installing Docker..."
if ! command -v docker &>/dev/null; then
  dnf install -y dnf-utils
  dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  echo "Docker installed"
else
  echo "Docker already installed: $(docker --version)"
fi

# Enable and start Docker
systemctl enable docker
systemctl start docker

# ── Install Docker Compose (standalone, in case plugin isn't enough) ─────────
echo ""
echo "── Verifying Docker Compose..."
if docker compose version &>/dev/null; then
  echo "Docker Compose plugin: $(docker compose version)"
else
  echo "Installing Docker Compose standalone..."
  COMPOSE_VERSION="v2.29.2"
  curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
fi

# ── Install Node.js 22 LTS (for migrations outside Docker if needed) ────────
echo ""
echo "── Installing Node.js 22 LTS..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
  dnf install -y nodejs
  echo "Node.js installed: $(node --version)"
else
  echo "Node.js already installed: $(node --version)"
fi

# ── Create deploy user ──────────────────────────────────────────────────────
echo ""
echo "── Creating deploy user..."
if ! id "deploy" &>/dev/null; then
  useradd -m -s /bin/bash -G docker deploy
  echo "User 'deploy' created and added to docker group"
else
  usermod -aG docker deploy
  echo "User 'deploy' already exists, ensured docker group membership"
fi

# Create app directory
mkdir -p /opt/factoryconnect
chown deploy:deploy /opt/factoryconnect

# Create backup directory
mkdir -p /opt/factoryconnect/backups
chown deploy:deploy /opt/factoryconnect/backups

# Create log directory
mkdir -p /var/log/factoryconnect
chown deploy:deploy /var/log/factoryconnect

# ── Firewall rules ──────────────────────────────────────────────────────────
echo ""
echo "── Configuring firewall..."
if command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port=80/tcp    # HTTP
  firewall-cmd --permanent --add-port=443/tcp   # HTTPS
  firewall-cmd --permanent --add-port=3000/tcp  # API (direct, optional)
  firewall-cmd --permanent --add-port=5173/tcp  # Portal (direct, optional)
  firewall-cmd --reload
  echo "Firewall ports opened: 80, 443, 3000, 5173"
else
  echo "WARNING: firewall-cmd not found. Configure iptables manually."
  # Fallback: iptables
  iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  iptables -I INPUT -p tcp --dport 443 -j ACCEPT
  iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
  iptables -I INPUT -p tcp --dport 5173 -j ACCEPT
fi

# ── OCI Security List reminder ──────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  IMPORTANT: OCI Security List / Network Security Group       ║"
echo "║                                                              ║"
echo "║  You MUST also open these ports in your OCI VCN:             ║"
echo "║    - Ingress Rule: 0.0.0.0/0 → TCP 80  (HTTP)               ║"
echo "║    - Ingress Rule: 0.0.0.0/0 → TCP 443 (HTTPS)              ║"
echo "║                                                              ║"
echo "║  Go to: OCI Console → Networking → VCN → Security Lists     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# ── Kernel tuning for Docker + PostgreSQL ────────────────────────────────────
echo ""
echo "── Applying kernel tuning..."
cat > /etc/sysctl.d/99-factoryconnect.conf <<'SYSCTL'
# Allow more connections
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 1024

# Reduce TIME_WAIT sockets
net.ipv4.tcp_tw_reuse = 1

# Increase file descriptor limits
fs.file-max = 65536

# PostgreSQL shared memory
kernel.shmmax = 268435456
kernel.shmall = 65536

# Docker bridge networking
net.ipv4.ip_forward = 1
SYSCTL

sysctl --system > /dev/null 2>&1

# Increase file limits for deploy user
cat > /etc/security/limits.d/99-factoryconnect.conf <<'LIMITS'
deploy soft nofile 65536
deploy hard nofile 65536
deploy soft nproc 4096
deploy hard nproc 4096
LIMITS

# ── Docker daemon config ────────────────────────────────────────────────────
echo ""
echo "── Configuring Docker daemon..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'DOCKER'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
DOCKER

systemctl restart docker

# ── Install useful tools ────────────────────────────────────────────────────
echo ""
echo "── Installing utilities..."
dnf install -y git jq htop tmux unzip -q 2>/dev/null || true

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Docker:    $(docker --version)"
echo "  Compose:   $(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null)"
echo "  Node.js:   $(node --version)"
echo "  Swap:      $(free -h | grep Swap | awk '{print $2}')"
echo "  User:      deploy (in docker group)"
echo "  App dir:   /opt/factoryconnect"
echo "  Backups:   /opt/factoryconnect/backups"
echo ""
echo "  Next steps:"
echo "    1. Open ports 80 + 443 in OCI Security List"
echo "    2. su - deploy"
echo "    3. cd /opt/factoryconnect"
echo "    4. Copy your code + scripts here"
echo "    5. cp .env.production.template .env.production"
echo "    6. Edit .env.production with real passwords"
echo "    7. ./deploy.sh first-run"
echo ""
