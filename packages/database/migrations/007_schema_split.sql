-- migrate:up
-- FactoryConnect Migration 007: Schema Split
-- Reorganizes 53 tables across 7 PostgreSQL schemas:
-- - core: Factory management, connections, master data, catalogs
-- - orders: Order processing, shipments, invoices, returns
-- - workflow: Sagas, outbox, resync, routing, message log
-- - compliance: CA platform (14 tables with CA-specific RLS)
-- - audit: Audit log, record history, staff activity, impersonation
-- - ai: LLM caching, usage, fix logs, mapping configs
-- - platform: App config, feature flags, preferences, webhooks, notifications, relationships, partners, subscriptions

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: CREATE SCHEMAS
-- ═══════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS compliance;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS platform;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: MOVE TABLES TO CORE SCHEMA
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE factories SET SCHEMA core;
ALTER TABLE buyers SET SCHEMA core;
ALTER TABLE connections SET SCHEMA core;
ALTER TABLE item_master SET SCHEMA core;
ALTER TABLE rate_cards SET SCHEMA core;
ALTER TABLE connector_catalog SET SCHEMA core;
ALTER TABLE connector_requests SET SCHEMA core;
ALTER TABLE barcode_configs SET SCHEMA core;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: MOVE TABLES TO ORDERS SCHEMA
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE canonical_orders SET SCHEMA orders;
ALTER TABLE canonical_order_line_items SET SCHEMA orders;
ALTER TABLE canonical_shipments SET SCHEMA orders;
ALTER TABLE shipment_packs SET SCHEMA orders;
ALTER TABLE canonical_invoices SET SCHEMA orders;
ALTER TABLE canonical_returns SET SCHEMA orders;
ALTER TABLE message_log SET SCHEMA orders;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: MOVE TABLES TO WORKFLOW SCHEMA
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE order_sagas SET SCHEMA workflow;
ALTER TABLE outbox SET SCHEMA workflow;
ALTER TABLE resync_requests SET SCHEMA workflow;
ALTER TABLE resync_items SET SCHEMA workflow;
ALTER TABLE routing_rules SET SCHEMA workflow;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 5: MOVE TABLES TO COMPLIANCE SCHEMA
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE ca_firms SET SCHEMA compliance;
ALTER TABLE ca_firm_staff SET SCHEMA compliance;
ALTER TABLE ca_clients SET SCHEMA compliance;
ALTER TABLE compliance_filings SET SCHEMA compliance;
ALTER TABLE compliance_exceptions SET SCHEMA compliance;
ALTER TABLE reconciliation_sessions SET SCHEMA compliance;
ALTER TABLE reconciliation_items SET SCHEMA compliance;
ALTER TABLE document_requests SET SCHEMA compliance;
ALTER TABLE document_templates SET SCHEMA compliance;
ALTER TABLE notices SET SCHEMA compliance;
ALTER TABLE client_health_scores SET SCHEMA compliance;
ALTER TABLE communication_log SET SCHEMA compliance;
ALTER TABLE subscription_tiers SET SCHEMA compliance;
ALTER TABLE staff_activity_log SET SCHEMA compliance;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 6: MOVE TABLES TO AUDIT SCHEMA
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE audit_log SET SCHEMA audit;
ALTER TABLE record_history SET SCHEMA audit;
ALTER TABLE impersonation_sessions SET SCHEMA audit;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 7: MOVE TABLES TO AI SCHEMA
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE llm_cache SET SCHEMA ai;
ALTER TABLE llm_usage_log SET SCHEMA ai;
ALTER TABLE ai_fix_log SET SCHEMA ai;
ALTER TABLE mapping_configs SET SCHEMA ai;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 8: MOVE TABLES TO PLATFORM SCHEMA
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE app_config SET SCHEMA platform;
ALTER TABLE feature_flags SET SCHEMA platform;
ALTER TABLE factory_preferences SET SCHEMA platform;
ALTER TABLE notification_templates SET SCHEMA platform;
ALTER TABLE calendar_entries SET SCHEMA platform;
ALTER TABLE operational_profile SET SCHEMA platform;
ALTER TABLE escalation_rules SET SCHEMA platform;
ALTER TABLE escalation_log SET SCHEMA platform;
ALTER TABLE webhook_subscriptions SET SCHEMA platform;
ALTER TABLE webhook_deliveries SET SCHEMA platform;
ALTER TABLE relationship_registry SET SCHEMA platform;
ALTER TABLE partners SET SCHEMA platform;
ALTER TABLE partner_referrals SET SCHEMA platform;
ALTER TABLE commission_ledger SET SCHEMA platform;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 9: UPDATE FOREIGN KEY REFERENCES TO USE SCHEMA-QUALIFIED NAMES
-- ═══════════════════════════════════════════════════════════════════

-- Update FK constraints: buyers → factories
ALTER TABLE core.buyers
DROP CONSTRAINT buyers_factory_id_fkey,
ADD CONSTRAINT buyers_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: connections → factories, buyers
ALTER TABLE core.connections
DROP CONSTRAINT connections_factory_id_fkey,
DROP CONSTRAINT connections_buyer_id_fkey,
ADD CONSTRAINT connections_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT connections_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES core.buyers(id);

-- Update FK constraints: canonical_orders → factories, buyers, connections
ALTER TABLE orders.canonical_orders
DROP CONSTRAINT canonical_orders_factory_id_fkey,
DROP CONSTRAINT canonical_orders_buyer_id_fkey,
DROP CONSTRAINT canonical_orders_connection_id_fkey,
ADD CONSTRAINT canonical_orders_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT canonical_orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES core.buyers(id),
ADD CONSTRAINT canonical_orders_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);

-- Update FK constraints: canonical_order_line_items → canonical_orders, factories
ALTER TABLE orders.canonical_order_line_items
DROP CONSTRAINT canonical_order_line_items_order_id_fkey,
DROP CONSTRAINT canonical_order_line_items_factory_id_fkey,
ADD CONSTRAINT canonical_order_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id) ON DELETE CASCADE,
ADD CONSTRAINT canonical_order_line_items_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: canonical_shipments → factories, canonical_orders, connections
ALTER TABLE orders.canonical_shipments
DROP CONSTRAINT canonical_shipments_factory_id_fkey,
DROP CONSTRAINT canonical_shipments_order_id_fkey,
DROP CONSTRAINT canonical_shipments_connection_id_fkey,
ADD CONSTRAINT canonical_shipments_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT canonical_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id),
ADD CONSTRAINT canonical_shipments_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);

-- Update FK constraints: shipment_packs → canonical_shipments, factories
ALTER TABLE orders.shipment_packs
DROP CONSTRAINT shipment_packs_shipment_id_fkey,
DROP CONSTRAINT shipment_packs_factory_id_fkey,
ADD CONSTRAINT shipment_packs_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES orders.canonical_shipments(id) ON DELETE CASCADE,
ADD CONSTRAINT shipment_packs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: canonical_invoices → factories, canonical_orders, canonical_shipments, connections
ALTER TABLE orders.canonical_invoices
DROP CONSTRAINT canonical_invoices_factory_id_fkey,
DROP CONSTRAINT canonical_invoices_order_id_fkey,
DROP CONSTRAINT canonical_invoices_shipment_id_fkey,
DROP CONSTRAINT canonical_invoices_connection_id_fkey,
ADD CONSTRAINT canonical_invoices_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT canonical_invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id),
ADD CONSTRAINT canonical_invoices_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES orders.canonical_shipments(id),
ADD CONSTRAINT canonical_invoices_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);

-- Update FK constraints: canonical_returns → factories, canonical_orders, connections
ALTER TABLE orders.canonical_returns
DROP CONSTRAINT canonical_returns_factory_id_fkey,
DROP CONSTRAINT canonical_returns_order_id_fkey,
DROP CONSTRAINT canonical_returns_connection_id_fkey,
ADD CONSTRAINT canonical_returns_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT canonical_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id),
ADD CONSTRAINT canonical_returns_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);

-- Update FK constraints: order_sagas → canonical_orders, factories
ALTER TABLE workflow.order_sagas
DROP CONSTRAINT order_sagas_order_id_fkey,
DROP CONSTRAINT order_sagas_factory_id_fkey,
ADD CONSTRAINT order_sagas_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id),
ADD CONSTRAINT order_sagas_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: message_log → factories, connections, canonical_orders
ALTER TABLE orders.message_log
DROP CONSTRAINT message_log_factory_id_fkey,
DROP CONSTRAINT message_log_connection_id_fkey,
DROP CONSTRAINT message_log_order_id_fkey,
ADD CONSTRAINT message_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT message_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id),
ADD CONSTRAINT message_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id);

-- Update FK constraints: routing_rules → factories, connections
ALTER TABLE workflow.routing_rules
DROP CONSTRAINT routing_rules_factory_id_fkey,
DROP CONSTRAINT routing_rules_connection_id_fkey,
ADD CONSTRAINT routing_rules_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT routing_rules_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);

-- Update FK constraints: resync_requests → factories, connections
ALTER TABLE workflow.resync_requests
DROP CONSTRAINT resync_requests_factory_id_fkey,
DROP CONSTRAINT resync_requests_connection_id_fkey,
ADD CONSTRAINT resync_requests_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT resync_requests_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);

-- Update FK constraints: resync_items → resync_requests, factories, canonical_orders
ALTER TABLE workflow.resync_items
DROP CONSTRAINT resync_items_resync_id_fkey,
DROP CONSTRAINT resync_items_factory_id_fkey,
DROP CONSTRAINT resync_items_original_order_id_fkey,
ADD CONSTRAINT resync_items_resync_id_fkey FOREIGN KEY (resync_id) REFERENCES workflow.resync_requests(id) ON DELETE CASCADE,
ADD CONSTRAINT resync_items_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT resync_items_original_order_id_fkey FOREIGN KEY (original_order_id) REFERENCES orders.canonical_orders(id);

-- Update FK constraints: item_master → factories, buyers
ALTER TABLE core.item_master
DROP CONSTRAINT item_master_factory_id_fkey,
DROP CONSTRAINT item_master_buyer_id_fkey,
ADD CONSTRAINT item_master_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT item_master_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES core.buyers(id);

-- Update FK constraints: rate_cards → factories, buyers, item_master
ALTER TABLE core.rate_cards
DROP CONSTRAINT rate_cards_factory_id_fkey,
DROP CONSTRAINT rate_cards_buyer_id_fkey,
DROP CONSTRAINT rate_cards_item_id_fkey,
ADD CONSTRAINT rate_cards_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT rate_cards_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES core.buyers(id),
ADD CONSTRAINT rate_cards_item_id_fkey FOREIGN KEY (item_id) REFERENCES core.item_master(id);

-- Update FK constraints: webhook_subscriptions → factories
ALTER TABLE platform.webhook_subscriptions
DROP CONSTRAINT webhook_subscriptions_factory_id_fkey,
ADD CONSTRAINT webhook_subscriptions_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: webhook_deliveries → factories, webhook_subscriptions
ALTER TABLE platform.webhook_deliveries
DROP CONSTRAINT webhook_deliveries_factory_id_fkey,
DROP CONSTRAINT webhook_deliveries_subscription_id_fkey,
ADD CONSTRAINT webhook_deliveries_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT webhook_deliveries_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES platform.webhook_subscriptions(id) ON DELETE CASCADE;

-- Update FK constraints: barcode_configs → factories
ALTER TABLE core.barcode_configs
DROP CONSTRAINT barcode_configs_factory_id_fkey,
ADD CONSTRAINT barcode_configs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: calendar_entries → factories
ALTER TABLE platform.calendar_entries
DROP CONSTRAINT calendar_entries_factory_id_fkey,
ADD CONSTRAINT calendar_entries_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: operational_profile → factories
ALTER TABLE platform.operational_profile
DROP CONSTRAINT operational_profile_factory_id_fkey,
ADD CONSTRAINT operational_profile_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: escalation_rules → factories, notification_templates
ALTER TABLE platform.escalation_rules
DROP CONSTRAINT escalation_rules_factory_id_fkey,
DROP CONSTRAINT escalation_rules_template_id_fkey,
ADD CONSTRAINT escalation_rules_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT escalation_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES platform.notification_templates(id);

-- Update FK constraints: escalation_log → factories, connections
ALTER TABLE platform.escalation_log
DROP CONSTRAINT escalation_log_factory_id_fkey,
DROP CONSTRAINT escalation_log_connection_id_fkey,
ADD CONSTRAINT escalation_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT escalation_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);

-- Update FK constraints: mapping_configs → factories, connections
ALTER TABLE ai.mapping_configs
DROP CONSTRAINT mapping_configs_factory_id_fkey,
DROP CONSTRAINT mapping_configs_connection_id_fkey,
ADD CONSTRAINT mapping_configs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT mapping_configs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);

-- Update FK constraints: ai_fix_log → factories
ALTER TABLE ai.ai_fix_log
DROP CONSTRAINT ai_fix_log_factory_id_fkey,
ADD CONSTRAINT ai_fix_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);

-- Update FK constraints: factory_preferences → factories, feature_flags
ALTER TABLE platform.factory_preferences
DROP CONSTRAINT factory_preferences_tenant_id_fkey,
DROP CONSTRAINT factory_preferences_flag_name_fkey,
ADD CONSTRAINT factory_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES core.factories(id) ON DELETE CASCADE,
ADD CONSTRAINT factory_preferences_flag_name_fkey FOREIGN KEY (flag_name) REFERENCES platform.feature_flags(flag_name) ON DELETE CASCADE;

-- Update FK constraints: ca_firm_staff → ca_firms
ALTER TABLE compliance.ca_firm_staff
DROP CONSTRAINT ca_firm_staff_ca_firm_id_fkey,
ADD CONSTRAINT ca_firm_staff_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;

-- Update FK constraints: ca_clients → ca_firms, factories
ALTER TABLE compliance.ca_clients
DROP CONSTRAINT ca_clients_ca_firm_id_fkey,
DROP CONSTRAINT ca_clients_factory_id_fkey,
DROP CONSTRAINT ca_clients_assigned_staff_id_fkey,
ADD CONSTRAINT ca_clients_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT ca_clients_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id),
ADD CONSTRAINT ca_clients_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES compliance.ca_firm_staff(id);

-- Update FK constraints: compliance_filings → ca_firms, ca_clients
ALTER TABLE compliance.compliance_filings
DROP CONSTRAINT compliance_filings_ca_firm_id_fkey,
DROP CONSTRAINT compliance_filings_client_id_fkey,
ADD CONSTRAINT compliance_filings_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT compliance_filings_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;

-- Update FK constraints: compliance_exceptions → compliance_filings, ca_clients, ca_firms
ALTER TABLE compliance.compliance_exceptions
DROP CONSTRAINT compliance_exceptions_filing_id_fkey,
DROP CONSTRAINT compliance_exceptions_client_id_fkey,
DROP CONSTRAINT compliance_exceptions_ca_firm_id_fkey,
ADD CONSTRAINT compliance_exceptions_filing_id_fkey FOREIGN KEY (filing_id) REFERENCES compliance.compliance_filings(id) ON DELETE CASCADE,
ADD CONSTRAINT compliance_exceptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE,
ADD CONSTRAINT compliance_exceptions_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;

-- Update FK constraints: reconciliation_sessions → ca_firms, ca_clients
ALTER TABLE compliance.reconciliation_sessions
DROP CONSTRAINT reconciliation_sessions_ca_firm_id_fkey,
DROP CONSTRAINT reconciliation_sessions_client_id_fkey,
ADD CONSTRAINT reconciliation_sessions_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT reconciliation_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;

-- Update FK constraints: reconciliation_items → reconciliation_sessions
ALTER TABLE compliance.reconciliation_items
DROP CONSTRAINT reconciliation_items_session_id_fkey,
ADD CONSTRAINT reconciliation_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES compliance.reconciliation_sessions(id) ON DELETE CASCADE;

-- Update FK constraints: document_requests → ca_firms, ca_clients
ALTER TABLE compliance.document_requests
DROP CONSTRAINT document_requests_ca_firm_id_fkey,
DROP CONSTRAINT document_requests_client_id_fkey,
ADD CONSTRAINT document_requests_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT document_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;

-- Update FK constraints: document_templates → ca_firms
ALTER TABLE compliance.document_templates
DROP CONSTRAINT document_templates_ca_firm_id_fkey,
ADD CONSTRAINT document_templates_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;

-- Update FK constraints: notices → ca_firms, ca_clients
ALTER TABLE compliance.notices
DROP CONSTRAINT notices_ca_firm_id_fkey,
DROP CONSTRAINT notices_client_id_fkey,
ADD CONSTRAINT notices_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT notices_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;

-- Update FK constraints: client_health_scores → ca_firms, ca_clients
ALTER TABLE compliance.client_health_scores
DROP CONSTRAINT client_health_scores_ca_firm_id_fkey,
DROP CONSTRAINT client_health_scores_client_id_fkey,
ADD CONSTRAINT client_health_scores_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT client_health_scores_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;

-- Update FK constraints: staff_activity_log → ca_firms, ca_firm_staff
ALTER TABLE compliance.staff_activity_log
DROP CONSTRAINT staff_activity_log_ca_firm_id_fkey,
DROP CONSTRAINT staff_activity_log_staff_id_fkey,
ADD CONSTRAINT staff_activity_log_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT staff_activity_log_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES compliance.ca_firm_staff(id) ON DELETE CASCADE;

-- Update FK constraints: communication_log → ca_firms, ca_clients
ALTER TABLE compliance.communication_log
DROP CONSTRAINT communication_log_ca_firm_id_fkey,
DROP CONSTRAINT communication_log_client_id_fkey,
ADD CONSTRAINT communication_log_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT communication_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;

-- Update FK constraints: partner_referrals → partners, factories
ALTER TABLE platform.partner_referrals
DROP CONSTRAINT partner_referrals_partner_id_fkey,
DROP CONSTRAINT partner_referrals_factory_id_fkey,
ADD CONSTRAINT partner_referrals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES platform.partners(id) ON DELETE CASCADE,
ADD CONSTRAINT partner_referrals_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id) ON DELETE CASCADE;

-- Update FK constraints: commission_ledger → partners, factories
ALTER TABLE platform.commission_ledger
DROP CONSTRAINT commission_ledger_partner_id_fkey,
DROP CONSTRAINT commission_ledger_factory_id_fkey,
ADD CONSTRAINT commission_ledger_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES platform.partners(id) ON DELETE CASCADE,
ADD CONSTRAINT commission_ledger_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id) ON DELETE CASCADE;

-- Update FK constraints: impersonation_sessions → factories
ALTER TABLE audit.impersonation_sessions
DROP CONSTRAINT impersonation_sessions_factory_id_fkey,
ADD CONSTRAINT impersonation_sessions_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 10: UPDATE RLS POLICIES TO USE SCHEMA-QUALIFIED TABLE NAMES
-- ═══════════════════════════════════════════════════════════════════

-- Drop and recreate RLS policies with schema-qualified references
-- These policies reference other schema-qualified tables in their conditions

DROP POLICY IF EXISTS tenant_isolation ON compliance.reconciliation_items;
CREATE POLICY tenant_isolation ON compliance.reconciliation_items
  USING (
    session_id IN (
      SELECT id FROM compliance.reconciliation_sessions
      WHERE ca_firm_id::TEXT = current_setting('app.current_tenant', true)
    )
  );

DROP POLICY IF EXISTS tenant_isolation ON compliance.document_templates;
CREATE POLICY tenant_isolation ON compliance.document_templates
  USING (ca_firm_id IS NULL OR ca_firm_id::TEXT = current_setting('app.current_tenant', true));

-- ═══════════════════════════════════════════════════════════════════
-- STEP 11: UPDATE INDEXES (ALREADY SCHEMA-QUALIFIED AFTER TABLE MOVE)
-- ═══════════════════════════════════════════════════════════════════

-- Indexes are automatically moved with their tables. No action needed.
-- All indexes on tables in core schema are now under core schema, etc.

-- ═══════════════════════════════════════════════════════════════════
-- STEP 12: UPDATE TRIGGER REFERENCES (ALREADY QUALIFIED)
-- ═══════════════════════════════════════════════════════════════════

-- All triggers are automatically moved with their tables.
-- No action needed for trigger qualification.

-- ═══════════════════════════════════════════════════════════════════
-- STEP 13: GRANT SCHEMA PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA core TO postgres;
GRANT USAGE ON SCHEMA orders TO postgres;
GRANT USAGE ON SCHEMA workflow TO postgres;
GRANT USAGE ON SCHEMA compliance TO postgres;
GRANT USAGE ON SCHEMA audit TO postgres;
GRANT USAGE ON SCHEMA ai TO postgres;
GRANT USAGE ON SCHEMA platform TO postgres;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA core TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA orders TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA workflow TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA compliance TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO postgres;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA core TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA orders TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA workflow TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA compliance TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ai TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO postgres;

GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA core TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA orders TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA workflow TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA compliance TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA audit TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA ai TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA platform TO postgres;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 14: UPDATE SEARCH_PATH (APPLICATION LEVEL)
-- ═══════════════════════════════════════════════════════════════════

-- NOTE: Applications should be updated to use schema-qualified table names
-- or set search_path at connection time:
-- SET search_path TO core, orders, workflow, compliance, audit, ai, platform, public;
-- This migration does NOT set search_path permanently; applications must handle it.

-- migrate:down

-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK: MOVE ALL TABLES BACK TO PUBLIC SCHEMA
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Update all foreign key constraints to reference public schema
-- (This must be done before moving tables back)

-- Update FK: buyers → factories
ALTER TABLE core.buyers
DROP CONSTRAINT buyers_factory_id_fkey,
ADD CONSTRAINT buyers_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: connections → factories, buyers
ALTER TABLE core.connections
DROP CONSTRAINT connections_factory_id_fkey,
DROP CONSTRAINT connections_buyer_id_fkey,
ADD CONSTRAINT connections_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT connections_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES buyers(id);

-- Update FK: canonical_orders → factories, buyers, connections
ALTER TABLE orders.canonical_orders
DROP CONSTRAINT canonical_orders_factory_id_fkey,
DROP CONSTRAINT canonical_orders_buyer_id_fkey,
DROP CONSTRAINT canonical_orders_connection_id_fkey,
ADD CONSTRAINT canonical_orders_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT canonical_orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES buyers(id),
ADD CONSTRAINT canonical_orders_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);

-- Update FK: canonical_order_line_items → canonical_orders, factories
ALTER TABLE orders.canonical_order_line_items
DROP CONSTRAINT canonical_order_line_items_order_id_fkey,
DROP CONSTRAINT canonical_order_line_items_factory_id_fkey,
ADD CONSTRAINT canonical_order_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES canonical_orders(id) ON DELETE CASCADE,
ADD CONSTRAINT canonical_order_line_items_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: canonical_shipments → factories, canonical_orders, connections
ALTER TABLE orders.canonical_shipments
DROP CONSTRAINT canonical_shipments_factory_id_fkey,
DROP CONSTRAINT canonical_shipments_order_id_fkey,
DROP CONSTRAINT canonical_shipments_connection_id_fkey,
ADD CONSTRAINT canonical_shipments_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT canonical_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES canonical_orders(id),
ADD CONSTRAINT canonical_shipments_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);

-- Update FK: shipment_packs → canonical_shipments, factories
ALTER TABLE orders.shipment_packs
DROP CONSTRAINT shipment_packs_shipment_id_fkey,
DROP CONSTRAINT shipment_packs_factory_id_fkey,
ADD CONSTRAINT shipment_packs_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES canonical_shipments(id) ON DELETE CASCADE,
ADD CONSTRAINT shipment_packs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: canonical_invoices → factories, canonical_orders, canonical_shipments, connections
ALTER TABLE orders.canonical_invoices
DROP CONSTRAINT canonical_invoices_factory_id_fkey,
DROP CONSTRAINT canonical_invoices_order_id_fkey,
DROP CONSTRAINT canonical_invoices_shipment_id_fkey,
DROP CONSTRAINT canonical_invoices_connection_id_fkey,
ADD CONSTRAINT canonical_invoices_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT canonical_invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES canonical_orders(id),
ADD CONSTRAINT canonical_invoices_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES canonical_shipments(id),
ADD CONSTRAINT canonical_invoices_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);

-- Update FK: canonical_returns → factories, canonical_orders, connections
ALTER TABLE orders.canonical_returns
DROP CONSTRAINT canonical_returns_factory_id_fkey,
DROP CONSTRAINT canonical_returns_order_id_fkey,
DROP CONSTRAINT canonical_returns_connection_id_fkey,
ADD CONSTRAINT canonical_returns_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT canonical_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES canonical_orders(id),
ADD CONSTRAINT canonical_returns_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);

-- Update FK: order_sagas → canonical_orders, factories
ALTER TABLE workflow.order_sagas
DROP CONSTRAINT order_sagas_order_id_fkey,
DROP CONSTRAINT order_sagas_factory_id_fkey,
ADD CONSTRAINT order_sagas_order_id_fkey FOREIGN KEY (order_id) REFERENCES canonical_orders(id),
ADD CONSTRAINT order_sagas_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: message_log → factories, connections, canonical_orders
ALTER TABLE orders.message_log
DROP CONSTRAINT message_log_factory_id_fkey,
DROP CONSTRAINT message_log_connection_id_fkey,
DROP CONSTRAINT message_log_order_id_fkey,
ADD CONSTRAINT message_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT message_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id),
ADD CONSTRAINT message_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES canonical_orders(id);

-- Update FK: routing_rules → factories, connections
ALTER TABLE workflow.routing_rules
DROP CONSTRAINT routing_rules_factory_id_fkey,
DROP CONSTRAINT routing_rules_connection_id_fkey,
ADD CONSTRAINT routing_rules_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT routing_rules_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);

-- Update FK: resync_requests → factories, connections
ALTER TABLE workflow.resync_requests
DROP CONSTRAINT resync_requests_factory_id_fkey,
DROP CONSTRAINT resync_requests_connection_id_fkey,
ADD CONSTRAINT resync_requests_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT resync_requests_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);

-- Update FK: resync_items → resync_requests, factories, canonical_orders
ALTER TABLE workflow.resync_items
DROP CONSTRAINT resync_items_resync_id_fkey,
DROP CONSTRAINT resync_items_factory_id_fkey,
DROP CONSTRAINT resync_items_original_order_id_fkey,
ADD CONSTRAINT resync_items_resync_id_fkey FOREIGN KEY (resync_id) REFERENCES resync_requests(id) ON DELETE CASCADE,
ADD CONSTRAINT resync_items_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT resync_items_original_order_id_fkey FOREIGN KEY (original_order_id) REFERENCES canonical_orders(id);

-- Update FK: item_master → factories, buyers
ALTER TABLE core.item_master
DROP CONSTRAINT item_master_factory_id_fkey,
DROP CONSTRAINT item_master_buyer_id_fkey,
ADD CONSTRAINT item_master_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT item_master_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES buyers(id);

-- Update FK: rate_cards → factories, buyers, item_master
ALTER TABLE core.rate_cards
DROP CONSTRAINT rate_cards_factory_id_fkey,
DROP CONSTRAINT rate_cards_buyer_id_fkey,
DROP CONSTRAINT rate_cards_item_id_fkey,
ADD CONSTRAINT rate_cards_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT rate_cards_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES buyers(id),
ADD CONSTRAINT rate_cards_item_id_fkey FOREIGN KEY (item_id) REFERENCES item_master(id);

-- Update FK: webhook_subscriptions → factories
ALTER TABLE platform.webhook_subscriptions
DROP CONSTRAINT webhook_subscriptions_factory_id_fkey,
ADD CONSTRAINT webhook_subscriptions_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: webhook_deliveries → factories, webhook_subscriptions
ALTER TABLE platform.webhook_deliveries
DROP CONSTRAINT webhook_deliveries_factory_id_fkey,
DROP CONSTRAINT webhook_deliveries_subscription_id_fkey,
ADD CONSTRAINT webhook_deliveries_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT webhook_deliveries_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE;

-- Update FK: barcode_configs → factories
ALTER TABLE core.barcode_configs
DROP CONSTRAINT barcode_configs_factory_id_fkey,
ADD CONSTRAINT barcode_configs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: calendar_entries → factories
ALTER TABLE platform.calendar_entries
DROP CONSTRAINT calendar_entries_factory_id_fkey,
ADD CONSTRAINT calendar_entries_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: operational_profile → factories
ALTER TABLE platform.operational_profile
DROP CONSTRAINT operational_profile_factory_id_fkey,
ADD CONSTRAINT operational_profile_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: escalation_rules → factories, notification_templates
ALTER TABLE platform.escalation_rules
DROP CONSTRAINT escalation_rules_factory_id_fkey,
DROP CONSTRAINT escalation_rules_template_id_fkey,
ADD CONSTRAINT escalation_rules_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT escalation_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES notification_templates(id);

-- Update FK: escalation_log → factories, connections
ALTER TABLE platform.escalation_log
DROP CONSTRAINT escalation_log_factory_id_fkey,
DROP CONSTRAINT escalation_log_connection_id_fkey,
ADD CONSTRAINT escalation_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT escalation_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);

-- Update FK: mapping_configs → factories, connections
ALTER TABLE ai.mapping_configs
DROP CONSTRAINT mapping_configs_factory_id_fkey,
DROP CONSTRAINT mapping_configs_connection_id_fkey,
ADD CONSTRAINT mapping_configs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT mapping_configs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);

-- Update FK: ai_fix_log → factories
ALTER TABLE ai.ai_fix_log
DROP CONSTRAINT ai_fix_log_factory_id_fkey,
ADD CONSTRAINT ai_fix_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id);

-- Update FK: factory_preferences → factories, feature_flags
ALTER TABLE platform.factory_preferences
DROP CONSTRAINT factory_preferences_tenant_id_fkey,
DROP CONSTRAINT factory_preferences_flag_name_fkey,
ADD CONSTRAINT factory_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES factories(id) ON DELETE CASCADE,
ADD CONSTRAINT factory_preferences_flag_name_fkey FOREIGN KEY (flag_name) REFERENCES feature_flags(flag_name) ON DELETE CASCADE;

-- Update FK: ca_firm_staff → ca_firms
ALTER TABLE compliance.ca_firm_staff
DROP CONSTRAINT ca_firm_staff_ca_firm_id_fkey,
ADD CONSTRAINT ca_firm_staff_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE;

-- Update FK: ca_clients → ca_firms, factories
ALTER TABLE compliance.ca_clients
DROP CONSTRAINT ca_clients_ca_firm_id_fkey,
DROP CONSTRAINT ca_clients_factory_id_fkey,
DROP CONSTRAINT ca_clients_assigned_staff_id_fkey,
ADD CONSTRAINT ca_clients_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT ca_clients_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id),
ADD CONSTRAINT ca_clients_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES ca_firm_staff(id);

-- Update FK: compliance_filings → ca_firms, ca_clients
ALTER TABLE compliance.compliance_filings
DROP CONSTRAINT compliance_filings_ca_firm_id_fkey,
DROP CONSTRAINT compliance_filings_client_id_fkey,
ADD CONSTRAINT compliance_filings_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT compliance_filings_client_id_fkey FOREIGN KEY (client_id) REFERENCES ca_clients(id) ON DELETE CASCADE;

-- Update FK: compliance_exceptions → compliance_filings, ca_clients, ca_firms
ALTER TABLE compliance.compliance_exceptions
DROP CONSTRAINT compliance_exceptions_filing_id_fkey,
DROP CONSTRAINT compliance_exceptions_client_id_fkey,
DROP CONSTRAINT compliance_exceptions_ca_firm_id_fkey,
ADD CONSTRAINT compliance_exceptions_filing_id_fkey FOREIGN KEY (filing_id) REFERENCES compliance_filings(id) ON DELETE CASCADE,
ADD CONSTRAINT compliance_exceptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES ca_clients(id) ON DELETE CASCADE,
ADD CONSTRAINT compliance_exceptions_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE;

-- Update FK: reconciliation_sessions → ca_firms, ca_clients
ALTER TABLE compliance.reconciliation_sessions
DROP CONSTRAINT reconciliation_sessions_ca_firm_id_fkey,
DROP CONSTRAINT reconciliation_sessions_client_id_fkey,
ADD CONSTRAINT reconciliation_sessions_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT reconciliation_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES ca_clients(id) ON DELETE CASCADE;

-- Update FK: reconciliation_items → reconciliation_sessions
ALTER TABLE compliance.reconciliation_items
DROP CONSTRAINT reconciliation_items_session_id_fkey,
ADD CONSTRAINT reconciliation_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES reconciliation_sessions(id) ON DELETE CASCADE;

-- Update FK: document_requests → ca_firms, ca_clients
ALTER TABLE compliance.document_requests
DROP CONSTRAINT document_requests_ca_firm_id_fkey,
DROP CONSTRAINT document_requests_client_id_fkey,
ADD CONSTRAINT document_requests_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT document_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES ca_clients(id) ON DELETE CASCADE;

-- Update FK: document_templates → ca_firms
ALTER TABLE compliance.document_templates
DROP CONSTRAINT document_templates_ca_firm_id_fkey,
ADD CONSTRAINT document_templates_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE;

-- Update FK: notices → ca_firms, ca_clients
ALTER TABLE compliance.notices
DROP CONSTRAINT notices_ca_firm_id_fkey,
DROP CONSTRAINT notices_client_id_fkey,
ADD CONSTRAINT notices_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT notices_client_id_fkey FOREIGN KEY (client_id) REFERENCES ca_clients(id) ON DELETE CASCADE;

-- Update FK: client_health_scores → ca_firms, ca_clients
ALTER TABLE compliance.client_health_scores
DROP CONSTRAINT client_health_scores_ca_firm_id_fkey,
DROP CONSTRAINT client_health_scores_client_id_fkey,
ADD CONSTRAINT client_health_scores_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT client_health_scores_client_id_fkey FOREIGN KEY (client_id) REFERENCES ca_clients(id) ON DELETE CASCADE;

-- Update FK: staff_activity_log → ca_firms, ca_firm_staff
ALTER TABLE compliance.staff_activity_log
DROP CONSTRAINT staff_activity_log_ca_firm_id_fkey,
DROP CONSTRAINT staff_activity_log_staff_id_fkey,
ADD CONSTRAINT staff_activity_log_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT staff_activity_log_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES ca_firm_staff(id) ON DELETE CASCADE;

-- Update FK: communication_log → ca_firms, ca_clients
ALTER TABLE compliance.communication_log
DROP CONSTRAINT communication_log_ca_firm_id_fkey,
DROP CONSTRAINT communication_log_client_id_fkey,
ADD CONSTRAINT communication_log_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES ca_firms(id) ON DELETE CASCADE,
ADD CONSTRAINT communication_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES ca_clients(id) ON DELETE CASCADE;

-- Update FK: partner_referrals → partners, factories
ALTER TABLE platform.partner_referrals
DROP CONSTRAINT partner_referrals_partner_id_fkey,
DROP CONSTRAINT partner_referrals_factory_id_fkey,
ADD CONSTRAINT partner_referrals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
ADD CONSTRAINT partner_referrals_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE CASCADE;

-- Update FK: commission_ledger → partners, factories
ALTER TABLE platform.commission_ledger
DROP CONSTRAINT commission_ledger_partner_id_fkey,
DROP CONSTRAINT commission_ledger_factory_id_fkey,
ADD CONSTRAINT commission_ledger_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
ADD CONSTRAINT commission_ledger_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE CASCADE;

-- Update FK: impersonation_sessions → factories
ALTER TABLE audit.impersonation_sessions
DROP CONSTRAINT impersonation_sessions_factory_id_fkey,
ADD CONSTRAINT impersonation_sessions_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE CASCADE;

-- STEP 2: Move all tables back to public schema

ALTER TABLE core.factories SET SCHEMA public;
ALTER TABLE core.buyers SET SCHEMA public;
ALTER TABLE core.connections SET SCHEMA public;
ALTER TABLE core.item_master SET SCHEMA public;
ALTER TABLE core.rate_cards SET SCHEMA public;
ALTER TABLE core.connector_catalog SET SCHEMA public;
ALTER TABLE core.connector_requests SET SCHEMA public;
ALTER TABLE core.barcode_configs SET SCHEMA public;

ALTER TABLE orders.canonical_orders SET SCHEMA public;
ALTER TABLE orders.canonical_order_line_items SET SCHEMA public;
ALTER TABLE orders.canonical_shipments SET SCHEMA public;
ALTER TABLE orders.shipment_packs SET SCHEMA public;
ALTER TABLE orders.canonical_invoices SET SCHEMA public;
ALTER TABLE orders.canonical_returns SET SCHEMA public;
ALTER TABLE orders.message_log SET SCHEMA public;

ALTER TABLE workflow.order_sagas SET SCHEMA public;
ALTER TABLE workflow.outbox SET SCHEMA public;
ALTER TABLE workflow.resync_requests SET SCHEMA public;
ALTER TABLE workflow.resync_items SET SCHEMA public;
ALTER TABLE workflow.routing_rules SET SCHEMA public;

ALTER TABLE compliance.ca_firms SET SCHEMA public;
ALTER TABLE compliance.ca_firm_staff SET SCHEMA public;
ALTER TABLE compliance.ca_clients SET SCHEMA public;
ALTER TABLE compliance.compliance_filings SET SCHEMA public;
ALTER TABLE compliance.compliance_exceptions SET SCHEMA public;
ALTER TABLE compliance.reconciliation_sessions SET SCHEMA public;
ALTER TABLE compliance.reconciliation_items SET SCHEMA public;
ALTER TABLE compliance.document_requests SET SCHEMA public;
ALTER TABLE compliance.document_templates SET SCHEMA public;
ALTER TABLE compliance.notices SET SCHEMA public;
ALTER TABLE compliance.client_health_scores SET SCHEMA public;
ALTER TABLE compliance.communication_log SET SCHEMA public;
ALTER TABLE compliance.subscription_tiers SET SCHEMA public;
ALTER TABLE compliance.staff_activity_log SET SCHEMA public;

ALTER TABLE audit.audit_log SET SCHEMA public;
ALTER TABLE audit.record_history SET SCHEMA public;
ALTER TABLE audit.impersonation_sessions SET SCHEMA public;

ALTER TABLE ai.llm_cache SET SCHEMA public;
ALTER TABLE ai.llm_usage_log SET SCHEMA public;
ALTER TABLE ai.ai_fix_log SET SCHEMA public;
ALTER TABLE ai.mapping_configs SET SCHEMA public;

ALTER TABLE platform.app_config SET SCHEMA public;
ALTER TABLE platform.feature_flags SET SCHEMA public;
ALTER TABLE platform.factory_preferences SET SCHEMA public;
ALTER TABLE platform.notification_templates SET SCHEMA public;
ALTER TABLE platform.calendar_entries SET SCHEMA public;
ALTER TABLE platform.operational_profile SET SCHEMA public;
ALTER TABLE platform.escalation_rules SET SCHEMA public;
ALTER TABLE platform.escalation_log SET SCHEMA public;
ALTER TABLE platform.webhook_subscriptions SET SCHEMA public;
ALTER TABLE platform.webhook_deliveries SET SCHEMA public;
ALTER TABLE platform.relationship_registry SET SCHEMA public;
ALTER TABLE platform.partners SET SCHEMA public;
ALTER TABLE platform.partner_referrals SET SCHEMA public;
ALTER TABLE platform.commission_ledger SET SCHEMA public;

-- STEP 3: Drop all schemas

DROP SCHEMA IF EXISTS core CASCADE;
DROP SCHEMA IF EXISTS orders CASCADE;
DROP SCHEMA IF EXISTS workflow CASCADE;
DROP SCHEMA IF EXISTS compliance CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS ai CASCADE;
DROP SCHEMA IF EXISTS platform CASCADE;
