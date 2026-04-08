###############################################################################
# HashiCorp Vault — Production Server Configuration
# File-based backend (production: migrate to Integrated Storage)
###############################################################################

# Logging
log_level = "info"

# Data storage backend
storage "file" {
  path = "/vault/data"
}

# Listener configuration
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = 1
  # In production, enable TLS:
  # tls_cert_file = "/vault/config/cert.crt"
  # tls_key_file  = "/vault/config/key.key"
}

# Enable API
api_addr = "http://127.0.0.1:8200"

# Cluster address (for HA setup)
cluster_addr = "http://127.0.0.1:8201"

# High Availability mode configuration (optional)
# For multi-node setup, use Integrated Storage or Consul backend
#
# ha_storage "consul" {
#   address      = "consul:8500"
#   path         = "vault/"
#   redirect_addr = "http://vault-1:8200"
#   cluster_addr = "http://vault-1:8201"
# }

# Telemetry configuration
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = false
}

# Disable mlock for Docker (already handled by CAP_IPC_LOCK)
disable_mlock = false

# UI settings
ui = true

# Default lease duration
default_lease_ttl = "168h"
max_lease_ttl     = "720h"
