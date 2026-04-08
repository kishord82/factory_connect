-- migrate:up
-- FactoryConnect CA Platform Schema
-- CA firm tenants with staff, clients, compliance filings, reconciliation, notices
-- 14 tables with RLS scoped to ca_firm_id, record_history triggers, indexes

-- ═══════════════════════════════════════════════════════════════════
-- CUSTOM TYPES FOR CA PLATFORM
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE filing_status AS ENUM (
  'pending', 'in_progress', 'completed', 'failed', 'review_pending', 'rejected'
);

CREATE TYPE compliance_severity AS ENUM (
  'critical', 'high', 'medium', 'low', 'info'
);

CREATE TYPE exception_status AS ENUM (
  'open', 'acknowledged', 'in_progress', 'resolved', 'escalated'
);

CREATE TYPE reconciliation_status AS ENUM (
  'pending', 'in_progress', 'completed', 'partial_match', 'failed'
);

CREATE TYPE match_status AS ENUM (
  'matched', 'unmatched_source', 'unmatched_target', 'variance', 'manual_review'
);

CREATE TYPE document_request_status AS ENUM (
  'pending', 'sent', 'received', 'verified', 'expired', 'cancelled'
);

CREATE TYPE notice_status AS ENUM (
  'received', 'acknowledged', 'in_progress', 'resolved', 'escalated', 'closed'
);

CREATE TYPE notice_priority AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE staff_role AS ENUM (
  'partner', 'manager', 'staff'
);

CREATE TYPE ca_subscription_tier AS ENUM (
  'trial', 'starter', 'professional', 'enterprise'
);

-- ═══════════════════════════════════════════════════════════════════
-- CA FIRM TENANTS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE ca_firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  gst_number VARCHAR(15) NOT NULL UNIQUE,
  subscription_tier ca_subscription_tier NOT NULL DEFAULT 'trial',
  max_clients INT NOT NULL DEFAULT 20,
  owner_user_id UUID NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ca_firms_owner_user_id ON ca_firms(owner_user_id);
CREATE INDEX idx_ca_firms_subscription_tier ON ca_firms(subscription_tier);

-- Enable RLS on ca_firms
ALTER TABLE ca_firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ca_firms
  USING (id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- CA FIRM STAFF
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE ca_firm_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role staff_role NOT NULL,
  assigned_clients UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ca_firm_staff_ca_firm_id ON ca_firm_staff(ca_firm_id);
CREATE INDEX idx_ca_firm_staff_user_id ON ca_firm_staff(user_id);
CREATE INDEX idx_ca_firm_staff_is_active ON ca_firm_staff(is_active);

ALTER TABLE ca_firm_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ca_firm_staff
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- CA CLIENTS (MANAGED BUSINESSES)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE ca_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  factory_id UUID,
  business_name VARCHAR(255) NOT NULL,
  gstin_encrypted TEXT,
  pan_encrypted TEXT,
  business_type VARCHAR(50),
  industry VARCHAR(100),
  annual_turnover_bracket VARCHAR(50),
  tally_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  bridge_agent_id UUID,
  primary_contact_name VARCHAR(255),
  primary_contact_phone VARCHAR(20),
  primary_contact_email VARCHAR(255),
  whatsapp_number VARCHAR(20),
  preferred_channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  assigned_staff_id UUID REFERENCES ca_firm_staff(id),
  settings JSONB NOT NULL DEFAULT '{}',
  health_score NUMERIC(3, 1),
  health_score_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ca_clients_ca_firm_id ON ca_clients(ca_firm_id);
CREATE INDEX idx_ca_clients_factory_id ON ca_clients(factory_id);
CREATE INDEX idx_ca_clients_assigned_staff_id ON ca_clients(assigned_staff_id);
CREATE INDEX idx_ca_clients_tally_status ON ca_clients(tally_status);

ALTER TABLE ca_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ca_clients
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- COMPLIANCE FILINGS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE compliance_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ca_clients(id) ON DELETE CASCADE,
  filing_type VARCHAR(50) NOT NULL,
  period VARCHAR(20) NOT NULL,
  status filing_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  filed_date DATE,
  data_snapshot JSONB,
  validation_results JSONB,
  exceptions JSONB DEFAULT '[]',
  filed_reference VARCHAR(100),
  prepared_by UUID,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_filings_ca_firm_id ON compliance_filings(ca_firm_id);
CREATE INDEX idx_compliance_filings_client_id ON compliance_filings(client_id);
CREATE INDEX idx_compliance_filings_status ON compliance_filings(status);
CREATE INDEX idx_compliance_filings_due_date ON compliance_filings(due_date);
CREATE INDEX idx_compliance_filings_filing_type ON compliance_filings(filing_type);

ALTER TABLE compliance_filings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON compliance_filings
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- COMPLIANCE EXCEPTIONS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE compliance_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filing_id UUID NOT NULL REFERENCES compliance_filings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ca_clients(id) ON DELETE CASCADE,
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  exception_type VARCHAR(50) NOT NULL,
  severity compliance_severity NOT NULL,
  description TEXT,
  source_data JSONB,
  suggested_fix TEXT,
  status exception_status NOT NULL DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_exceptions_ca_firm_id ON compliance_exceptions(ca_firm_id);
CREATE INDEX idx_compliance_exceptions_client_id ON compliance_exceptions(client_id);
CREATE INDEX idx_compliance_exceptions_filing_id ON compliance_exceptions(filing_id);
CREATE INDEX idx_compliance_exceptions_status ON compliance_exceptions(status);
CREATE INDEX idx_compliance_exceptions_severity ON compliance_exceptions(severity);

ALTER TABLE compliance_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON compliance_exceptions
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- RECONCILIATION SESSIONS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ca_clients(id) ON DELETE CASCADE,
  recon_type VARCHAR(50) NOT NULL,
  period VARCHAR(20) NOT NULL,
  status reconciliation_status NOT NULL DEFAULT 'pending',
  source_count INT,
  target_count INT,
  matched_count INT NOT NULL DEFAULT 0,
  unmatched_source INT NOT NULL DEFAULT 0,
  unmatched_target INT NOT NULL DEFAULT 0,
  variance_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_reconciliation_sessions_ca_firm_id ON reconciliation_sessions(ca_firm_id);
CREATE INDEX idx_reconciliation_sessions_client_id ON reconciliation_sessions(client_id);
CREATE INDEX idx_reconciliation_sessions_status ON reconciliation_sessions(status);
CREATE INDEX idx_reconciliation_sessions_recon_type ON reconciliation_sessions(recon_type);

ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON reconciliation_sessions
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- RECONCILIATION ITEMS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE reconciliation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
  source_record JSONB,
  target_record JSONB,
  match_status match_status,
  variance_amount NUMERIC(15, 2),
  variance_reason TEXT,
  resolution TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_items_session_id ON reconciliation_items(session_id);
CREATE INDEX idx_reconciliation_items_match_status ON reconciliation_items(match_status);

ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;
-- For reconciliation_items, we need to join through reconciliation_sessions to get ca_firm_id
CREATE POLICY tenant_isolation ON reconciliation_items
  USING (
    session_id IN (
      SELECT id FROM reconciliation_sessions
      WHERE ca_firm_id::TEXT = current_setting('app.current_tenant', true)
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- DOCUMENT REQUESTS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ca_clients(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL,
  description TEXT,
  due_date DATE,
  status document_request_status NOT NULL DEFAULT 'pending',
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  sent_at TIMESTAMPTZ,
  reminder_count INT NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  max_reminders INT NOT NULL DEFAULT 3,
  reminder_interval_days INT NOT NULL DEFAULT 3,
  received_at TIMESTAMPTZ,
  document_url TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_requests_ca_firm_id ON document_requests(ca_firm_id);
CREATE INDEX idx_document_requests_client_id ON document_requests(client_id);
CREATE INDEX idx_document_requests_status ON document_requests(status);
CREATE INDEX idx_document_requests_due_date ON document_requests(due_date);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_requests
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- DOCUMENT TEMPLATES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID REFERENCES ca_firms(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body_template TEXT NOT NULL,
  variables JSONB,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_templates_ca_firm_id ON document_templates(ca_firm_id);
CREATE INDEX idx_document_templates_template_type ON document_templates(template_type);
CREATE INDEX idx_document_templates_channel ON document_templates(channel);

-- document_templates can be NULL for ca_firm_id (system-wide defaults)
-- Only filter by ca_firm_id if it's set
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_templates
  USING (ca_firm_id IS NULL OR ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- NOTICES & DEMANDS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ca_clients(id) ON DELETE CASCADE,
  notice_type VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  issuing_authority VARCHAR(255),
  received_date DATE,
  response_due_date DATE,
  amount_demanded NUMERIC(15, 2),
  status notice_status NOT NULL DEFAULT 'received',
  priority notice_priority NOT NULL DEFAULT 'medium',
  description TEXT,
  document_url TEXT,
  response_document_url TEXT,
  assigned_to UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notices_ca_firm_id ON notices(ca_firm_id);
CREATE INDEX idx_notices_client_id ON notices(client_id);
CREATE INDEX idx_notices_status ON notices(status);
CREATE INDEX idx_notices_response_due_date ON notices(response_due_date);
CREATE INDEX idx_notices_priority ON notices(priority);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notices
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- CLIENT HEALTH SCORES (HISTORY)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE client_health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ca_clients(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,
  overall_score NUMERIC(3, 1),
  compliance_score NUMERIC(3, 1),
  financial_score NUMERIC(3, 1),
  data_quality_score NUMERIC(3, 1),
  attention_needed BOOLEAN NOT NULL DEFAULT false,
  risk_factors JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_health_scores_ca_firm_id ON client_health_scores(ca_firm_id);
CREATE INDEX idx_client_health_scores_client_id ON client_health_scores(client_id);
CREATE INDEX idx_client_health_scores_score_date ON client_health_scores(score_date);

ALTER TABLE client_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON client_health_scores
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- STAFF ACTIVITY LOG
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE staff_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES ca_firm_staff(id) ON DELETE CASCADE,
  client_id UUID,
  activity_type VARCHAR(100) NOT NULL,
  duration_minutes INT,
  description TEXT,
  activity_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_activity_log_ca_firm_id ON staff_activity_log(ca_firm_id);
CREATE INDEX idx_staff_activity_log_staff_id ON staff_activity_log(staff_id);
CREATE INDEX idx_staff_activity_log_client_id ON staff_activity_log(client_id);
CREATE INDEX idx_staff_activity_log_activity_date ON staff_activity_log(activity_date);

ALTER TABLE staff_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_activity_log
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- COMMUNICATION LOG
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE communication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_firm_id UUID NOT NULL REFERENCES ca_firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ca_clients(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  message_type VARCHAR(50),
  template_id UUID,
  content TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  external_id VARCHAR(100),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_communication_log_ca_firm_id ON communication_log(ca_firm_id);
CREATE INDEX idx_communication_log_client_id ON communication_log(client_id);
CREATE INDEX idx_communication_log_status ON communication_log(status);
CREATE INDEX idx_communication_log_channel ON communication_log(channel);

ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON communication_log
  USING (ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- SUBSCRIPTION TIERS (SYSTEM-WIDE, NO RLS)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  max_clients INT NOT NULL,
  price_per_client_monthly NUMERIC(10, 2),
  base_price_monthly NUMERIC(10, 2),
  features JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ═══════════════════════════════════════════════════════════════════
-- INSERT DEFAULT SUBSCRIPTION TIERS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO subscription_tiers (id, name, max_clients, features, description, is_active)
VALUES
  (
    'trial',
    'Trial',
    5,
    '["F1", "F2", "F5", "F17"]',
    'Free trial with basic features',
    true
  ),
  (
    'starter',
    'Starter',
    50,
    '["F1", "F2", "F3", "F5", "F11", "F12", "F13", "F17"]',
    'Starter tier with expanded features',
    true
  ),
  (
    'professional',
    'Professional',
    200,
    '["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17"]',
    'Professional tier with all Tier 1 and Tier 2 features',
    true
  ),
  (
    'enterprise',
    'Enterprise',
    2147483647,
    '["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17"]',
    'Enterprise tier with unlimited clients and all features',
    true
  );

-- ═══════════════════════════════════════════════════════════════════
-- INSERT DEFAULT DOCUMENT TEMPLATES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO document_templates (ca_firm_id, template_type, channel, name, subject, body_template, variables, language, is_active)
VALUES
  (
    NULL,
    'doc_request',
    'whatsapp',
    'Document Request - WhatsApp',
    NULL,
    'Hi {{client_name}}, we need {{document_type}} for {{period}}. Due date: {{due_date}}. Please share at your earliest convenience.',
    '["client_name", "document_type", "period", "due_date"]',
    'en',
    true
  ),
  (
    NULL,
    'doc_reminder',
    'whatsapp',
    'Document Reminder - WhatsApp',
    NULL,
    'Reminder: {{document_type}} is still pending. Due date: {{due_date}}. Please share ASAP.',
    '["document_type", "due_date"]',
    'en',
    true
  ),
  (
    NULL,
    'filing_alert',
    'whatsapp',
    'Filing Alert - WhatsApp',
    NULL,
    '{{filing_type}} for {{period}} is due on {{due_date}}. Status: {{status}}',
    '["filing_type", "period", "due_date", "status"]',
    'en',
    true
  ),
  (
    NULL,
    'notice_alert',
    'whatsapp',
    'Notice Alert - WhatsApp',
    NULL,
    'Urgent: Notice {{reference_number}} from {{issuing_authority}} received. Response due: {{response_due_date}}. Amount: {{amount}}',
    '["reference_number", "issuing_authority", "response_due_date", "amount"]',
    'en',
    true
  ),
  (
    NULL,
    'acknowledgment',
    'whatsapp',
    'Acknowledgment - WhatsApp',
    NULL,
    'Thank you {{client_name}}. We received {{item_type}}. We will process and confirm shortly.',
    '["client_name", "item_type"]',
    'en',
    true
  );

-- ═══════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables with updated_at column
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON ca_firms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON ca_clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON compliance_filings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON notices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- RECORD HISTORY TRIGGERS FOR CA PLATFORM TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Create history triggers for all CA tenant-scoped tables
CREATE TRIGGER trg_history_ca_firms
  AFTER INSERT OR UPDATE OR DELETE ON ca_firms
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_ca_firm_staff
  AFTER INSERT OR UPDATE OR DELETE ON ca_firm_staff
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_ca_clients
  AFTER INSERT OR UPDATE OR DELETE ON ca_clients
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_compliance_filings
  AFTER INSERT OR UPDATE OR DELETE ON compliance_filings
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_compliance_exceptions
  AFTER INSERT OR UPDATE OR DELETE ON compliance_exceptions
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_reconciliation_sessions
  AFTER INSERT OR UPDATE OR DELETE ON reconciliation_sessions
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_reconciliation_items
  AFTER INSERT OR UPDATE OR DELETE ON reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_document_requests
  AFTER INSERT OR UPDATE OR DELETE ON document_requests
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_document_templates
  AFTER INSERT OR UPDATE OR DELETE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_notices
  AFTER INSERT OR UPDATE OR DELETE ON notices
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_client_health_scores
  AFTER INSERT OR UPDATE OR DELETE ON client_health_scores
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_staff_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON staff_activity_log
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_communication_log
  AFTER INSERT OR UPDATE OR DELETE ON communication_log
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

-- ═══════════════════════════════════════════════════════════════════
-- GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON ca_firms TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ca_firm_staff TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ca_clients TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_filings TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_exceptions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON reconciliation_sessions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON reconciliation_items TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_requests TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_templates TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON notices TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_health_scores TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_activity_log TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON communication_log TO postgres;
GRANT SELECT ON subscription_tiers TO postgres;

-- migrate:down
-- Drop in reverse dependency order

-- Drop history triggers
DROP TRIGGER IF EXISTS trg_history_communication_log ON communication_log;
DROP TRIGGER IF EXISTS trg_history_staff_activity_log ON staff_activity_log;
DROP TRIGGER IF EXISTS trg_history_client_health_scores ON client_health_scores;
DROP TRIGGER IF EXISTS trg_history_notices ON notices;
DROP TRIGGER IF EXISTS trg_history_document_templates ON document_templates;
DROP TRIGGER IF EXISTS trg_history_document_requests ON document_requests;
DROP TRIGGER IF EXISTS trg_history_reconciliation_items ON reconciliation_items;
DROP TRIGGER IF EXISTS trg_history_reconciliation_sessions ON reconciliation_sessions;
DROP TRIGGER IF EXISTS trg_history_compliance_exceptions ON compliance_exceptions;
DROP TRIGGER IF EXISTS trg_history_compliance_filings ON compliance_filings;
DROP TRIGGER IF EXISTS trg_history_ca_clients ON ca_clients;
DROP TRIGGER IF EXISTS trg_history_ca_firm_staff ON ca_firm_staff;
DROP TRIGGER IF EXISTS trg_history_ca_firms ON ca_firms;

-- Drop updated_at triggers
DROP TRIGGER IF EXISTS trg_updated_at ON notices;
DROP TRIGGER IF EXISTS trg_updated_at ON compliance_filings;
DROP TRIGGER IF EXISTS trg_updated_at ON ca_clients;
DROP TRIGGER IF EXISTS trg_updated_at ON ca_firms;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS communication_log;
DROP TABLE IF EXISTS staff_activity_log;
DROP TABLE IF EXISTS client_health_scores;
DROP TABLE IF EXISTS notices;
DROP TABLE IF EXISTS document_templates;
DROP TABLE IF EXISTS document_requests;
DROP TABLE IF EXISTS reconciliation_items;
DROP TABLE IF EXISTS reconciliation_sessions;
DROP TABLE IF EXISTS compliance_exceptions;
DROP TABLE IF EXISTS compliance_filings;
DROP TABLE IF EXISTS ca_clients;
DROP TABLE IF EXISTS ca_firm_staff;
DROP TABLE IF EXISTS ca_firms;
DROP TABLE IF EXISTS subscription_tiers;

-- Drop custom types
DROP TYPE IF EXISTS ca_subscription_tier;
DROP TYPE IF EXISTS staff_role;
DROP TYPE IF EXISTS notice_priority;
DROP TYPE IF EXISTS notice_status;
DROP TYPE IF EXISTS document_request_status;
DROP TYPE IF EXISTS match_status;
DROP TYPE IF EXISTS reconciliation_status;
DROP TYPE IF EXISTS exception_status;
DROP TYPE IF EXISTS compliance_severity;
DROP TYPE IF EXISTS filing_status;
