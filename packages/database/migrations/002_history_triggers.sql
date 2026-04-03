-- migrate:up
-- FactoryConnect Migration 002: Record History Triggers
-- Generic trigger function applied to all tenant-scoped tables
-- Captures INSERT/UPDATE/DELETE with old_record/new_record JSONB snapshots
-- References: Architecture Decisions History, Correction C16

-- ═══════════════════════════════════════════════════════════════════
-- GENERIC HISTORY TRIGGER FUNCTION
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION record_history_trigger() RETURNS trigger AS $$
BEGIN
  INSERT INTO record_history (
    table_name, record_id, operation, old_record, new_record,
    changed_by, tenant_id, correlation_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb END,
    current_setting('app.current_user', true),
    current_setting('app.current_tenant', true)::uuid,
    current_setting('app.correlation_id', true)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════
-- APPLY TO ALL TENANT-SCOPED TABLES (24 tables with RLS enabled)
-- ═══════════════════════════════════════════════════════════════════

-- Core tables
CREATE TRIGGER trg_history_factories
  AFTER INSERT OR UPDATE OR DELETE ON factories
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_buyers
  AFTER INSERT OR UPDATE OR DELETE ON buyers
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_connections
  AFTER INSERT OR UPDATE OR DELETE ON connections
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- Order tables
CREATE TRIGGER trg_history_canonical_orders
  AFTER INSERT OR UPDATE OR DELETE ON canonical_orders
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_canonical_order_line_items
  AFTER INSERT OR UPDATE OR DELETE ON canonical_order_line_items
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_canonical_shipments
  AFTER INSERT OR UPDATE OR DELETE ON canonical_shipments
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_shipment_packs
  AFTER INSERT OR UPDATE OR DELETE ON shipment_packs
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_canonical_invoices
  AFTER INSERT OR UPDATE OR DELETE ON canonical_invoices
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_canonical_returns
  AFTER INSERT OR UPDATE OR DELETE ON canonical_returns
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- Saga & messaging
CREATE TRIGGER trg_history_order_sagas
  AFTER INSERT OR UPDATE OR DELETE ON order_sagas
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_message_log
  AFTER INSERT OR UPDATE OR DELETE ON message_log
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- Configuration tables
CREATE TRIGGER trg_history_routing_rules
  AFTER INSERT OR UPDATE OR DELETE ON routing_rules
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_mapping_configs
  AFTER INSERT OR UPDATE OR DELETE ON mapping_configs
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- Calendar & operations
CREATE TRIGGER trg_history_calendar_entries
  AFTER INSERT OR UPDATE OR DELETE ON calendar_entries
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_operational_profile
  AFTER INSERT OR UPDATE OR DELETE ON operational_profile
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- Escalation
CREATE TRIGGER trg_history_escalation_rules
  AFTER INSERT OR UPDATE OR DELETE ON escalation_rules
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_escalation_log
  AFTER INSERT OR UPDATE OR DELETE ON escalation_log
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- Resync
CREATE TRIGGER trg_history_resync_requests
  AFTER INSERT OR UPDATE OR DELETE ON resync_requests
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_resync_items
  AFTER INSERT OR UPDATE OR DELETE ON resync_items
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- Master data
CREATE TRIGGER trg_history_item_master
  AFTER INSERT OR UPDATE OR DELETE ON item_master
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_rate_cards
  AFTER INSERT OR UPDATE OR DELETE ON rate_cards
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- Integration
CREATE TRIGGER trg_history_webhook_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_barcode_configs
  AFTER INSERT OR UPDATE OR DELETE ON barcode_configs
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- AI
CREATE TRIGGER trg_history_ai_fix_log
  AFTER INSERT OR UPDATE OR DELETE ON ai_fix_log
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- ═══════════════════════════════════════════════════════════════════
-- ADDITIONAL INDEXES FOR HISTORY QUERIES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_history_operation ON record_history(operation);
CREATE INDEX idx_history_created_at ON record_history(created_at);
CREATE INDEX idx_history_changed_by ON record_history(changed_by);
CREATE INDEX idx_history_correlation ON record_history(correlation_id);

-- migrate:down

-- Drop all history triggers
DROP TRIGGER IF EXISTS trg_history_factories ON factories;
DROP TRIGGER IF EXISTS trg_history_buyers ON buyers;
DROP TRIGGER IF EXISTS trg_history_connections ON connections;
DROP TRIGGER IF EXISTS trg_history_canonical_orders ON canonical_orders;
DROP TRIGGER IF EXISTS trg_history_canonical_order_line_items ON canonical_order_line_items;
DROP TRIGGER IF EXISTS trg_history_canonical_shipments ON canonical_shipments;
DROP TRIGGER IF EXISTS trg_history_shipment_packs ON shipment_packs;
DROP TRIGGER IF EXISTS trg_history_canonical_invoices ON canonical_invoices;
DROP TRIGGER IF EXISTS trg_history_canonical_returns ON canonical_returns;
DROP TRIGGER IF EXISTS trg_history_order_sagas ON order_sagas;
DROP TRIGGER IF EXISTS trg_history_message_log ON message_log;
DROP TRIGGER IF EXISTS trg_history_routing_rules ON routing_rules;
DROP TRIGGER IF EXISTS trg_history_mapping_configs ON mapping_configs;
DROP TRIGGER IF EXISTS trg_history_calendar_entries ON calendar_entries;
DROP TRIGGER IF EXISTS trg_history_operational_profile ON operational_profile;
DROP TRIGGER IF EXISTS trg_history_escalation_rules ON escalation_rules;
DROP TRIGGER IF EXISTS trg_history_escalation_log ON escalation_log;
DROP TRIGGER IF EXISTS trg_history_resync_requests ON resync_requests;
DROP TRIGGER IF EXISTS trg_history_resync_items ON resync_items;
DROP TRIGGER IF EXISTS trg_history_item_master ON item_master;
DROP TRIGGER IF EXISTS trg_history_rate_cards ON rate_cards;
DROP TRIGGER IF EXISTS trg_history_webhook_subscriptions ON webhook_subscriptions;
DROP TRIGGER IF EXISTS trg_history_barcode_configs ON barcode_configs;
DROP TRIGGER IF EXISTS trg_history_ai_fix_log ON ai_fix_log;

-- Drop additional indexes
DROP INDEX IF EXISTS idx_history_operation;
DROP INDEX IF EXISTS idx_history_created_at;
DROP INDEX IF EXISTS idx_history_changed_by;
DROP INDEX IF EXISTS idx_history_correlation;

-- Drop the trigger function
DROP FUNCTION IF EXISTS record_history_trigger();
