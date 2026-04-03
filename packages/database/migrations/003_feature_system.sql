-- migrate:up
-- FactoryConnect Migration 003: Feature Flags + App Config Defaults
-- Dual-level feature flags: platform (feature_flags) + factory (factory_preferences)
-- C10: Evaluation order: platform flag first, then factory preference

-- ═══════════════════════════════════════════════════════════════════
-- FEATURE FLAGS TABLE (platform-level, FC admin managed)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE feature_flags (
  flag_name VARCHAR(100) PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_feature_flags
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- FACTORY PREFERENCES TABLE (per-tenant overrides)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE factory_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  flag_name VARCHAR(100) NOT NULL REFERENCES feature_flags(flag_name) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, flag_name)
);

ALTER TABLE factory_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON factory_preferences
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE TRIGGER set_updated_at_factory_preferences
  BEFORE UPDATE ON factory_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- History trigger for factory_preferences
CREATE TRIGGER trg_history_factory_preferences
  AFTER INSERT OR UPDATE OR DELETE ON factory_preferences
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- ═══════════════════════════════════════════════════════════════════
-- IMPERSONATION SESSIONS (FC admin "Act As" factory)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fc_operator_id VARCHAR(255) NOT NULL,
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  actions_performed INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impersonation_factory ON impersonation_sessions(factory_id);
CREATE INDEX idx_impersonation_operator ON impersonation_sessions(fc_operator_id);

-- ═══════════════════════════════════════════════════════════════════
-- DEFAULT FEATURE FLAGS
-- ═══════════════════════════════════════════════════════════════════

-- Functional features (enabled by default)
INSERT INTO feature_flags (flag_name, is_enabled, description) VALUES
  ('order_processing', TRUE, 'Core order processing pipeline'),
  ('shipment_tracking', TRUE, 'Shipment creation and ASN generation'),
  ('invoice_generation', TRUE, 'Invoice creation and sending'),
  ('edi_as2_transport', TRUE, 'EDI X12 via AS2 transport protocol'),
  ('cxml_transport', TRUE, 'cXML via HTTPS transport'),
  ('rest_api_transport', TRUE, 'REST API transport for Coupa etc.'),
  ('audit_logging', TRUE, 'Immutable audit log with hash chain'),
  ('record_history', TRUE, 'Full record history tracking'),
  ('resync_engine', TRUE, 'Bulk resync request processing'),
  ('escalation_engine', TRUE, 'SLA monitoring and escalation'),
  ('notification_email', TRUE, 'Email notifications'),
  ('calendar_sync', TRUE, 'Factory calendar and holiday sync'),
  ('item_master_sync', TRUE, 'Item/SKU master data synchronization'),
  ('rate_card_validation', TRUE, 'Price validation against rate cards'),
  ('webhook_delivery', TRUE, 'Outbound webhook event delivery'),

  -- Preference features (enabled, factories can opt out)
  ('adaptive_polling', TRUE, 'Adaptive polling intervals based on factory activity'),
  ('llm_field_mapping', TRUE, 'AI-assisted field mapping suggestions'),
  ('llm_error_fix', TRUE, 'AI-assisted error diagnosis and fix'),
  ('barcode_generation', TRUE, 'GS1-128/SSCC barcode generation'),

  -- Coming-soon features (disabled by default)
  ('sms_notifications', FALSE, 'SMS notifications via Twilio/MSG91'),
  ('whatsapp_notifications', FALSE, 'WhatsApp Business API notifications'),
  ('returns_processing', FALSE, 'Returns/RMA processing'),
  ('partner_referrals', FALSE, 'Partner referral and commission system'),
  ('multi_currency', FALSE, 'Multi-currency conversion support'),
  ('advanced_analytics', FALSE, 'Advanced analytics dashboard');

-- ═══════════════════════════════════════════════════════════════════
-- DEFAULT APP CONFIG VALUES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO app_config (config_key, config_value, description) VALUES
  -- Outbox & Saga
  ('outbox_poll_interval_ms', '5000'::jsonb, 'Outbox polling interval in milliseconds'),
  ('saga_poll_interval_ms', '60000'::jsonb, 'Saga coordinator poll interval in milliseconds'),
  ('worker_heartbeat_interval_ms', '120000'::jsonb, 'Worker heartbeat interval in milliseconds'),
  ('worker_lock_duration_ms', '300000'::jsonb, 'Worker lock duration in milliseconds'),

  -- Retry & Circuit Breaker
  ('max_retry_attempts', '5'::jsonb, 'Maximum retry attempts for failed operations'),
  ('retry_backoff_ms', '1000'::jsonb, 'Base retry backoff in milliseconds'),
  ('circuit_breaker_threshold', '5'::jsonb, 'Failure count to open circuit'),
  ('circuit_breaker_timeout_ms', '30000'::jsonb, 'Circuit breaker half-open timeout'),
  ('circuit_breaker_reset_ms', '60000'::jsonb, 'Circuit breaker reset timeout'),

  -- Pagination
  ('default_page_size', '25'::jsonb, 'Default pagination page size'),
  ('max_page_size', '100'::jsonb, 'Maximum pagination page size'),

  -- AI / LLM
  ('llm_cache_hit_target', '0.87'::jsonb, 'Target LLM cache hit ratio'),
  ('llm_monthly_budget_usd', '500'::jsonb, 'Monthly LLM API budget in USD'),
  ('llm_fallback_order', '"claude,gemini,gpt,local"'::jsonb, 'LLM provider fallback order'),

  -- Claim Check
  ('claim_check_threshold_bytes', '262144'::jsonb, 'Claim-check threshold (256KB)'),

  -- Data Retention
  ('retention_warning_days', '30'::jsonb, 'Days before data retention warning'),
  ('audit_log_retention_days', '2555'::jsonb, 'Audit log retention in days (7 years)'),
  ('message_log_retention_days', '365'::jsonb, 'Message log retention in days'),

  -- Adaptive Polling
  ('adaptive_poll_min_ms', '5000'::jsonb, 'Minimum adaptive poll interval'),
  ('adaptive_poll_max_ms', '300000'::jsonb, 'Maximum adaptive poll interval (5 min)'),
  ('adaptive_poll_busy_ms', '5000'::jsonb, 'Adaptive poll interval when busy'),
  ('adaptive_poll_normal_ms', '30000'::jsonb, 'Adaptive poll interval during normal hours'),
  ('adaptive_poll_quiet_ms', '120000'::jsonb, 'Adaptive poll interval during quiet hours'),
  ('adaptive_poll_idle_ms', '300000'::jsonb, 'Adaptive poll interval when idle'),

  -- SLA Defaults
  ('sla_ack_deadline_hours', '4'::jsonb, 'Default SLA for PO acknowledgment'),
  ('sla_ship_deadline_hours', '48'::jsonb, 'Default SLA for shipment after confirmation'),
  ('sla_invoice_deadline_hours', '24'::jsonb, 'Default SLA for invoice after shipment');


-- migrate:down

DROP TABLE IF EXISTS impersonation_sessions;
DROP TABLE IF EXISTS factory_preferences;
DROP TABLE IF EXISTS feature_flags;

DELETE FROM app_config WHERE config_key IN (
  'outbox_poll_interval_ms', 'saga_poll_interval_ms',
  'worker_heartbeat_interval_ms', 'worker_lock_duration_ms',
  'max_retry_attempts', 'retry_backoff_ms',
  'circuit_breaker_threshold', 'circuit_breaker_timeout_ms', 'circuit_breaker_reset_ms',
  'default_page_size', 'max_page_size',
  'llm_cache_hit_target', 'llm_monthly_budget_usd', 'llm_fallback_order',
  'claim_check_threshold_bytes',
  'retention_warning_days', 'audit_log_retention_days', 'message_log_retention_days',
  'adaptive_poll_min_ms', 'adaptive_poll_max_ms',
  'adaptive_poll_busy_ms', 'adaptive_poll_normal_ms',
  'adaptive_poll_quiet_ms', 'adaptive_poll_idle_ms',
  'sla_ack_deadline_hours', 'sla_ship_deadline_hours', 'sla_invoice_deadline_hours'
);
