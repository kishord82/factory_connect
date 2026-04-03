-- migrate:up
-- FactoryConnect Foundation Schema
-- 20+ tables with RLS, immutable audit log (hash-chain), indexes

-- ═══════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════
-- CUSTOM TYPES
-- ═══════════════════════════════════════════════════════════════════
CREATE TYPE order_status AS ENUM (
  'DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'INVOICED', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE saga_step AS ENUM (
  'PO_RECEIVED', 'PO_CONFIRMED',
  'ACK_QUEUED', 'ACK_SENT', 'ACK_DELIVERED',
  'SHIP_READY', 'ASN_QUEUED', 'ASN_SENT', 'ASN_DELIVERED',
  'INVOICE_READY', 'INVOICE_QUEUED', 'INVOICE_SENT', 'INVOICE_DELIVERED',
  'COMPLETED', 'FAILED'
);

CREATE TYPE connection_mode AS ENUM ('sandbox', 'uat', 'production');

CREATE TYPE source_type AS ENUM ('tally', 'zoho', 'sap_b1', 'rest_api', 'manual');

CREATE TYPE resync_status AS ENUM (
  'REQUESTED', 'VALIDATED', 'APPROVED', 'REJECTED', 'DENIED',
  'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL_FAIL', 'REQUIRES_REVIEW'
);

CREATE TYPE outbox_event_type AS ENUM (
  'ORDER_CONFIRMED', 'SHIPMENT_CREATED', 'INVOICE_CREATED',
  'INBOUND_PO_RECEIVED', 'RESYNC_INITIATED', 'CONNECTION_STATUS_CHANGED'
);

CREATE TYPE audit_action AS ENUM (
  'CREATE', 'UPDATE', 'DELETE', 'CONFIRM', 'SHIP', 'INVOICE',
  'RESYNC', 'LOGIN', 'IMPERSONATE'
);

-- ═══════════════════════════════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Factories (tenants)
CREATE TABLE factories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  factory_type SMALLINT NOT NULL CHECK (factory_type BETWEEN 1 AND 4),
  gstin_encrypted TEXT,
  pan_encrypted TEXT,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  address JSONB,
  preferences JSONB NOT NULL DEFAULT '{}',
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buyers (global procurement systems)
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  name VARCHAR(255) NOT NULL,
  buyer_identifier VARCHAR(100) NOT NULL,
  edi_qualifier VARCHAR(10),
  edi_id VARCHAR(30),
  as2_id VARCHAR(100),
  as2_url VARCHAR(500),
  protocol VARCHAR(20) NOT NULL DEFAULT 'edi_x12',
  config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (factory_id, buyer_identifier)
);

-- Connections (factory ↔ buyer link with mode and SLA)
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  mode connection_mode NOT NULL DEFAULT 'sandbox',
  source_type source_type NOT NULL DEFAULT 'tally',
  sla_config JSONB NOT NULL DEFAULT '{"ack_hours": 2, "asn_hours": 24, "invoice_hours": 48}',
  tax_config JSONB NOT NULL DEFAULT '{"type": "GST", "components": ["CGST", "SGST"], "rate": 18}',
  mapping_config_id UUID,
  circuit_breaker_state VARCHAR(20) NOT NULL DEFAULT 'CLOSED',
  circuit_breaker_failures INT NOT NULL DEFAULT 0,
  circuit_breaker_last_failure TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (factory_id, buyer_id)
);

-- Canonical Orders
CREATE TABLE canonical_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  buyer_po_number VARCHAR(100) NOT NULL,
  factory_order_number VARCHAR(100),
  order_date TIMESTAMPTZ NOT NULL,
  requested_ship_date TIMESTAMPTZ,
  ship_to JSONB,
  bill_to JSONB,
  buyer_contact JSONB,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_config JSONB,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  source_type source_type NOT NULL,
  source_raw_payload TEXT,
  source_claim_uri VARCHAR(500),
  mapping_config_version INT NOT NULL DEFAULT 1,
  status order_status NOT NULL DEFAULT 'DRAFT',
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_factory ON canonical_orders(factory_id);
CREATE INDEX idx_orders_buyer ON canonical_orders(buyer_id);
CREATE INDEX idx_orders_status ON canonical_orders(factory_id, status);
CREATE INDEX idx_orders_po ON canonical_orders(factory_id, buyer_po_number);

-- Canonical Order Line Items
CREATE TABLE canonical_order_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES canonical_orders(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id),
  line_number INT NOT NULL,
  buyer_sku VARCHAR(100) NOT NULL,
  factory_sku VARCHAR(100),
  description TEXT,
  quantity_ordered NUMERIC(15, 4) NOT NULL,
  quantity_uom VARCHAR(10) NOT NULL DEFAULT 'EA',
  unit_price NUMERIC(15, 4) NOT NULL,
  line_total NUMERIC(15, 2) NOT NULL,
  upc VARCHAR(14),
  hsn_code VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, line_number)
);

CREATE INDEX idx_line_items_order ON canonical_order_line_items(order_id);

-- Canonical Shipments
CREATE TABLE canonical_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  order_id UUID NOT NULL REFERENCES canonical_orders(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  shipment_date TIMESTAMPTZ NOT NULL,
  carrier_name VARCHAR(100),
  tracking_number VARCHAR(100),
  ship_from JSONB,
  ship_to JSONB,
  weight NUMERIC(10, 2),
  weight_uom VARCHAR(5) DEFAULT 'KG',
  status VARCHAR(20) NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shipment Packs (for ASN HL hierarchy)
CREATE TABLE shipment_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES canonical_shipments(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id),
  sscc VARCHAR(20),
  pack_type VARCHAR(20) DEFAULT 'CARTON',
  weight NUMERIC(10, 2),
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Canonical Invoices
CREATE TABLE canonical_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  order_id UUID NOT NULL REFERENCES canonical_orders(id),
  shipment_id UUID REFERENCES canonical_shipments(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  subtotal NUMERIC(15, 2) NOT NULL,
  tax_amount NUMERIC(15, 2) NOT NULL,
  tax_breakdown JSONB,
  total_amount NUMERIC(15, 2) NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Canonical Returns
CREATE TABLE canonical_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  order_id UUID NOT NULL REFERENCES canonical_orders(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  return_reason VARCHAR(500),
  return_items JSONB NOT NULL DEFAULT '[]',
  credit_amount NUMERIC(15, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- WORKFLOW TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Transactional Outbox
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type outbox_event_type NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_unprocessed ON outbox(created_at) WHERE processed_at IS NULL;

-- Order Sagas (15-state lifecycle)
CREATE TABLE order_sagas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES canonical_orders(id) UNIQUE,
  factory_id UUID NOT NULL REFERENCES factories(id),
  current_step saga_step NOT NULL DEFAULT 'PO_RECEIVED',
  step_deadline TIMESTAMPTZ,
  locked_by VARCHAR(100),
  lock_expires TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 5,
  compensation_needed BOOLEAN NOT NULL DEFAULT FALSE,
  compensation_reason VARCHAR(500),
  error_code VARCHAR(100),
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sagas_factory ON order_sagas(factory_id);
CREATE INDEX idx_sagas_deadline ON order_sagas(step_deadline) WHERE completed_at IS NULL;
CREATE INDEX idx_sagas_stale ON order_sagas(lock_expires) WHERE locked_by IS NOT NULL AND completed_at IS NULL;

-- Message Log (EDI/AS2 message tracking)
CREATE TABLE message_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  order_id UUID REFERENCES canonical_orders(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  message_type VARCHAR(20) NOT NULL,
  edi_control_number VARCHAR(20),
  edi_content_uri VARCHAR(500),
  mdn_received BOOLEAN DEFAULT FALSE,
  mdn_content TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_factory ON message_log(factory_id);
CREATE INDEX idx_messages_order ON message_log(order_id);

-- Routing Rules
CREATE TABLE routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  buyer_identifier VARCHAR(100) NOT NULL,
  connection_id UUID NOT NULL REFERENCES connections(id),
  priority INT NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- SECURITY TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Immutable Audit Log (SHA-256 hash chain)
-- NO UPDATE OR DELETE triggers allowed — immutable by design
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  factory_id UUID,
  user_id VARCHAR(255),
  action audit_action NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_record JSONB,
  new_record JSONB,
  ip_address INET,
  correlation_id VARCHAR(255),
  hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_factory ON audit_log(factory_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Hash-chain trigger: each row's hash = SHA-256(action + entity_type + entity_id + new_record + prev_hash)
CREATE OR REPLACE FUNCTION audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash TEXT;
BEGIN
  SELECT hash INTO prev_hash FROM audit_log ORDER BY id DESC LIMIT 1;
  NEW.hash := encode(
    digest(
      COALESCE(NEW.action::TEXT, '') ||
      COALESCE(NEW.entity_type, '') ||
      COALESCE(NEW.entity_id::TEXT, '') ||
      COALESCE(NEW.new_record::TEXT, '') ||
      COALESCE(prev_hash, 'GENESIS'),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_hash_chain
  BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_hash_chain();

-- Prevent updates and deletes on audit_log
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable — UPDATE and DELETE are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- Record History (before/after triggers)
CREATE TABLE record_history (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  operation VARCHAR(10) NOT NULL,
  old_record JSONB,
  new_record JSONB,
  changed_by VARCHAR(255),
  tenant_id UUID,
  correlation_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_table ON record_history(table_name, record_id);
CREATE INDEX idx_history_tenant ON record_history(tenant_id);

-- ═══════════════════════════════════════════════════════════════════
-- AI TABLES
-- ═══════════════════════════════════════════════════════════════════

-- LLM Cache
CREATE TABLE llm_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_hash VARCHAR(64) NOT NULL UNIQUE,
  task_type VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  response JSONB NOT NULL,
  confidence NUMERIC(3, 2),
  hit_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_llm_cache_hash ON llm_cache(prompt_hash);

-- LLM Usage Log (training data for L3)
CREATE TABLE llm_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  prompt_hash VARCHAR(64) NOT NULL,
  input_tokens INT,
  output_tokens INT,
  latency_ms INT,
  cost_usd NUMERIC(10, 6),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  human_override BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Fix Log
CREATE TABLE ai_fix_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  agent_id VARCHAR(100),
  error_code VARCHAR(100) NOT NULL,
  fix_type VARCHAR(50) NOT NULL,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  fix_description TEXT NOT NULL,
  fix_result VARCHAR(20) NOT NULL,
  reverted BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mapping Configs
CREATE TABLE mapping_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  name VARCHAR(255) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  source_type source_type NOT NULL,
  field_mappings JSONB NOT NULL DEFAULT '[]',
  transform_rules JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mapping_connection ON mapping_configs(connection_id);

-- Notification Templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app')),
  event_type VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  body_template TEXT NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_key, channel, language)
);

-- ═══════════════════════════════════════════════════════════════════
-- SUPPORT TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Calendar Entries
CREATE TABLE calendar_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  title VARCHAR(255) NOT NULL,
  entry_date DATE NOT NULL,
  entry_type VARCHAR(30) NOT NULL DEFAULT 'holiday',
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  priority INT NOT NULL DEFAULT 50,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_factory_date ON calendar_entries(factory_id, entry_date);

-- Operational Profile
CREATE TABLE operational_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id) UNIQUE,
  business_hours JSONB NOT NULL DEFAULT '{"start": "09:00", "end": "18:00"}',
  weekly_off JSONB NOT NULL DEFAULT '["Sunday"]',
  avg_orders_per_day NUMERIC(6, 1) DEFAULT 0,
  silence_threshold_hours INT NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Escalation Rules
CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  step_number INT NOT NULL,
  channel VARCHAR(20) NOT NULL,
  wait_minutes INT NOT NULL,
  template_id UUID REFERENCES notification_templates(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (factory_id, step_number)
);

-- Escalation Log
CREATE TABLE escalation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  connection_id UUID REFERENCES connections(id),
  trigger_reason VARCHAR(255) NOT NULL,
  current_step INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- RESYNC TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE resync_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  requested_by VARCHAR(255) NOT NULL,
  target_mode connection_mode NOT NULL DEFAULT 'uat',
  status resync_status NOT NULL DEFAULT 'REQUESTED',
  item_count INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resync_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resync_id UUID NOT NULL REFERENCES resync_requests(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id),
  original_order_id UUID NOT NULL REFERENCES canonical_orders(id),
  new_idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  new_control_number VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- CONFIG TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE app_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relationship Registry (for impact analysis)
CREATE TABLE relationship_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_table VARCHAR(100) NOT NULL,
  parent_column VARCHAR(100) NOT NULL,
  child_table VARCHAR(100) NOT NULL,
  child_column VARCHAR(100) NOT NULL,
  relationship_type VARCHAR(20) NOT NULL DEFAULT 'FK',
  blocks_revert BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- CATALOG TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE connector_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  connector_type VARCHAR(20) NOT NULL CHECK (connector_type IN ('source', 'target')),
  protocol VARCHAR(30) NOT NULL,
  supported_flows JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  icon_url VARCHAR(500),
  sample_payload JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE connector_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  connector_name VARCHAR(255) NOT NULL,
  connector_type VARCHAR(20) NOT NULL,
  description TEXT,
  vote_count INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- MASTER DATA TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE item_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  factory_sku VARCHAR(100) NOT NULL,
  buyer_sku VARCHAR(100),
  buyer_id UUID REFERENCES buyers(id),
  description TEXT,
  upc VARCHAR(14),
  hsn_code VARCHAR(10),
  default_uom VARCHAR(10) NOT NULL DEFAULT 'EA',
  unit_price NUMERIC(15, 4),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_master_factory ON item_master(factory_id);
CREATE UNIQUE INDEX idx_item_master_sku ON item_master(factory_id, factory_sku) WHERE active = TRUE;

-- Rate Cards
CREATE TABLE rate_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  item_id UUID NOT NULL REFERENCES item_master(id),
  unit_price NUMERIC(15, 4) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook Subscriptions
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_delivery_at TIMESTAMPTZ,
  failure_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Barcode Configs
CREATE TABLE barcode_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  barcode_type VARCHAR(20) NOT NULL DEFAULT 'SSCC-18',
  prefix VARCHAR(20),
  next_sequence BIGINT NOT NULL DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS) — ALL tenant-scoped tables
-- ═══════════════════════════════════════════════════════════════════
-- RLS ensures queries only return rows matching current_setting('app.current_tenant')

-- Enable RLS on all tenant tables
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_sagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE resync_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resync_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fix_log ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant can only see their own rows
-- The factory_id column matches current_setting('app.current_tenant')

CREATE POLICY tenant_isolation ON factories
  USING (id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON buyers
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON connections
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON canonical_orders
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON canonical_order_line_items
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON canonical_shipments
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON shipment_packs
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON canonical_invoices
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON canonical_returns
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON order_sagas
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON message_log
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON routing_rules
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON mapping_configs
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON calendar_entries
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON operational_profile
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON escalation_rules
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON escalation_log
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON resync_requests
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON resync_items
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON item_master
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON rate_cards
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON webhook_subscriptions
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON barcode_configs
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON ai_fix_log
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON factories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON buyers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON canonical_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON canonical_shipments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON canonical_invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON canonical_returns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON order_sagas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON operational_profile FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON escalation_log FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON resync_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON mapping_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON item_master FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down
-- Drop in reverse dependency order
DROP TRIGGER IF EXISTS trg_updated_at ON webhook_subscriptions;
DROP TRIGGER IF EXISTS trg_updated_at ON item_master;
DROP TRIGGER IF EXISTS trg_updated_at ON app_config;
DROP TRIGGER IF EXISTS trg_updated_at ON mapping_configs;
DROP TRIGGER IF EXISTS trg_updated_at ON resync_requests;
DROP TRIGGER IF EXISTS trg_updated_at ON escalation_log;
DROP TRIGGER IF EXISTS trg_updated_at ON operational_profile;
DROP TRIGGER IF EXISTS trg_updated_at ON order_sagas;
DROP TRIGGER IF EXISTS trg_updated_at ON canonical_returns;
DROP TRIGGER IF EXISTS trg_updated_at ON canonical_invoices;
DROP TRIGGER IF EXISTS trg_updated_at ON canonical_shipments;
DROP TRIGGER IF EXISTS trg_updated_at ON canonical_orders;
DROP TRIGGER IF EXISTS trg_updated_at ON connections;
DROP TRIGGER IF EXISTS trg_updated_at ON buyers;
DROP TRIGGER IF EXISTS trg_updated_at ON factories;
DROP FUNCTION IF EXISTS set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_log;
DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_log;
DROP TRIGGER IF EXISTS trg_audit_hash_chain ON audit_log;
DROP FUNCTION IF EXISTS prevent_audit_mutation();
DROP FUNCTION IF EXISTS audit_log_hash_chain();

DROP TABLE IF EXISTS barcode_configs;
DROP TABLE IF EXISTS webhook_subscriptions;
DROP TABLE IF EXISTS rate_cards;
DROP TABLE IF EXISTS item_master;
DROP TABLE IF EXISTS connector_requests;
DROP TABLE IF EXISTS connector_catalog;
DROP TABLE IF EXISTS relationship_registry;
DROP TABLE IF EXISTS app_config;
DROP TABLE IF EXISTS resync_items;
DROP TABLE IF EXISTS resync_requests;
DROP TABLE IF EXISTS escalation_log;
DROP TABLE IF EXISTS escalation_rules;
DROP TABLE IF EXISTS operational_profile;
DROP TABLE IF EXISTS calendar_entries;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS mapping_configs;
DROP TABLE IF EXISTS ai_fix_log;
DROP TABLE IF EXISTS llm_usage_log;
DROP TABLE IF EXISTS llm_cache;
DROP TABLE IF EXISTS record_history;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS routing_rules;
DROP TABLE IF EXISTS message_log;
DROP TABLE IF EXISTS order_sagas;
DROP TABLE IF EXISTS outbox;
DROP TABLE IF EXISTS canonical_returns;
DROP TABLE IF EXISTS canonical_invoices;
DROP TABLE IF EXISTS shipment_packs;
DROP TABLE IF EXISTS canonical_shipments;
DROP TABLE IF EXISTS canonical_order_line_items;
DROP TABLE IF EXISTS canonical_orders;
DROP TABLE IF EXISTS connections;
DROP TABLE IF EXISTS buyers;
DROP TABLE IF EXISTS factories;

DROP TYPE IF EXISTS audit_action;
DROP TYPE IF EXISTS outbox_event_type;
DROP TYPE IF EXISTS resync_status;
DROP TYPE IF EXISTS source_type;
DROP TYPE IF EXISTS connection_mode;
DROP TYPE IF EXISTS saga_step;
DROP TYPE IF EXISTS order_status;
