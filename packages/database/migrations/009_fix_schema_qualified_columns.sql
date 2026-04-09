-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- FIX: Migration 008 used unqualified table names, but migration 007
-- already moved tables to their designated schemas. The ALTER TABLE
-- statements silently failed. This migration re-applies the column
-- additions with proper schema-qualified names.
-- ═══════════════════════════════════════════════════════════════════

-- core.connections — columns needed by connection routes
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS protocol VARCHAR(50);
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS buyer_endpoint TEXT;
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS credentials JSONB;
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS currency_config JSONB;
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS barcode_config JSONB;
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS partial_shipment_allowed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS sla_ack_hours INT;
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS sla_ship_hours INT;
ALTER TABLE core.connections ADD COLUMN IF NOT EXISTS sla_invoice_hours INT;

-- workflow.order_sagas — columns needed by saga coordinator
ALTER TABLE workflow.order_sagas ADD COLUMN IF NOT EXISTS connection_id UUID;
ALTER TABLE workflow.order_sagas ADD COLUMN IF NOT EXISTS compensation_data JSONB NOT NULL DEFAULT '{}';

-- workflow.resync_requests — columns needed by resync routes
ALTER TABLE workflow.resync_requests ADD COLUMN IF NOT EXISTS resync_type VARCHAR(50);
ALTER TABLE workflow.resync_requests ADD COLUMN IF NOT EXISTS reason TEXT;

-- audit.audit_log — columns needed by settings audit endpoint
ALTER TABLE audit.audit_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE audit.audit_log ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255);
ALTER TABLE audit.audit_log ADD COLUMN IF NOT EXISTS metadata JSONB;

-- platform.escalation_log — columns needed by saga coordinator
ALTER TABLE platform.escalation_log ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(100);
ALTER TABLE platform.escalation_log ADD COLUMN IF NOT EXISTS trigger_details JSONB;

-- ═══════════════════════════════════════════════════════════════════
-- FIX: Migration 008 created notifications and webhook_deliveries in
-- the public schema. Move them to platform schema if they exist there.
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  -- Move notifications to platform schema if it exists in public
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications SET SCHEMA platform;
  END IF;

  -- Create notifications in platform if it doesn't exist anywhere
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'notifications'
  ) THEN
    CREATE TABLE platform.notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      factory_id UUID NOT NULL,
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
    CREATE INDEX idx_notifications_factory ON platform.notifications(factory_id);
    CREATE INDEX idx_notifications_user ON platform.notifications(user_id);
    CREATE INDEX idx_notifications_unread ON platform.notifications(user_id) WHERE is_read = FALSE;
  END IF;

  -- Move webhook_deliveries to platform schema if it exists in public
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'webhook_deliveries'
  ) THEN
    ALTER TABLE public.webhook_deliveries SET SCHEMA platform;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- SEED: Add CA demo firm if not exists (needed for CA platform login)
-- ca_firms columns: id, name, registration_number, gst_number,
--   subscription_tier, max_clients, owner_user_id, settings
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO compliance.ca_firms (id, name, registration_number, gst_number, subscription_tier, max_clients, owner_user_id, settings)
VALUES (
  'ca000000-0000-0000-0000-000000000001',
  'Demo CA Firm',
  'FRN-DEMO-001',
  '29DEMO0000CA1ZF',
  'professional',
  50,
  'ca000000-0000-0000-0000-000000000001',
  '{"timezone": "Asia/Kolkata", "currency": "INR"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- migrate:down

-- Remove CA demo firm
DELETE FROM compliance.ca_firms WHERE id = 'ca000000-0000-0000-0000-000000000001';

-- Note: Column additions are idempotent (IF NOT EXISTS), so no need to drop them
-- The notifications/webhook_deliveries schema moves are also safe to leave
