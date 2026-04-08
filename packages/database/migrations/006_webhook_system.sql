-- migrate:up
-- Webhook system and enhanced outbox for retry/backoff support
-- Adds webhook_deliveries table and outbox enhancements

-- ═══════════════════════════════════════════════════════════════════
-- WEBHOOK SUBSCRIPTIONS ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════

-- Add custom_headers column to webhook_subscriptions
ALTER TABLE webhook_subscriptions
  ADD COLUMN custom_headers JSONB;

-- ═══════════════════════════════════════════════════════════════════
-- OUTBOX TABLE ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════

-- Add columns to outbox for retry logic and claim-check support
ALTER TABLE outbox
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ack', 'failed')),
  ADD COLUMN retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN last_error TEXT,
  ADD COLUMN next_attempt_at TIMESTAMPTZ,
  ADD COLUMN payload_claim_uri VARCHAR(500);

-- Update index for unprocessed events to support retry scheduling
DROP INDEX IF EXISTS idx_outbox_unprocessed;
CREATE INDEX idx_outbox_pending ON outbox(created_at) WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW());

-- Index for finding failed events (DLQ)
CREATE INDEX idx_outbox_failed ON outbox(created_at) WHERE status = 'failed';

-- ═══════════════════════════════════════════════════════════════════
-- WEBHOOK DELIVERIES TABLE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_factory ON webhook_deliveries(factory_id);
CREATE INDEX idx_webhook_deliveries_subscription ON webhook_deliveries(subscription_id);
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(created_at)
  WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW());
CREATE INDEX idx_webhook_deliveries_failed ON webhook_deliveries(created_at) WHERE status = 'failed';

-- Enable RLS for webhook_deliveries
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON webhook_deliveries
  USING (factory_id::TEXT = current_setting('app.current_tenant', true));

-- Add updated_at trigger to webhook_subscriptions if not already present
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION DOWN
-- ═══════════════════════════════════════════════════════════════════

-- migrate:down

DROP TABLE IF EXISTS webhook_deliveries;

ALTER TABLE outbox
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS retry_count,
  DROP COLUMN IF EXISTS last_error,
  DROP COLUMN IF EXISTS next_attempt_at,
  DROP COLUMN IF EXISTS payload_claim_uri;

ALTER TABLE webhook_subscriptions
  DROP COLUMN IF EXISTS custom_headers;

DROP INDEX IF EXISTS idx_outbox_pending;
DROP INDEX IF EXISTS idx_outbox_failed;

-- Recreate original outbox index
CREATE INDEX idx_outbox_unprocessed ON outbox(created_at) WHERE processed_at IS NULL;
