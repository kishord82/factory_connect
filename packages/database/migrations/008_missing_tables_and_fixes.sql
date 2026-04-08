-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE (referenced by notification-service.ts)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  user_id VARCHAR(255),
  channel VARCHAR(50) NOT NULL DEFAULT 'in_app',
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_factory ON notifications(factory_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ═══════════════════════════════════════════════════════════════════
-- WEBHOOK DELIVERIES TABLE (referenced by webhook-service.ts)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(created_at) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════
-- ADD REVERT TO audit_action ENUM
-- ═══════════════════════════════════════════════════════════════════
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'REVERT';

-- ═══════════════════════════════════════════════════════════════════
-- ADD missing columns to order_sagas (connection_id used by saga coordinator)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE order_sagas ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES connections(id);
ALTER TABLE order_sagas ADD COLUMN IF NOT EXISTS compensation_data JSONB NOT NULL DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════════
-- ADD missing columns to connections (used by connection routes)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE connections ADD COLUMN IF NOT EXISTS protocol VARCHAR(50);
ALTER TABLE connections ADD COLUMN IF NOT EXISTS buyer_endpoint TEXT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS credentials JSONB;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS currency_config JSONB;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS barcode_config JSONB;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS partial_shipment_allowed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS sla_ack_hours INT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS sla_ship_hours INT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS sla_invoice_hours INT;

-- ═══════════════════════════════════════════════════════════════════
-- ADD missing columns to escalation_log (used by saga coordinator)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE escalation_log ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(100);
ALTER TABLE escalation_log ADD COLUMN IF NOT EXISTS trigger_details JSONB;

-- ═══════════════════════════════════════════════════════════════════
-- ADD missing columns to resync_requests (used by resync routes)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE resync_requests ADD COLUMN IF NOT EXISTS resync_type VARCHAR(50);
ALTER TABLE resync_requests ADD COLUMN IF NOT EXISTS reason TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- ADD missing columns to audit_log for code compatibility
-- The code uses tenant_id (alias for factory_id) and actor_id (alias for user_id)
-- Also add metadata JSONB for flexible audit context
-- ═══════════════════════════════════════════════════════════════════
-- Note: We add tenant_id and actor_id as aliases; code references these
-- but the table has factory_id and user_id. We add the new columns.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS metadata JSONB;

-- migrate:down

ALTER TABLE audit_log DROP COLUMN IF EXISTS metadata;
ALTER TABLE audit_log DROP COLUMN IF EXISTS actor_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS tenant_id;

ALTER TABLE resync_requests DROP COLUMN IF EXISTS reason;
ALTER TABLE resync_requests DROP COLUMN IF EXISTS resync_type;

ALTER TABLE escalation_log DROP COLUMN IF EXISTS trigger_details;
ALTER TABLE escalation_log DROP COLUMN IF EXISTS trigger_type;

ALTER TABLE connections DROP COLUMN IF EXISTS sla_invoice_hours;
ALTER TABLE connections DROP COLUMN IF EXISTS sla_ship_hours;
ALTER TABLE connections DROP COLUMN IF EXISTS sla_ack_hours;
ALTER TABLE connections DROP COLUMN IF EXISTS partial_shipment_allowed;
ALTER TABLE connections DROP COLUMN IF EXISTS barcode_config;
ALTER TABLE connections DROP COLUMN IF EXISTS currency_config;
ALTER TABLE connections DROP COLUMN IF EXISTS credentials;
ALTER TABLE connections DROP COLUMN IF EXISTS buyer_endpoint;
ALTER TABLE connections DROP COLUMN IF EXISTS protocol;

ALTER TABLE order_sagas DROP COLUMN IF EXISTS compensation_data;
ALTER TABLE order_sagas DROP COLUMN IF EXISTS connection_id;

DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS notifications;
