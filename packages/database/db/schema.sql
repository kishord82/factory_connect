\restrict dbmate

-- Dumped from database version 16.13
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ai; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA ai;


--
-- Name: audit; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA audit;


--
-- Name: compliance; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA compliance;


--
-- Name: core; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA core;


--
-- Name: keycloak; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA keycloak;


--
-- Name: orders; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA orders;


--
-- Name: platform; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA platform;


--
-- Name: workflow; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA workflow;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: doc_request_status; Type: TYPE; Schema: compliance; Owner: -
--

CREATE TYPE compliance.doc_request_status AS ENUM (
    'PENDING',
    'PARTIAL',
    'RECEIVED',
    'VERIFIED',
    'REJECTED'
);


--
-- Name: filing_status; Type: TYPE; Schema: compliance; Owner: -
--

CREATE TYPE compliance.filing_status AS ENUM (
    'NOT_STARTED',
    'DATA_GATHERING',
    'UNDER_REVIEW',
    'CLIENT_APPROVAL',
    'FILED',
    'ACKNOWLEDGED',
    'OVERDUE',
    'DISPUTED',
    'CANCELLED'
);


--
-- Name: filing_type; Type: TYPE; Schema: compliance; Owner: -
--

CREATE TYPE compliance.filing_type AS ENUM (
    'GST_R1',
    'GST_3B',
    'GST_9',
    'GST_9C',
    'TDS_24Q',
    'TDS_26Q',
    'TCS_27EQ',
    'ITR',
    'ROC_AOC4',
    'ROC_MGT7',
    'PF_ECR',
    'ESIC_RETURN',
    'ADVANCE_TAX',
    'CUSTOM'
);


--
-- Name: health_tier; Type: TYPE; Schema: compliance; Owner: -
--

CREATE TYPE compliance.health_tier AS ENUM (
    'CRITICAL',
    'AT_RISK',
    'FAIR',
    'GOOD',
    'EXCELLENT'
);


--
-- Name: notice_status; Type: TYPE; Schema: compliance; Owner: -
--

CREATE TYPE compliance.notice_status AS ENUM (
    'RECEIVED',
    'UNDER_REVIEW',
    'RESPONSE_DRAFTED',
    'RESPONSE_FILED',
    'PENDING_HEARING',
    'RESOLVED',
    'ESCALATED',
    'CLOSED'
);


--
-- Name: notice_type; Type: TYPE; Schema: compliance; Owner: -
--

CREATE TYPE compliance.notice_type AS ENUM (
    'GST_SCRUTINY',
    'GST_SHOW_CAUSE',
    'INCOME_TAX',
    'TDS_DEFAULT',
    'ROC_INQUIRY',
    'LABOUR_DEPT',
    'CUSTOM_DEPT',
    'OTHER'
);


--
-- Name: audit_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'CONFIRM',
    'SHIP',
    'INVOICE',
    'RESYNC',
    'LOGIN',
    'IMPERSONATE',
    'REVERT'
);


--
-- Name: ca_subscription_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ca_subscription_tier AS ENUM (
    'trial',
    'starter',
    'professional',
    'enterprise'
);


--
-- Name: compliance_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compliance_severity AS ENUM (
    'critical',
    'high',
    'medium',
    'low',
    'info'
);


--
-- Name: connection_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.connection_mode AS ENUM (
    'sandbox',
    'uat',
    'production'
);


--
-- Name: document_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_request_status AS ENUM (
    'pending',
    'sent',
    'received',
    'verified',
    'expired',
    'cancelled'
);


--
-- Name: exception_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.exception_status AS ENUM (
    'open',
    'acknowledged',
    'in_progress',
    'resolved',
    'escalated'
);


--
-- Name: filing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.filing_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'review_pending',
    'rejected'
);


--
-- Name: match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_status AS ENUM (
    'matched',
    'unmatched_source',
    'unmatched_target',
    'variance',
    'manual_review'
);


--
-- Name: notice_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notice_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: notice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notice_status AS ENUM (
    'received',
    'acknowledged',
    'in_progress',
    'resolved',
    'escalated',
    'closed'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'INVOICED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: outbox_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.outbox_event_type AS ENUM (
    'ORDER_CONFIRMED',
    'SHIPMENT_CREATED',
    'INVOICE_CREATED',
    'INBOUND_PO_RECEIVED',
    'RESYNC_INITIATED',
    'CONNECTION_STATUS_CHANGED'
);


--
-- Name: reconciliation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reconciliation_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'partial_match',
    'failed'
);


--
-- Name: resync_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resync_status AS ENUM (
    'REQUESTED',
    'VALIDATED',
    'APPROVED',
    'REJECTED',
    'DENIED',
    'QUEUED',
    'IN_PROGRESS',
    'COMPLETED',
    'PARTIAL_FAIL',
    'REQUIRES_REVIEW'
);


--
-- Name: saga_step; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.saga_step AS ENUM (
    'PO_RECEIVED',
    'PO_CONFIRMED',
    'ACK_QUEUED',
    'ACK_SENT',
    'ACK_DELIVERED',
    'SHIP_READY',
    'ASN_QUEUED',
    'ASN_SENT',
    'ASN_DELIVERED',
    'INVOICE_READY',
    'INVOICE_QUEUED',
    'INVOICE_SENT',
    'INVOICE_DELIVERED',
    'COMPLETED',
    'FAILED'
);


--
-- Name: source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.source_type AS ENUM (
    'tally',
    'zoho',
    'sap_b1',
    'rest_api',
    'manual'
);


--
-- Name: staff_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.staff_role AS ENUM (
    'partner',
    'manager',
    'staff'
);


--
-- Name: audit_log_hash_chain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_hash_chain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: prevent_audit_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable — UPDATE and DELETE are not allowed';
END;
$$;


--
-- Name: record_history_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_history_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    NULLIF(current_setting('app.current_tenant', true), '')::uuid,
    current_setting('app.correlation_id', true)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_fix_log; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.ai_fix_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid,
    agent_id character varying(100),
    error_code character varying(100) NOT NULL,
    fix_type character varying(50) NOT NULL,
    risk_level character varying(10) NOT NULL,
    fix_description text NOT NULL,
    fix_result character varying(20) NOT NULL,
    reverted boolean DEFAULT false NOT NULL,
    approved_by character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_fix_log_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[])))
);


--
-- Name: llm_cache; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.llm_cache (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    prompt_hash character varying(64) NOT NULL,
    task_type character varying(50) NOT NULL,
    model character varying(100) NOT NULL,
    response jsonb NOT NULL,
    confidence numeric(3,2),
    hit_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);


--
-- Name: llm_usage_log; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.llm_usage_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    provider character varying(50) NOT NULL,
    model character varying(100) NOT NULL,
    task_type character varying(50) NOT NULL,
    prompt_hash character varying(64) NOT NULL,
    input_tokens integer,
    output_tokens integer,
    latency_ms integer,
    cost_usd numeric(10,6),
    success boolean DEFAULT true NOT NULL,
    human_override boolean DEFAULT false,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mapping_configs; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.mapping_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_type public.source_type NOT NULL,
    field_mappings jsonb DEFAULT '[]'::jsonb NOT NULL,
    transform_rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.audit_log (
    id bigint NOT NULL,
    factory_id uuid,
    user_id character varying(255),
    action public.audit_action NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    old_record jsonb,
    new_record jsonb,
    ip_address inet,
    correlation_id character varying(255),
    hash character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    actor_id character varying(255),
    metadata jsonb
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: audit; Owner: -
--

CREATE SEQUENCE audit.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: audit; Owner: -
--

ALTER SEQUENCE audit.audit_log_id_seq OWNED BY audit.audit_log.id;


--
-- Name: impersonation_sessions; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.impersonation_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fc_operator_id character varying(255) NOT NULL,
    factory_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    actions_performed integer DEFAULT 0 NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: record_history; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.record_history (
    id bigint NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id uuid,
    operation character varying(10) NOT NULL,
    old_record jsonb,
    new_record jsonb,
    changed_by character varying(255),
    tenant_id uuid,
    correlation_id character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: record_history_id_seq; Type: SEQUENCE; Schema: audit; Owner: -
--

CREATE SEQUENCE audit.record_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: record_history_id_seq; Type: SEQUENCE OWNED BY; Schema: audit; Owner: -
--

ALTER SEQUENCE audit.record_history_id_seq OWNED BY audit.record_history.id;


--
-- Name: ca_clients; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.ca_clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    assigned_staff_id uuid,
    client_name character varying(255) NOT NULL,
    trade_name character varying(255),
    pan_encrypted text,
    gstin_encrypted text,
    contact_email character varying(255),
    contact_phone character varying(20),
    address jsonb,
    entity_type character varying(30) DEFAULT 'private_limited'::character varying NOT NULL,
    industry character varying(100),
    annual_turnover_band character varying(30),
    services jsonb DEFAULT '[]'::jsonb NOT NULL,
    portal_access boolean DEFAULT false NOT NULL,
    portal_last_login timestamp with time zone,
    notes text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    onboarded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ca_clients_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['proprietorship'::character varying, 'partnership'::character varying, 'llp'::character varying, 'private_limited'::character varying, 'public_limited'::character varying, 'trust'::character varying, 'ngo'::character varying])::text[]))),
    CONSTRAINT ca_clients_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'onboarding'::character varying, 'offboarded'::character varying])::text[])))
);


--
-- Name: ca_firm_staff; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.ca_firm_staff (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    keycloak_sub character varying(100) NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(30) DEFAULT 'staff'::character varying NOT NULL,
    membership_number character varying(50),
    is_signing_authority boolean DEFAULT false NOT NULL,
    max_clients integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ca_firm_staff_role_check CHECK (((role)::text = ANY ((ARRAY['ca_admin'::character varying, 'ca_partner'::character varying, 'ca_manager'::character varying, 'staff'::character varying, 'intern'::character varying])::text[]))),
    CONSTRAINT ca_firm_staff_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'invited'::character varying])::text[])))
);


--
-- Name: ca_firms; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.ca_firms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    firm_name character varying(255) NOT NULL,
    membership_number character varying(50) NOT NULL,
    pan_encrypted text,
    gstin_encrypted text,
    contact_email character varying(255) NOT NULL,
    contact_phone character varying(20),
    address jsonb,
    subscription_tier character varying(20) DEFAULT 'starter'::character varying NOT NULL,
    max_clients integer DEFAULT 25 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    trial_ends_at timestamp with time zone,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ca_firms_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'trial'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT ca_firms_subscription_tier_check CHECK (((subscription_tier)::text = ANY ((ARRAY['starter'::character varying, 'professional'::character varying, 'enterprise'::character varying])::text[])))
);


--
-- Name: client_health_scores; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.client_health_scores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    score integer NOT NULL,
    tier compliance.health_tier NOT NULL,
    filing_compliance_pct numeric(5,2),
    docs_pending integer DEFAULT 0 NOT NULL,
    overdue_filings integer DEFAULT 0 NOT NULL,
    open_notices integer DEFAULT 0 NOT NULL,
    last_communication_days integer,
    breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT client_health_scores_score_check CHECK (((score >= 0) AND (score <= 100)))
);


--
-- Name: communication_log; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.communication_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    staff_id uuid,
    channel character varying(20) DEFAULT 'email'::character varying NOT NULL,
    direction character varying(10) DEFAULT 'outbound'::character varying NOT NULL,
    subject character varying(500),
    body text,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    related_filing_id uuid,
    related_notice_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT communication_log_channel_check CHECK (((channel)::text = ANY ((ARRAY['email'::character varying, 'whatsapp'::character varying, 'sms'::character varying, 'phone'::character varying, 'portal'::character varying, 'in_person'::character varying])::text[]))),
    CONSTRAINT communication_log_direction_check CHECK (((direction)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[])))
);


--
-- Name: compliance_exceptions; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.compliance_exceptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    filing_id uuid,
    client_id uuid NOT NULL,
    exception_code character varying(50) NOT NULL,
    description text NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT compliance_exceptions_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT compliance_exceptions_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'acknowledged'::character varying, 'resolved'::character varying, 'ignored'::character varying])::text[])))
);


--
-- Name: compliance_filings; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.compliance_filings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    assigned_staff_id uuid,
    filing_type compliance.filing_type NOT NULL,
    period_label character varying(50) NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    due_date date NOT NULL,
    filed_at timestamp with time zone,
    ack_number character varying(100),
    status compliance.filing_status DEFAULT 'NOT_STARTED'::compliance.filing_status NOT NULL,
    tax_liability numeric(15,2),
    tax_paid numeric(15,2),
    late_fee numeric(10,2) DEFAULT 0,
    interest numeric(10,2) DEFAULT 0,
    penalty numeric(10,2) DEFAULT 0,
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_requests; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.document_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    filing_id uuid,
    template_id uuid,
    requested_by uuid,
    title character varying(255) NOT NULL,
    description text,
    due_date date,
    status compliance.doc_request_status DEFAULT 'PENDING'::compliance.doc_request_status NOT NULL,
    documents jsonb DEFAULT '[]'::jsonb NOT NULL,
    reminder_count integer DEFAULT 0 NOT NULL,
    last_reminder_at timestamp with time zone,
    fulfilled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_templates; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.document_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    filing_type compliance.filing_type,
    required_docs jsonb DEFAULT '[]'::jsonb NOT NULL,
    instructions text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notices; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.notices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    assigned_staff_id uuid,
    notice_type compliance.notice_type NOT NULL,
    notice_number character varying(100),
    issuing_authority character varying(255),
    notice_date date NOT NULL,
    response_due_date date NOT NULL,
    tax_period character varying(50),
    demand_amount numeric(15,2),
    status compliance.notice_status DEFAULT 'RECEIVED'::compliance.notice_status NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    description text,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    response_summary text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notices_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


--
-- Name: reconciliation_items; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.reconciliation_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id uuid NOT NULL,
    ca_firm_id uuid NOT NULL,
    gstin character varying(20),
    supplier_name character varying(255),
    invoice_number character varying(100),
    invoice_date date,
    taxable_amount numeric(15,2),
    igst numeric(15,2) DEFAULT 0,
    cgst numeric(15,2) DEFAULT 0,
    sgst numeric(15,2) DEFAULT 0,
    books_amount numeric(15,2),
    portal_amount numeric(15,2),
    difference numeric(15,2),
    match_status character varying(20) DEFAULT 'unmatched'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reconciliation_items_match_status_check CHECK (((match_status)::text = ANY ((ARRAY['matched'::character varying, 'unmatched'::character varying, 'partial'::character varying, 'mismatch'::character varying])::text[])))
);


--
-- Name: reconciliation_sessions; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.reconciliation_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    initiated_by uuid,
    session_type character varying(30) DEFAULT 'gst_2a_2b'::character varying NOT NULL,
    period_label character varying(50) NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_records integer DEFAULT 0 NOT NULL,
    matched_records integer DEFAULT 0 NOT NULL,
    unmatched_records integer DEFAULT 0 NOT NULL,
    difference_amount numeric(15,2) DEFAULT 0,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    completed_at timestamp with time zone,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reconciliation_sessions_session_type_check CHECK (((session_type)::text = ANY ((ARRAY['gst_2a_2b'::character varying, 'tds_26as'::character varying, 'books_gst'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT reconciliation_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying, 'needs_review'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: staff_activity_log; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.staff_activity_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    client_id uuid,
    activity_type character varying(100) NOT NULL,
    duration_minutes integer,
    description text,
    activity_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_tiers; Type: TABLE; Schema: compliance; Owner: -
--

CREATE TABLE compliance.subscription_tiers (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    max_clients integer NOT NULL,
    price_per_client_monthly numeric(10,2),
    base_price_monthly numeric(10,2),
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: barcode_configs; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.barcode_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    barcode_type character varying(20) DEFAULT 'SSCC-18'::character varying NOT NULL,
    prefix character varying(20),
    next_sequence bigint DEFAULT 1 NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: buyers; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.buyers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    buyer_identifier character varying(100) NOT NULL,
    edi_qualifier character varying(10),
    edi_id character varying(30),
    as2_id character varying(100),
    as2_url character varying(500),
    protocol character varying(20) DEFAULT 'edi_x12'::character varying NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: connections; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.connections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    mode public.connection_mode DEFAULT 'sandbox'::public.connection_mode NOT NULL,
    source_type public.source_type DEFAULT 'tally'::public.source_type NOT NULL,
    sla_config jsonb DEFAULT '{"ack_hours": 2, "asn_hours": 24, "invoice_hours": 48}'::jsonb NOT NULL,
    tax_config jsonb DEFAULT '{"rate": 18, "type": "GST", "components": ["CGST", "SGST"]}'::jsonb NOT NULL,
    mapping_config_id uuid,
    circuit_breaker_state character varying(20) DEFAULT 'CLOSED'::character varying NOT NULL,
    circuit_breaker_failures integer DEFAULT 0 NOT NULL,
    circuit_breaker_last_failure timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    protocol character varying(50),
    buyer_endpoint text,
    credentials jsonb,
    currency_config jsonb,
    barcode_config jsonb,
    partial_shipment_allowed boolean DEFAULT false NOT NULL,
    sla_ack_hours integer,
    sla_ship_hours integer,
    sla_invoice_hours integer
);


--
-- Name: connector_catalog; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.connector_catalog (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    connector_type character varying(20) NOT NULL,
    protocol character varying(30) NOT NULL,
    supported_flows jsonb DEFAULT '[]'::jsonb NOT NULL,
    description text,
    icon_url character varying(500),
    sample_payload jsonb,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT connector_catalog_connector_type_check CHECK (((connector_type)::text = ANY ((ARRAY['source'::character varying, 'target'::character varying])::text[])))
);


--
-- Name: connector_requests; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.connector_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid,
    connector_name character varying(255) NOT NULL,
    connector_type character varying(20) NOT NULL,
    description text,
    vote_count integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: factories; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.factories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    factory_type smallint NOT NULL,
    gstin_encrypted text,
    pan_encrypted text,
    contact_email character varying(255) NOT NULL,
    contact_phone character varying(20),
    address jsonb,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    timezone character varying(50) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT factories_factory_type_check CHECK (((factory_type >= 1) AND (factory_type <= 4)))
);


--
-- Name: item_master; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.item_master (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    factory_sku character varying(100) NOT NULL,
    buyer_sku character varying(100),
    buyer_id uuid,
    description text,
    upc character varying(14),
    hsn_code character varying(10),
    default_uom character varying(10) DEFAULT 'EA'::character varying NOT NULL,
    unit_price numeric(15,4),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rate_cards; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.rate_cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    item_id uuid NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_event_entity; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.admin_event_entity (
    id character varying(36) NOT NULL,
    admin_event_time bigint,
    realm_id character varying(255),
    operation_type character varying(255),
    auth_realm_id character varying(255),
    auth_client_id character varying(255),
    auth_user_id character varying(255),
    ip_address character varying(255),
    resource_path character varying(2550),
    representation text,
    error character varying(255),
    resource_type character varying(64)
);


--
-- Name: associated_policy; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.associated_policy (
    policy_id character varying(36) NOT NULL,
    associated_policy_id character varying(36) NOT NULL
);


--
-- Name: authentication_execution; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.authentication_execution (
    id character varying(36) NOT NULL,
    alias character varying(255),
    authenticator character varying(36),
    realm_id character varying(36),
    flow_id character varying(36),
    requirement integer,
    priority integer,
    authenticator_flow boolean DEFAULT false NOT NULL,
    auth_flow_id character varying(36),
    auth_config character varying(36)
);


--
-- Name: authentication_flow; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.authentication_flow (
    id character varying(36) NOT NULL,
    alias character varying(255),
    description character varying(255),
    realm_id character varying(36),
    provider_id character varying(36) DEFAULT 'basic-flow'::character varying NOT NULL,
    top_level boolean DEFAULT false NOT NULL,
    built_in boolean DEFAULT false NOT NULL
);


--
-- Name: authenticator_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.authenticator_config (
    id character varying(36) NOT NULL,
    alias character varying(255),
    realm_id character varying(36)
);


--
-- Name: authenticator_config_entry; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.authenticator_config_entry (
    authenticator_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


--
-- Name: broker_link; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.broker_link (
    identity_provider character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL,
    broker_user_id character varying(255),
    broker_username character varying(255),
    token text,
    user_id character varying(255) NOT NULL
);


--
-- Name: client; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client (
    id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    full_scope_allowed boolean DEFAULT false NOT NULL,
    client_id character varying(255),
    not_before integer,
    public_client boolean DEFAULT false NOT NULL,
    secret character varying(255),
    base_url character varying(255),
    bearer_only boolean DEFAULT false NOT NULL,
    management_url character varying(255),
    surrogate_auth_required boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    protocol character varying(255),
    node_rereg_timeout integer DEFAULT 0,
    frontchannel_logout boolean DEFAULT false NOT NULL,
    consent_required boolean DEFAULT false NOT NULL,
    name character varying(255),
    service_accounts_enabled boolean DEFAULT false NOT NULL,
    client_authenticator_type character varying(255),
    root_url character varying(255),
    description character varying(255),
    registration_token character varying(255),
    standard_flow_enabled boolean DEFAULT true NOT NULL,
    implicit_flow_enabled boolean DEFAULT false NOT NULL,
    direct_access_grants_enabled boolean DEFAULT false NOT NULL,
    always_display_in_console boolean DEFAULT false NOT NULL
);


--
-- Name: client_attributes; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_attributes (
    client_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


--
-- Name: client_auth_flow_bindings; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_auth_flow_bindings (
    client_id character varying(36) NOT NULL,
    flow_id character varying(36),
    binding_name character varying(255) NOT NULL
);


--
-- Name: client_initial_access; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_initial_access (
    id character varying(36) NOT NULL,
    realm_id character varying(36) NOT NULL,
    "timestamp" integer,
    expiration integer,
    count integer,
    remaining_count integer
);


--
-- Name: client_node_registrations; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_node_registrations (
    client_id character varying(36) NOT NULL,
    value integer,
    name character varying(255) NOT NULL
);


--
-- Name: client_scope; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_scope (
    id character varying(36) NOT NULL,
    name character varying(255),
    realm_id character varying(36),
    description character varying(255),
    protocol character varying(255)
);


--
-- Name: client_scope_attributes; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_scope_attributes (
    scope_id character varying(36) NOT NULL,
    value character varying(2048),
    name character varying(255) NOT NULL
);


--
-- Name: client_scope_client; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_scope_client (
    client_id character varying(255) NOT NULL,
    scope_id character varying(255) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


--
-- Name: client_scope_role_mapping; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_scope_role_mapping (
    scope_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


--
-- Name: client_session; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_session (
    id character varying(36) NOT NULL,
    client_id character varying(36),
    redirect_uri character varying(255),
    state character varying(255),
    "timestamp" integer,
    session_id character varying(36),
    auth_method character varying(255),
    realm_id character varying(255),
    auth_user_id character varying(36),
    current_action character varying(36)
);


--
-- Name: client_session_auth_status; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_session_auth_status (
    authenticator character varying(36) NOT NULL,
    status integer,
    client_session character varying(36) NOT NULL
);


--
-- Name: client_session_note; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_session_note (
    name character varying(255) NOT NULL,
    value character varying(255),
    client_session character varying(36) NOT NULL
);


--
-- Name: client_session_prot_mapper; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_session_prot_mapper (
    protocol_mapper_id character varying(36) NOT NULL,
    client_session character varying(36) NOT NULL
);


--
-- Name: client_session_role; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_session_role (
    role_id character varying(255) NOT NULL,
    client_session character varying(36) NOT NULL
);


--
-- Name: client_user_session_note; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.client_user_session_note (
    name character varying(255) NOT NULL,
    value character varying(2048),
    client_session character varying(36) NOT NULL
);


--
-- Name: component; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.component (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_id character varying(36),
    provider_id character varying(36),
    provider_type character varying(255),
    realm_id character varying(36),
    sub_type character varying(255)
);


--
-- Name: component_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.component_config (
    id character varying(36) NOT NULL,
    component_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


--
-- Name: composite_role; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.composite_role (
    composite character varying(36) NOT NULL,
    child_role character varying(36) NOT NULL
);


--
-- Name: credential; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    user_id character varying(36),
    created_date bigint,
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


--
-- Name: databasechangelog; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.databasechangelog (
    id character varying(255) NOT NULL,
    author character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    dateexecuted timestamp without time zone NOT NULL,
    orderexecuted integer NOT NULL,
    exectype character varying(10) NOT NULL,
    md5sum character varying(35),
    description character varying(255),
    comments character varying(255),
    tag character varying(255),
    liquibase character varying(20),
    contexts character varying(255),
    labels character varying(255),
    deployment_id character varying(10)
);


--
-- Name: databasechangeloglock; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.databasechangeloglock (
    id integer NOT NULL,
    locked boolean NOT NULL,
    lockgranted timestamp without time zone,
    lockedby character varying(255)
);


--
-- Name: default_client_scope; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.default_client_scope (
    realm_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


--
-- Name: event_entity; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.event_entity (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    details_json character varying(2550),
    error character varying(255),
    ip_address character varying(255),
    realm_id character varying(255),
    session_id character varying(255),
    event_time bigint,
    type character varying(255),
    user_id character varying(255),
    details_json_long_value text
);


--
-- Name: fed_user_attribute; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.fed_user_attribute (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    value character varying(2024),
    long_value_hash bytea,
    long_value_hash_lower_case bytea,
    long_value text
);


--
-- Name: fed_user_consent; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.fed_user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


--
-- Name: fed_user_consent_cl_scope; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.fed_user_consent_cl_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


--
-- Name: fed_user_credential; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.fed_user_credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    created_date bigint,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


--
-- Name: fed_user_group_membership; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.fed_user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


--
-- Name: fed_user_required_action; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.fed_user_required_action (
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


--
-- Name: fed_user_role_mapping; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.fed_user_role_mapping (
    role_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


--
-- Name: federated_identity; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.federated_identity (
    identity_provider character varying(255) NOT NULL,
    realm_id character varying(36),
    federated_user_id character varying(255),
    federated_username character varying(255),
    token text,
    user_id character varying(36) NOT NULL
);


--
-- Name: federated_user; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.federated_user (
    id character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL
);


--
-- Name: group_attribute; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.group_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    group_id character varying(36) NOT NULL
);


--
-- Name: group_role_mapping; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.group_role_mapping (
    role_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


--
-- Name: identity_provider; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.identity_provider (
    internal_id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    provider_alias character varying(255),
    provider_id character varying(255),
    store_token boolean DEFAULT false NOT NULL,
    authenticate_by_default boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    add_token_role boolean DEFAULT true NOT NULL,
    trust_email boolean DEFAULT false NOT NULL,
    first_broker_login_flow_id character varying(36),
    post_broker_login_flow_id character varying(36),
    provider_display_name character varying(255),
    link_only boolean DEFAULT false NOT NULL
);


--
-- Name: identity_provider_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.identity_provider_config (
    identity_provider_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


--
-- Name: identity_provider_mapper; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.identity_provider_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    idp_alias character varying(255) NOT NULL,
    idp_mapper_name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


--
-- Name: idp_mapper_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.idp_mapper_config (
    idp_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


--
-- Name: keycloak_group; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.keycloak_group (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_group character varying(36) NOT NULL,
    realm_id character varying(36)
);


--
-- Name: keycloak_role; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.keycloak_role (
    id character varying(36) NOT NULL,
    client_realm_constraint character varying(255),
    client_role boolean DEFAULT false NOT NULL,
    description character varying(255),
    name character varying(255),
    realm_id character varying(255),
    client character varying(36),
    realm character varying(36)
);


--
-- Name: migration_model; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.migration_model (
    id character varying(36) NOT NULL,
    version character varying(36),
    update_time bigint DEFAULT 0 NOT NULL
);


--
-- Name: offline_client_session; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.offline_client_session (
    user_session_id character varying(36) NOT NULL,
    client_id character varying(255) NOT NULL,
    offline_flag character varying(4) NOT NULL,
    "timestamp" integer,
    data text,
    client_storage_provider character varying(36) DEFAULT 'local'::character varying NOT NULL,
    external_client_id character varying(255) DEFAULT 'local'::character varying NOT NULL
);


--
-- Name: offline_user_session; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.offline_user_session (
    user_session_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    created_on integer NOT NULL,
    offline_flag character varying(4) NOT NULL,
    data text,
    last_session_refresh integer DEFAULT 0 NOT NULL
);


--
-- Name: policy_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.policy_config (
    policy_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


--
-- Name: protocol_mapper; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.protocol_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    protocol character varying(255) NOT NULL,
    protocol_mapper_name character varying(255) NOT NULL,
    client_id character varying(36),
    client_scope_id character varying(36)
);


--
-- Name: protocol_mapper_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.protocol_mapper_config (
    protocol_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


--
-- Name: realm; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm (
    id character varying(36) NOT NULL,
    access_code_lifespan integer,
    user_action_lifespan integer,
    access_token_lifespan integer,
    account_theme character varying(255),
    admin_theme character varying(255),
    email_theme character varying(255),
    enabled boolean DEFAULT false NOT NULL,
    events_enabled boolean DEFAULT false NOT NULL,
    events_expiration bigint,
    login_theme character varying(255),
    name character varying(255),
    not_before integer,
    password_policy character varying(2550),
    registration_allowed boolean DEFAULT false NOT NULL,
    remember_me boolean DEFAULT false NOT NULL,
    reset_password_allowed boolean DEFAULT false NOT NULL,
    social boolean DEFAULT false NOT NULL,
    ssl_required character varying(255),
    sso_idle_timeout integer,
    sso_max_lifespan integer,
    update_profile_on_soc_login boolean DEFAULT false NOT NULL,
    verify_email boolean DEFAULT false NOT NULL,
    master_admin_client character varying(36),
    login_lifespan integer,
    internationalization_enabled boolean DEFAULT false NOT NULL,
    default_locale character varying(255),
    reg_email_as_username boolean DEFAULT false NOT NULL,
    admin_events_enabled boolean DEFAULT false NOT NULL,
    admin_events_details_enabled boolean DEFAULT false NOT NULL,
    edit_username_allowed boolean DEFAULT false NOT NULL,
    otp_policy_counter integer DEFAULT 0,
    otp_policy_window integer DEFAULT 1,
    otp_policy_period integer DEFAULT 30,
    otp_policy_digits integer DEFAULT 6,
    otp_policy_alg character varying(36) DEFAULT 'HmacSHA1'::character varying,
    otp_policy_type character varying(36) DEFAULT 'totp'::character varying,
    browser_flow character varying(36),
    registration_flow character varying(36),
    direct_grant_flow character varying(36),
    reset_credentials_flow character varying(36),
    client_auth_flow character varying(36),
    offline_session_idle_timeout integer DEFAULT 0,
    revoke_refresh_token boolean DEFAULT false NOT NULL,
    access_token_life_implicit integer DEFAULT 0,
    login_with_email_allowed boolean DEFAULT true NOT NULL,
    duplicate_emails_allowed boolean DEFAULT false NOT NULL,
    docker_auth_flow character varying(36),
    refresh_token_max_reuse integer DEFAULT 0,
    allow_user_managed_access boolean DEFAULT false NOT NULL,
    sso_max_lifespan_remember_me integer DEFAULT 0 NOT NULL,
    sso_idle_timeout_remember_me integer DEFAULT 0 NOT NULL,
    default_role character varying(255)
);


--
-- Name: realm_attribute; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm_attribute (
    name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    value text
);


--
-- Name: realm_default_groups; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm_default_groups (
    realm_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


--
-- Name: realm_enabled_event_types; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm_enabled_event_types (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


--
-- Name: realm_events_listeners; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm_events_listeners (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


--
-- Name: realm_localizations; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm_localizations (
    realm_id character varying(255) NOT NULL,
    locale character varying(255) NOT NULL,
    texts text NOT NULL
);


--
-- Name: realm_required_credential; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm_required_credential (
    type character varying(255) NOT NULL,
    form_label character varying(255),
    input boolean DEFAULT false NOT NULL,
    secret boolean DEFAULT false NOT NULL,
    realm_id character varying(36) NOT NULL
);


--
-- Name: realm_smtp_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm_smtp_config (
    realm_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


--
-- Name: realm_supported_locales; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.realm_supported_locales (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


--
-- Name: redirect_uris; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.redirect_uris (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


--
-- Name: required_action_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.required_action_config (
    required_action_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


--
-- Name: required_action_provider; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.required_action_provider (
    id character varying(36) NOT NULL,
    alias character varying(255),
    name character varying(255),
    realm_id character varying(36),
    enabled boolean DEFAULT false NOT NULL,
    default_action boolean DEFAULT false NOT NULL,
    provider_id character varying(255),
    priority integer
);


--
-- Name: resource_attribute; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    resource_id character varying(36) NOT NULL
);


--
-- Name: resource_policy; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_policy (
    resource_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


--
-- Name: resource_scope; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_scope (
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


--
-- Name: resource_server; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_server (
    id character varying(36) NOT NULL,
    allow_rs_remote_mgmt boolean DEFAULT false NOT NULL,
    policy_enforce_mode smallint NOT NULL,
    decision_strategy smallint DEFAULT 1 NOT NULL
);


--
-- Name: resource_server_perm_ticket; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_server_perm_ticket (
    id character varying(36) NOT NULL,
    owner character varying(255) NOT NULL,
    requester character varying(255) NOT NULL,
    created_timestamp bigint NOT NULL,
    granted_timestamp bigint,
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36),
    resource_server_id character varying(36) NOT NULL,
    policy_id character varying(36)
);


--
-- Name: resource_server_policy; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_server_policy (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    type character varying(255) NOT NULL,
    decision_strategy smallint,
    logic smallint,
    resource_server_id character varying(36) NOT NULL,
    owner character varying(255)
);


--
-- Name: resource_server_resource; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_server_resource (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255),
    icon_uri character varying(255),
    owner character varying(255) NOT NULL,
    resource_server_id character varying(36) NOT NULL,
    owner_managed_access boolean DEFAULT false NOT NULL,
    display_name character varying(255)
);


--
-- Name: resource_server_scope; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_server_scope (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    icon_uri character varying(255),
    resource_server_id character varying(36) NOT NULL,
    display_name character varying(255)
);


--
-- Name: resource_uris; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.resource_uris (
    resource_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


--
-- Name: role_attribute; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.role_attribute (
    id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255)
);


--
-- Name: scope_mapping; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.scope_mapping (
    client_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


--
-- Name: scope_policy; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.scope_policy (
    scope_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


--
-- Name: user_attribute; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_attribute (
    name character varying(255) NOT NULL,
    value character varying(255),
    user_id character varying(36) NOT NULL,
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    long_value_hash bytea,
    long_value_hash_lower_case bytea,
    long_value text
);


--
-- Name: user_consent; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(36) NOT NULL,
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


--
-- Name: user_consent_client_scope; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_consent_client_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


--
-- Name: user_entity; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_entity (
    id character varying(36) NOT NULL,
    email character varying(255),
    email_constraint character varying(255),
    email_verified boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    federation_link character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    realm_id character varying(255),
    username character varying(255),
    created_timestamp bigint,
    service_account_client_link character varying(255),
    not_before integer DEFAULT 0 NOT NULL
);


--
-- Name: user_federation_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_federation_config (
    user_federation_provider_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


--
-- Name: user_federation_mapper; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_federation_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    federation_provider_id character varying(36) NOT NULL,
    federation_mapper_type character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


--
-- Name: user_federation_mapper_config; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_federation_mapper_config (
    user_federation_mapper_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


--
-- Name: user_federation_provider; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_federation_provider (
    id character varying(36) NOT NULL,
    changed_sync_period integer,
    display_name character varying(255),
    full_sync_period integer,
    last_sync integer,
    priority integer,
    provider_name character varying(255),
    realm_id character varying(36)
);


--
-- Name: user_group_membership; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL
);


--
-- Name: user_required_action; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_required_action (
    user_id character varying(36) NOT NULL,
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL
);


--
-- Name: user_role_mapping; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_role_mapping (
    role_id character varying(255) NOT NULL,
    user_id character varying(36) NOT NULL
);


--
-- Name: user_session; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_session (
    id character varying(36) NOT NULL,
    auth_method character varying(255),
    ip_address character varying(255),
    last_session_refresh integer,
    login_username character varying(255),
    realm_id character varying(255),
    remember_me boolean DEFAULT false NOT NULL,
    started integer,
    user_id character varying(255),
    user_session_state integer,
    broker_session_id character varying(255),
    broker_user_id character varying(255)
);


--
-- Name: user_session_note; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.user_session_note (
    user_session character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(2048)
);


--
-- Name: username_login_failure; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.username_login_failure (
    realm_id character varying(36) NOT NULL,
    username character varying(255) NOT NULL,
    failed_login_not_before integer,
    last_failure bigint,
    last_ip_failure character varying(255),
    num_failures integer
);


--
-- Name: web_origins; Type: TABLE; Schema: keycloak; Owner: -
--

CREATE TABLE keycloak.web_origins (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


--
-- Name: canonical_invoices; Type: TABLE; Schema: orders; Owner: -
--

CREATE TABLE orders.canonical_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    order_id uuid NOT NULL,
    shipment_id uuid,
    connection_id uuid NOT NULL,
    invoice_number character varying(100) NOT NULL,
    invoice_date timestamp with time zone NOT NULL,
    due_date timestamp with time zone,
    subtotal numeric(15,2) NOT NULL,
    tax_amount numeric(15,2) NOT NULL,
    tax_breakdown jsonb,
    total_amount numeric(15,2) NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'CREATED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_order_line_items; Type: TABLE; Schema: orders; Owner: -
--

CREATE TABLE orders.canonical_order_line_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    line_number integer NOT NULL,
    buyer_sku character varying(100) NOT NULL,
    factory_sku character varying(100),
    description text,
    quantity_ordered numeric(15,4) NOT NULL,
    quantity_uom character varying(10) DEFAULT 'EA'::character varying NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    line_total numeric(15,2) NOT NULL,
    upc character varying(14),
    hsn_code character varying(10),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_orders; Type: TABLE; Schema: orders; Owner: -
--

CREATE TABLE orders.canonical_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    buyer_po_number character varying(100) NOT NULL,
    factory_order_number character varying(100),
    order_date timestamp with time zone NOT NULL,
    requested_ship_date timestamp with time zone,
    ship_to jsonb,
    bill_to jsonb,
    buyer_contact jsonb,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(15,2) DEFAULT 0 NOT NULL,
    tax_config jsonb,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    source_type public.source_type NOT NULL,
    source_raw_payload text,
    source_claim_uri character varying(500),
    mapping_config_version integer DEFAULT 1 NOT NULL,
    status public.order_status DEFAULT 'DRAFT'::public.order_status NOT NULL,
    idempotency_key character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_returns; Type: TABLE; Schema: orders; Owner: -
--

CREATE TABLE orders.canonical_returns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    order_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    return_reason character varying(500),
    return_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    credit_amount numeric(15,2),
    status character varying(20) DEFAULT 'REQUESTED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_shipments; Type: TABLE; Schema: orders; Owner: -
--

CREATE TABLE orders.canonical_shipments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    order_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    shipment_date timestamp with time zone NOT NULL,
    carrier_name character varying(100),
    tracking_number character varying(100),
    ship_from jsonb,
    ship_to jsonb,
    weight numeric(10,2),
    weight_uom character varying(5) DEFAULT 'KG'::character varying,
    status character varying(20) DEFAULT 'CREATED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_log; Type: TABLE; Schema: orders; Owner: -
--

CREATE TABLE orders.message_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    order_id uuid,
    direction character varying(10) NOT NULL,
    message_type character varying(20) NOT NULL,
    edi_control_number character varying(20),
    edi_content_uri character varying(500),
    mdn_received boolean DEFAULT false,
    mdn_content text,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_log_direction_check CHECK (((direction)::text = ANY ((ARRAY['INBOUND'::character varying, 'OUTBOUND'::character varying])::text[])))
);


--
-- Name: shipment_packs; Type: TABLE; Schema: orders; Owner: -
--

CREATE TABLE orders.shipment_packs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    sscc character varying(20),
    pack_type character varying(20) DEFAULT 'CARTON'::character varying,
    weight numeric(10,2),
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_config; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.app_config (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value jsonb NOT NULL,
    description text,
    updated_by character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calendar_entries; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.calendar_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    entry_date date NOT NULL,
    entry_type character varying(30) DEFAULT 'holiday'::character varying NOT NULL,
    source character varying(30) DEFAULT 'manual'::character varying NOT NULL,
    priority integer DEFAULT 50 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: commission_ledger; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.commission_ledger (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    partner_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    period character varying(7) NOT NULL,
    amount_inr numeric(12,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    paid_at timestamp with time zone,
    payment_reference character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: escalation_log; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.escalation_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    connection_id uuid,
    trigger_reason character varying(255) NOT NULL,
    current_step integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    trigger_type character varying(100),
    trigger_details jsonb
);


--
-- Name: escalation_rules; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.escalation_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    step_number integer NOT NULL,
    channel character varying(20) NOT NULL,
    wait_minutes integer NOT NULL,
    template_id uuid,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: factory_preferences; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.factory_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    flag_name character varying(100) NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_flags; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.feature_flags (
    flag_name character varying(100) NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_templates; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.notification_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_key character varying(100) NOT NULL,
    channel character varying(20) NOT NULL,
    event_type character varying(50) NOT NULL,
    subject character varying(500),
    body_template text NOT NULL,
    language character varying(5) DEFAULT 'en'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_templates_channel_check CHECK (((channel)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'whatsapp'::character varying, 'in_app'::character varying])::text[])))
);


--
-- Name: operational_profile; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.operational_profile (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    business_hours jsonb DEFAULT '{"end": "18:00", "start": "09:00"}'::jsonb NOT NULL,
    weekly_off jsonb DEFAULT '["Sunday"]'::jsonb NOT NULL,
    avg_orders_per_day numeric(6,1) DEFAULT 0,
    silence_threshold_hours integer DEFAULT 24 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: partner_referrals; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.partner_referrals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    partner_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    referral_code character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    referred_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: partners; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.partners (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    partner_type character varying(50) DEFAULT 'reseller'::character varying NOT NULL,
    contact_email character varying(255) NOT NULL,
    contact_phone character varying(50),
    commission_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: relationship_registry; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.relationship_registry (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parent_table character varying(100) NOT NULL,
    parent_column character varying(100) NOT NULL,
    child_table character varying(100) NOT NULL,
    child_column character varying(100) NOT NULL,
    relationship_type character varying(20) DEFAULT 'FK'::character varying NOT NULL,
    blocks_revert boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_deliveries; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.webhook_deliveries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    subscription_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_subscriptions; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.webhook_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    url character varying(500) NOT NULL,
    secret character varying(255) NOT NULL,
    events jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_delivery_at timestamp with time zone,
    failure_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_headers jsonb
);


--
-- Name: ai_fix_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_fix_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid,
    agent_id character varying(100),
    error_code character varying(100) NOT NULL,
    fix_type character varying(50) NOT NULL,
    risk_level character varying(10) NOT NULL,
    fix_description text NOT NULL,
    fix_result character varying(20) NOT NULL,
    reverted boolean DEFAULT false NOT NULL,
    approved_by character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_fix_log_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[])))
);


--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_config (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value jsonb NOT NULL,
    description text,
    updated_by character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    factory_id uuid,
    user_id character varying(255),
    action public.audit_action NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    old_record jsonb,
    new_record jsonb,
    ip_address inet,
    correlation_id character varying(255),
    hash character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    actor_id character varying(255),
    metadata jsonb
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: barcode_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barcode_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    barcode_type character varying(20) DEFAULT 'SSCC-18'::character varying NOT NULL,
    prefix character varying(20),
    next_sequence bigint DEFAULT 1 NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: buyers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buyers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    buyer_identifier character varying(100) NOT NULL,
    edi_qualifier character varying(10),
    edi_id character varying(30),
    as2_id character varying(100),
    as2_url character varying(500),
    protocol character varying(20) DEFAULT 'edi_x12'::character varying NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ca_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    factory_id uuid,
    business_name character varying(255) NOT NULL,
    gstin_encrypted text,
    pan_encrypted text,
    business_type character varying(50),
    industry character varying(100),
    annual_turnover_bracket character varying(50),
    tally_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    bridge_agent_id uuid,
    primary_contact_name character varying(255),
    primary_contact_phone character varying(20),
    primary_contact_email character varying(255),
    whatsapp_number character varying(20),
    preferred_channel character varying(20) DEFAULT 'whatsapp'::character varying NOT NULL,
    assigned_staff_id uuid,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    health_score numeric(3,1),
    health_score_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ca_firm_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_firm_staff (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.staff_role NOT NULL,
    assigned_clients uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ca_firms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_firms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    registration_number character varying(100) NOT NULL,
    gst_number character varying(15) NOT NULL,
    subscription_tier public.ca_subscription_tier DEFAULT 'trial'::public.ca_subscription_tier NOT NULL,
    max_clients integer DEFAULT 20 NOT NULL,
    owner_user_id uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calendar_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    entry_date date NOT NULL,
    entry_type character varying(30) DEFAULT 'holiday'::character varying NOT NULL,
    source character varying(30) DEFAULT 'manual'::character varying NOT NULL,
    priority integer DEFAULT 50 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    order_id uuid NOT NULL,
    shipment_id uuid,
    connection_id uuid NOT NULL,
    invoice_number character varying(100) NOT NULL,
    invoice_date timestamp with time zone NOT NULL,
    due_date timestamp with time zone,
    subtotal numeric(15,2) NOT NULL,
    tax_amount numeric(15,2) NOT NULL,
    tax_breakdown jsonb,
    total_amount numeric(15,2) NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'CREATED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_order_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_order_line_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    line_number integer NOT NULL,
    buyer_sku character varying(100) NOT NULL,
    factory_sku character varying(100),
    description text,
    quantity_ordered numeric(15,4) NOT NULL,
    quantity_uom character varying(10) DEFAULT 'EA'::character varying NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    line_total numeric(15,2) NOT NULL,
    upc character varying(14),
    hsn_code character varying(10),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    buyer_po_number character varying(100) NOT NULL,
    factory_order_number character varying(100),
    order_date timestamp with time zone NOT NULL,
    requested_ship_date timestamp with time zone,
    ship_to jsonb,
    bill_to jsonb,
    buyer_contact jsonb,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(15,2) DEFAULT 0 NOT NULL,
    tax_config jsonb,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    source_type public.source_type NOT NULL,
    source_raw_payload text,
    source_claim_uri character varying(500),
    mapping_config_version integer DEFAULT 1 NOT NULL,
    status public.order_status DEFAULT 'DRAFT'::public.order_status NOT NULL,
    idempotency_key character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_returns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    order_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    return_reason character varying(500),
    return_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    credit_amount numeric(15,2),
    status character varying(20) DEFAULT 'REQUESTED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_shipments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    order_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    shipment_date timestamp with time zone NOT NULL,
    carrier_name character varying(100),
    tracking_number character varying(100),
    ship_from jsonb,
    ship_to jsonb,
    weight numeric(10,2),
    weight_uom character varying(5) DEFAULT 'KG'::character varying,
    status character varying(20) DEFAULT 'CREATED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_health_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_health_scores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    score_date date NOT NULL,
    overall_score numeric(3,1),
    compliance_score numeric(3,1),
    financial_score numeric(3,1),
    data_quality_score numeric(3,1),
    attention_needed boolean DEFAULT false NOT NULL,
    risk_factors jsonb,
    recommendations jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: commission_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_ledger (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    partner_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    period character varying(7) NOT NULL,
    amount_inr numeric(12,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    paid_at timestamp with time zone,
    payment_reference character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: communication_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    channel character varying(20) NOT NULL,
    direction character varying(20) NOT NULL,
    message_type character varying(50),
    template_id uuid,
    content text,
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    external_id character varying(100),
    error_message text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: compliance_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_exceptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    filing_id uuid NOT NULL,
    client_id uuid NOT NULL,
    ca_firm_id uuid NOT NULL,
    exception_type character varying(50) NOT NULL,
    severity public.compliance_severity NOT NULL,
    description text,
    source_data jsonb,
    suggested_fix text,
    status public.exception_status DEFAULT 'open'::public.exception_status NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: compliance_filings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_filings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    filing_type character varying(50) NOT NULL,
    period character varying(20) NOT NULL,
    status public.filing_status DEFAULT 'pending'::public.filing_status NOT NULL,
    due_date date,
    filed_date date,
    data_snapshot jsonb,
    validation_results jsonb,
    exceptions jsonb DEFAULT '[]'::jsonb,
    filed_reference character varying(100),
    prepared_by uuid,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    mode public.connection_mode DEFAULT 'sandbox'::public.connection_mode NOT NULL,
    source_type public.source_type DEFAULT 'tally'::public.source_type NOT NULL,
    sla_config jsonb DEFAULT '{"ack_hours": 2, "asn_hours": 24, "invoice_hours": 48}'::jsonb NOT NULL,
    tax_config jsonb DEFAULT '{"rate": 18, "type": "GST", "components": ["CGST", "SGST"]}'::jsonb NOT NULL,
    mapping_config_id uuid,
    circuit_breaker_state character varying(20) DEFAULT 'CLOSED'::character varying NOT NULL,
    circuit_breaker_failures integer DEFAULT 0 NOT NULL,
    circuit_breaker_last_failure timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    protocol character varying(50),
    buyer_endpoint text,
    credentials jsonb,
    currency_config jsonb,
    barcode_config jsonb,
    partial_shipment_allowed boolean DEFAULT false NOT NULL,
    sla_ack_hours integer,
    sla_ship_hours integer,
    sla_invoice_hours integer
);


--
-- Name: connector_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connector_catalog (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    connector_type character varying(20) NOT NULL,
    protocol character varying(30) NOT NULL,
    supported_flows jsonb DEFAULT '[]'::jsonb NOT NULL,
    description text,
    icon_url character varying(500),
    sample_payload jsonb,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT connector_catalog_connector_type_check CHECK (((connector_type)::text = ANY ((ARRAY['source'::character varying, 'target'::character varying])::text[])))
);


--
-- Name: connector_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connector_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid,
    connector_name character varying(255) NOT NULL,
    connector_type character varying(20) NOT NULL,
    description text,
    vote_count integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    request_type character varying(50) NOT NULL,
    description text,
    due_date date,
    status public.document_request_status DEFAULT 'pending'::public.document_request_status NOT NULL,
    channel character varying(20) DEFAULT 'whatsapp'::character varying NOT NULL,
    sent_at timestamp with time zone,
    reminder_count integer DEFAULT 0 NOT NULL,
    last_reminder_at timestamp with time zone,
    max_reminders integer DEFAULT 3 NOT NULL,
    reminder_interval_days integer DEFAULT 3 NOT NULL,
    received_at timestamp with time zone,
    document_url text,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid,
    template_type character varying(50) NOT NULL,
    channel character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    subject character varying(500),
    body_template text NOT NULL,
    variables jsonb,
    language character varying(10) DEFAULT 'en'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: escalation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escalation_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    connection_id uuid,
    trigger_reason character varying(255) NOT NULL,
    current_step integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    trigger_type character varying(100),
    trigger_details jsonb
);


--
-- Name: escalation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escalation_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    step_number integer NOT NULL,
    channel character varying(20) NOT NULL,
    wait_minutes integer NOT NULL,
    template_id uuid,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: factories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    factory_type smallint NOT NULL,
    gstin_encrypted text,
    pan_encrypted text,
    contact_email character varying(255) NOT NULL,
    contact_phone character varying(20),
    address jsonb,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    timezone character varying(50) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT factories_factory_type_check CHECK (((factory_type >= 1) AND (factory_type <= 4)))
);


--
-- Name: factory_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factory_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    flag_name character varying(100) NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    flag_name character varying(100) NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: impersonation_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impersonation_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fc_operator_id character varying(255) NOT NULL,
    factory_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    actions_performed integer DEFAULT 0 NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: item_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_master (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    factory_sku character varying(100) NOT NULL,
    buyer_sku character varying(100),
    buyer_id uuid,
    description text,
    upc character varying(14),
    hsn_code character varying(10),
    default_uom character varying(10) DEFAULT 'EA'::character varying NOT NULL,
    unit_price numeric(15,4),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: llm_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.llm_cache (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    prompt_hash character varying(64) NOT NULL,
    task_type character varying(50) NOT NULL,
    model character varying(100) NOT NULL,
    response jsonb NOT NULL,
    confidence numeric(3,2),
    hit_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);


--
-- Name: llm_usage_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.llm_usage_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    provider character varying(50) NOT NULL,
    model character varying(100) NOT NULL,
    task_type character varying(50) NOT NULL,
    prompt_hash character varying(64) NOT NULL,
    input_tokens integer,
    output_tokens integer,
    latency_ms integer,
    cost_usd numeric(10,6),
    success boolean DEFAULT true NOT NULL,
    human_override boolean DEFAULT false,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mapping_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mapping_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_type public.source_type NOT NULL,
    field_mappings jsonb DEFAULT '[]'::jsonb NOT NULL,
    transform_rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    order_id uuid,
    direction character varying(10) NOT NULL,
    message_type character varying(20) NOT NULL,
    edi_control_number character varying(20),
    edi_content_uri character varying(500),
    mdn_received boolean DEFAULT false,
    mdn_content text,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_log_direction_check CHECK (((direction)::text = ANY ((ARRAY['INBOUND'::character varying, 'OUTBOUND'::character varying])::text[])))
);


--
-- Name: notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    notice_type character varying(50) NOT NULL,
    reference_number character varying(100),
    issuing_authority character varying(255),
    received_date date,
    response_due_date date,
    amount_demanded numeric(15,2),
    status public.notice_status DEFAULT 'received'::public.notice_status NOT NULL,
    priority public.notice_priority DEFAULT 'medium'::public.notice_priority NOT NULL,
    description text,
    document_url text,
    response_document_url text,
    assigned_to uuid,
    resolution_notes text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_key character varying(100) NOT NULL,
    channel character varying(20) NOT NULL,
    event_type character varying(50) NOT NULL,
    subject character varying(500),
    body_template text NOT NULL,
    language character varying(5) DEFAULT 'en'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_templates_channel_check CHECK (((channel)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'whatsapp'::character varying, 'in_app'::character varying])::text[])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    user_id character varying(255),
    channel character varying(50) DEFAULT 'in_app'::character varying NOT NULL,
    severity character varying(20) DEFAULT 'info'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: operational_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operational_profile (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    business_hours jsonb DEFAULT '{"end": "18:00", "start": "09:00"}'::jsonb NOT NULL,
    weekly_off jsonb DEFAULT '["Sunday"]'::jsonb NOT NULL,
    avg_orders_per_day numeric(6,1) DEFAULT 0,
    silence_threshold_hours integer DEFAULT 24 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_sagas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_sagas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    current_step public.saga_step DEFAULT 'PO_RECEIVED'::public.saga_step NOT NULL,
    step_deadline timestamp with time zone,
    locked_by character varying(100),
    lock_expires timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 5 NOT NULL,
    compensation_needed boolean DEFAULT false NOT NULL,
    compensation_reason character varying(500),
    error_code character varying(100),
    error_message text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    connection_id uuid,
    compensation_data jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    aggregate_type character varying(50) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type public.outbox_event_type NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_attempt_at timestamp with time zone,
    payload_claim_uri character varying(500),
    CONSTRAINT outbox_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'ack'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: partner_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_referrals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    partner_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    referral_code character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    referred_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    partner_type character varying(50) DEFAULT 'reseller'::character varying NOT NULL,
    contact_email character varying(255) NOT NULL,
    contact_phone character varying(50),
    commission_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rate_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    item_id uuid NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reconciliation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id uuid NOT NULL,
    source_record jsonb,
    target_record jsonb,
    match_status public.match_status,
    variance_amount numeric(15,2),
    variance_reason text,
    resolution text,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reconciliation_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    client_id uuid NOT NULL,
    recon_type character varying(50) NOT NULL,
    period character varying(20) NOT NULL,
    status public.reconciliation_status DEFAULT 'pending'::public.reconciliation_status NOT NULL,
    source_count integer,
    target_count integer,
    matched_count integer DEFAULT 0 NOT NULL,
    unmatched_source integer DEFAULT 0 NOT NULL,
    unmatched_target integer DEFAULT 0 NOT NULL,
    variance_amount numeric(15,2) DEFAULT 0 NOT NULL,
    summary jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: record_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.record_history (
    id bigint NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id uuid,
    operation character varying(10) NOT NULL,
    old_record jsonb,
    new_record jsonb,
    changed_by character varying(255),
    tenant_id uuid,
    correlation_id character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: record_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.record_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: record_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.record_history_id_seq OWNED BY public.record_history.id;


--
-- Name: relationship_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relationship_registry (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parent_table character varying(100) NOT NULL,
    parent_column character varying(100) NOT NULL,
    child_table character varying(100) NOT NULL,
    child_column character varying(100) NOT NULL,
    relationship_type character varying(20) DEFAULT 'FK'::character varying NOT NULL,
    blocks_revert boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resync_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resync_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    resync_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    original_order_id uuid NOT NULL,
    new_idempotency_key character varying(255) NOT NULL,
    new_control_number character varying(20),
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    error_message text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resync_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resync_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    requested_by character varying(255) NOT NULL,
    target_mode public.connection_mode DEFAULT 'uat'::public.connection_mode NOT NULL,
    status public.resync_status DEFAULT 'REQUESTED'::public.resync_status NOT NULL,
    item_count integer DEFAULT 0 NOT NULL,
    completed_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resync_type character varying(50),
    reason text
);


--
-- Name: routing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routing_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    buyer_identifier character varying(100) NOT NULL,
    connection_id uuid NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: shipment_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_packs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    sscc character varying(20),
    pack_type character varying(20) DEFAULT 'CARTON'::character varying,
    weight numeric(10,2),
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_activity_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ca_firm_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    client_id uuid,
    activity_type character varying(100) NOT NULL,
    duration_minutes integer,
    description text,
    activity_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_tiers (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    max_clients integer NOT NULL,
    price_per_client_monthly numeric(10,2),
    base_price_monthly numeric(10,2),
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    delivered_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_deliveries_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'delivered'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: webhook_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    url character varying(500) NOT NULL,
    secret character varying(255) NOT NULL,
    events jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_delivery_at timestamp with time zone,
    failure_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_headers jsonb
);


--
-- Name: order_sagas; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.order_sagas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    current_step public.saga_step DEFAULT 'PO_RECEIVED'::public.saga_step NOT NULL,
    step_deadline timestamp with time zone,
    locked_by character varying(100),
    lock_expires timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 5 NOT NULL,
    compensation_needed boolean DEFAULT false NOT NULL,
    compensation_reason character varying(500),
    error_code character varying(100),
    error_message text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    connection_id uuid,
    compensation_data jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: outbox; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.outbox (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    aggregate_type character varying(50) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type public.outbox_event_type NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_attempt_at timestamp with time zone,
    payload_claim_uri character varying(500),
    CONSTRAINT outbox_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'ack'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: resync_items; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.resync_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    resync_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    original_order_id uuid NOT NULL,
    new_idempotency_key character varying(255) NOT NULL,
    new_control_number character varying(20),
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    error_message text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resync_requests; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.resync_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    requested_by character varying(255) NOT NULL,
    target_mode public.connection_mode DEFAULT 'uat'::public.connection_mode NOT NULL,
    status public.resync_status DEFAULT 'REQUESTED'::public.resync_status NOT NULL,
    item_count integer DEFAULT 0 NOT NULL,
    completed_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resync_type character varying(50),
    reason text
);


--
-- Name: routing_rules; Type: TABLE; Schema: workflow; Owner: -
--

CREATE TABLE workflow.routing_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    factory_id uuid NOT NULL,
    buyer_identifier character varying(100) NOT NULL,
    connection_id uuid NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log id; Type: DEFAULT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_log ALTER COLUMN id SET DEFAULT nextval('audit.audit_log_id_seq'::regclass);


--
-- Name: record_history id; Type: DEFAULT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.record_history ALTER COLUMN id SET DEFAULT nextval('audit.record_history_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: record_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_history ALTER COLUMN id SET DEFAULT nextval('public.record_history_id_seq'::regclass);


--
-- Name: ai_fix_log ai_fix_log_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.ai_fix_log
    ADD CONSTRAINT ai_fix_log_pkey PRIMARY KEY (id);


--
-- Name: llm_cache llm_cache_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.llm_cache
    ADD CONSTRAINT llm_cache_pkey PRIMARY KEY (id);


--
-- Name: llm_cache llm_cache_prompt_hash_key; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.llm_cache
    ADD CONSTRAINT llm_cache_prompt_hash_key UNIQUE (prompt_hash);


--
-- Name: llm_usage_log llm_usage_log_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.llm_usage_log
    ADD CONSTRAINT llm_usage_log_pkey PRIMARY KEY (id);


--
-- Name: mapping_configs mapping_configs_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.mapping_configs
    ADD CONSTRAINT mapping_configs_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: impersonation_sessions impersonation_sessions_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.impersonation_sessions
    ADD CONSTRAINT impersonation_sessions_pkey PRIMARY KEY (id);


--
-- Name: record_history record_history_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.record_history
    ADD CONSTRAINT record_history_pkey PRIMARY KEY (id);


--
-- Name: ca_clients ca_clients_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.ca_clients
    ADD CONSTRAINT ca_clients_pkey PRIMARY KEY (id);


--
-- Name: ca_firm_staff ca_firm_staff_ca_firm_id_email_key; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.ca_firm_staff
    ADD CONSTRAINT ca_firm_staff_ca_firm_id_email_key UNIQUE (ca_firm_id, email);


--
-- Name: ca_firm_staff ca_firm_staff_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.ca_firm_staff
    ADD CONSTRAINT ca_firm_staff_pkey PRIMARY KEY (id);


--
-- Name: ca_firms ca_firms_membership_number_key; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.ca_firms
    ADD CONSTRAINT ca_firms_membership_number_key UNIQUE (membership_number);


--
-- Name: ca_firms ca_firms_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.ca_firms
    ADD CONSTRAINT ca_firms_pkey PRIMARY KEY (id);


--
-- Name: client_health_scores client_health_scores_client_id_computed_at_key; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.client_health_scores
    ADD CONSTRAINT client_health_scores_client_id_computed_at_key UNIQUE (client_id, computed_at);


--
-- Name: client_health_scores client_health_scores_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.client_health_scores
    ADD CONSTRAINT client_health_scores_pkey PRIMARY KEY (id);


--
-- Name: communication_log communication_log_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.communication_log
    ADD CONSTRAINT communication_log_pkey PRIMARY KEY (id);


--
-- Name: compliance_exceptions compliance_exceptions_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_pkey PRIMARY KEY (id);


--
-- Name: compliance_filings compliance_filings_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_filings
    ADD CONSTRAINT compliance_filings_pkey PRIMARY KEY (id);


--
-- Name: document_requests document_requests_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.document_requests
    ADD CONSTRAINT document_requests_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_items reconciliation_items_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.reconciliation_items
    ADD CONSTRAINT reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_sessions reconciliation_sessions_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.reconciliation_sessions
    ADD CONSTRAINT reconciliation_sessions_pkey PRIMARY KEY (id);


--
-- Name: staff_activity_log staff_activity_log_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.staff_activity_log
    ADD CONSTRAINT staff_activity_log_pkey PRIMARY KEY (id);


--
-- Name: subscription_tiers subscription_tiers_pkey; Type: CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.subscription_tiers
    ADD CONSTRAINT subscription_tiers_pkey PRIMARY KEY (id);


--
-- Name: barcode_configs barcode_configs_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.barcode_configs
    ADD CONSTRAINT barcode_configs_pkey PRIMARY KEY (id);


--
-- Name: buyers buyers_factory_id_buyer_identifier_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.buyers
    ADD CONSTRAINT buyers_factory_id_buyer_identifier_key UNIQUE (factory_id, buyer_identifier);


--
-- Name: buyers buyers_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.buyers
    ADD CONSTRAINT buyers_pkey PRIMARY KEY (id);


--
-- Name: connections connections_factory_id_buyer_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.connections
    ADD CONSTRAINT connections_factory_id_buyer_id_key UNIQUE (factory_id, buyer_id);


--
-- Name: connections connections_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.connections
    ADD CONSTRAINT connections_pkey PRIMARY KEY (id);


--
-- Name: connector_catalog connector_catalog_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.connector_catalog
    ADD CONSTRAINT connector_catalog_pkey PRIMARY KEY (id);


--
-- Name: connector_requests connector_requests_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.connector_requests
    ADD CONSTRAINT connector_requests_pkey PRIMARY KEY (id);


--
-- Name: factories factories_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.factories
    ADD CONSTRAINT factories_pkey PRIMARY KEY (id);


--
-- Name: factories factories_slug_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.factories
    ADD CONSTRAINT factories_slug_key UNIQUE (slug);


--
-- Name: item_master item_master_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.item_master
    ADD CONSTRAINT item_master_pkey PRIMARY KEY (id);


--
-- Name: rate_cards rate_cards_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.rate_cards
    ADD CONSTRAINT rate_cards_pkey PRIMARY KEY (id);


--
-- Name: username_login_failure CONSTRAINT_17-2; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.username_login_failure
    ADD CONSTRAINT "CONSTRAINT_17-2" PRIMARY KEY (realm_id, username);


--
-- Name: keycloak_role UK_J3RWUVD56ONTGSUHOGM184WW2-2; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT "UK_J3RWUVD56ONTGSUHOGM184WW2-2" UNIQUE (name, client_realm_constraint);


--
-- Name: client_auth_flow_bindings c_cli_flow_bind; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_auth_flow_bindings
    ADD CONSTRAINT c_cli_flow_bind PRIMARY KEY (client_id, binding_name);


--
-- Name: client_scope_client c_cli_scope_bind; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_scope_client
    ADD CONSTRAINT c_cli_scope_bind PRIMARY KEY (client_id, scope_id);


--
-- Name: client_initial_access cnstr_client_init_acc_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_initial_access
    ADD CONSTRAINT cnstr_client_init_acc_pk PRIMARY KEY (id);


--
-- Name: realm_default_groups con_group_id_def_groups; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT con_group_id_def_groups UNIQUE (group_id);


--
-- Name: broker_link constr_broker_link_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.broker_link
    ADD CONSTRAINT constr_broker_link_pk PRIMARY KEY (identity_provider, user_id);


--
-- Name: client_user_session_note constr_cl_usr_ses_note; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_user_session_note
    ADD CONSTRAINT constr_cl_usr_ses_note PRIMARY KEY (client_session, name);


--
-- Name: component_config constr_component_config_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.component_config
    ADD CONSTRAINT constr_component_config_pk PRIMARY KEY (id);


--
-- Name: component constr_component_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.component
    ADD CONSTRAINT constr_component_pk PRIMARY KEY (id);


--
-- Name: fed_user_required_action constr_fed_required_action; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.fed_user_required_action
    ADD CONSTRAINT constr_fed_required_action PRIMARY KEY (required_action, user_id);


--
-- Name: fed_user_attribute constr_fed_user_attr_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.fed_user_attribute
    ADD CONSTRAINT constr_fed_user_attr_pk PRIMARY KEY (id);


--
-- Name: fed_user_consent constr_fed_user_consent_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.fed_user_consent
    ADD CONSTRAINT constr_fed_user_consent_pk PRIMARY KEY (id);


--
-- Name: fed_user_credential constr_fed_user_cred_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.fed_user_credential
    ADD CONSTRAINT constr_fed_user_cred_pk PRIMARY KEY (id);


--
-- Name: fed_user_group_membership constr_fed_user_group; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.fed_user_group_membership
    ADD CONSTRAINT constr_fed_user_group PRIMARY KEY (group_id, user_id);


--
-- Name: fed_user_role_mapping constr_fed_user_role; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.fed_user_role_mapping
    ADD CONSTRAINT constr_fed_user_role PRIMARY KEY (role_id, user_id);


--
-- Name: federated_user constr_federated_user; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.federated_user
    ADD CONSTRAINT constr_federated_user PRIMARY KEY (id);


--
-- Name: realm_default_groups constr_realm_default_groups; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT constr_realm_default_groups PRIMARY KEY (realm_id, group_id);


--
-- Name: realm_enabled_event_types constr_realm_enabl_event_types; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_enabled_event_types
    ADD CONSTRAINT constr_realm_enabl_event_types PRIMARY KEY (realm_id, value);


--
-- Name: realm_events_listeners constr_realm_events_listeners; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_events_listeners
    ADD CONSTRAINT constr_realm_events_listeners PRIMARY KEY (realm_id, value);


--
-- Name: realm_supported_locales constr_realm_supported_locales; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_supported_locales
    ADD CONSTRAINT constr_realm_supported_locales PRIMARY KEY (realm_id, value);


--
-- Name: identity_provider constraint_2b; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT constraint_2b PRIMARY KEY (internal_id);


--
-- Name: client_attributes constraint_3c; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_attributes
    ADD CONSTRAINT constraint_3c PRIMARY KEY (client_id, name);


--
-- Name: event_entity constraint_4; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.event_entity
    ADD CONSTRAINT constraint_4 PRIMARY KEY (id);


--
-- Name: federated_identity constraint_40; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.federated_identity
    ADD CONSTRAINT constraint_40 PRIMARY KEY (identity_provider, user_id);


--
-- Name: realm constraint_4a; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm
    ADD CONSTRAINT constraint_4a PRIMARY KEY (id);


--
-- Name: client_session_role constraint_5; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session_role
    ADD CONSTRAINT constraint_5 PRIMARY KEY (client_session, role_id);


--
-- Name: user_session constraint_57; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_session
    ADD CONSTRAINT constraint_57 PRIMARY KEY (id);


--
-- Name: user_federation_provider constraint_5c; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_provider
    ADD CONSTRAINT constraint_5c PRIMARY KEY (id);


--
-- Name: client_session_note constraint_5e; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session_note
    ADD CONSTRAINT constraint_5e PRIMARY KEY (client_session, name);


--
-- Name: client constraint_7; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client
    ADD CONSTRAINT constraint_7 PRIMARY KEY (id);


--
-- Name: client_session constraint_8; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session
    ADD CONSTRAINT constraint_8 PRIMARY KEY (id);


--
-- Name: scope_mapping constraint_81; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.scope_mapping
    ADD CONSTRAINT constraint_81 PRIMARY KEY (client_id, role_id);


--
-- Name: client_node_registrations constraint_84; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_node_registrations
    ADD CONSTRAINT constraint_84 PRIMARY KEY (client_id, name);


--
-- Name: realm_attribute constraint_9; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_attribute
    ADD CONSTRAINT constraint_9 PRIMARY KEY (name, realm_id);


--
-- Name: realm_required_credential constraint_92; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_required_credential
    ADD CONSTRAINT constraint_92 PRIMARY KEY (realm_id, type);


--
-- Name: keycloak_role constraint_a; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT constraint_a PRIMARY KEY (id);


--
-- Name: admin_event_entity constraint_admin_event_entity; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.admin_event_entity
    ADD CONSTRAINT constraint_admin_event_entity PRIMARY KEY (id);


--
-- Name: authenticator_config_entry constraint_auth_cfg_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.authenticator_config_entry
    ADD CONSTRAINT constraint_auth_cfg_pk PRIMARY KEY (authenticator_id, name);


--
-- Name: authentication_execution constraint_auth_exec_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT constraint_auth_exec_pk PRIMARY KEY (id);


--
-- Name: authentication_flow constraint_auth_flow_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.authentication_flow
    ADD CONSTRAINT constraint_auth_flow_pk PRIMARY KEY (id);


--
-- Name: authenticator_config constraint_auth_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.authenticator_config
    ADD CONSTRAINT constraint_auth_pk PRIMARY KEY (id);


--
-- Name: client_session_auth_status constraint_auth_status_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session_auth_status
    ADD CONSTRAINT constraint_auth_status_pk PRIMARY KEY (client_session, authenticator);


--
-- Name: user_role_mapping constraint_c; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_role_mapping
    ADD CONSTRAINT constraint_c PRIMARY KEY (role_id, user_id);


--
-- Name: composite_role constraint_composite_role; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT constraint_composite_role PRIMARY KEY (composite, child_role);


--
-- Name: client_session_prot_mapper constraint_cs_pmp_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session_prot_mapper
    ADD CONSTRAINT constraint_cs_pmp_pk PRIMARY KEY (client_session, protocol_mapper_id);


--
-- Name: identity_provider_config constraint_d; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.identity_provider_config
    ADD CONSTRAINT constraint_d PRIMARY KEY (identity_provider_id, name);


--
-- Name: policy_config constraint_dpc; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.policy_config
    ADD CONSTRAINT constraint_dpc PRIMARY KEY (policy_id, name);


--
-- Name: realm_smtp_config constraint_e; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_smtp_config
    ADD CONSTRAINT constraint_e PRIMARY KEY (realm_id, name);


--
-- Name: credential constraint_f; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.credential
    ADD CONSTRAINT constraint_f PRIMARY KEY (id);


--
-- Name: user_federation_config constraint_f9; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_config
    ADD CONSTRAINT constraint_f9 PRIMARY KEY (user_federation_provider_id, name);


--
-- Name: resource_server_perm_ticket constraint_fapmt; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT constraint_fapmt PRIMARY KEY (id);


--
-- Name: resource_server_resource constraint_farsr; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT constraint_farsr PRIMARY KEY (id);


--
-- Name: resource_server_policy constraint_farsrp; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT constraint_farsrp PRIMARY KEY (id);


--
-- Name: associated_policy constraint_farsrpap; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT constraint_farsrpap PRIMARY KEY (policy_id, associated_policy_id);


--
-- Name: resource_policy constraint_farsrpp; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT constraint_farsrpp PRIMARY KEY (resource_id, policy_id);


--
-- Name: resource_server_scope constraint_farsrs; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT constraint_farsrs PRIMARY KEY (id);


--
-- Name: resource_scope constraint_farsrsp; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT constraint_farsrsp PRIMARY KEY (resource_id, scope_id);


--
-- Name: scope_policy constraint_farsrsps; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT constraint_farsrsps PRIMARY KEY (scope_id, policy_id);


--
-- Name: user_entity constraint_fb; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT constraint_fb PRIMARY KEY (id);


--
-- Name: user_federation_mapper_config constraint_fedmapper_cfg_pm; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_mapper_config
    ADD CONSTRAINT constraint_fedmapper_cfg_pm PRIMARY KEY (user_federation_mapper_id, name);


--
-- Name: user_federation_mapper constraint_fedmapperpm; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT constraint_fedmapperpm PRIMARY KEY (id);


--
-- Name: fed_user_consent_cl_scope constraint_fgrntcsnt_clsc_pm; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.fed_user_consent_cl_scope
    ADD CONSTRAINT constraint_fgrntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- Name: user_consent_client_scope constraint_grntcsnt_clsc_pm; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_consent_client_scope
    ADD CONSTRAINT constraint_grntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- Name: user_consent constraint_grntcsnt_pm; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT constraint_grntcsnt_pm PRIMARY KEY (id);


--
-- Name: keycloak_group constraint_group; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.keycloak_group
    ADD CONSTRAINT constraint_group PRIMARY KEY (id);


--
-- Name: group_attribute constraint_group_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.group_attribute
    ADD CONSTRAINT constraint_group_attribute_pk PRIMARY KEY (id);


--
-- Name: group_role_mapping constraint_group_role; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.group_role_mapping
    ADD CONSTRAINT constraint_group_role PRIMARY KEY (role_id, group_id);


--
-- Name: identity_provider_mapper constraint_idpm; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.identity_provider_mapper
    ADD CONSTRAINT constraint_idpm PRIMARY KEY (id);


--
-- Name: idp_mapper_config constraint_idpmconfig; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.idp_mapper_config
    ADD CONSTRAINT constraint_idpmconfig PRIMARY KEY (idp_mapper_id, name);


--
-- Name: migration_model constraint_migmod; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.migration_model
    ADD CONSTRAINT constraint_migmod PRIMARY KEY (id);


--
-- Name: offline_client_session constraint_offl_cl_ses_pk3; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.offline_client_session
    ADD CONSTRAINT constraint_offl_cl_ses_pk3 PRIMARY KEY (user_session_id, client_id, client_storage_provider, external_client_id, offline_flag);


--
-- Name: offline_user_session constraint_offl_us_ses_pk2; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.offline_user_session
    ADD CONSTRAINT constraint_offl_us_ses_pk2 PRIMARY KEY (user_session_id, offline_flag);


--
-- Name: protocol_mapper constraint_pcm; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT constraint_pcm PRIMARY KEY (id);


--
-- Name: protocol_mapper_config constraint_pmconfig; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.protocol_mapper_config
    ADD CONSTRAINT constraint_pmconfig PRIMARY KEY (protocol_mapper_id, name);


--
-- Name: redirect_uris constraint_redirect_uris; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.redirect_uris
    ADD CONSTRAINT constraint_redirect_uris PRIMARY KEY (client_id, value);


--
-- Name: required_action_config constraint_req_act_cfg_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.required_action_config
    ADD CONSTRAINT constraint_req_act_cfg_pk PRIMARY KEY (required_action_id, name);


--
-- Name: required_action_provider constraint_req_act_prv_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.required_action_provider
    ADD CONSTRAINT constraint_req_act_prv_pk PRIMARY KEY (id);


--
-- Name: user_required_action constraint_required_action; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_required_action
    ADD CONSTRAINT constraint_required_action PRIMARY KEY (required_action, user_id);


--
-- Name: resource_uris constraint_resour_uris_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_uris
    ADD CONSTRAINT constraint_resour_uris_pk PRIMARY KEY (resource_id, value);


--
-- Name: role_attribute constraint_role_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.role_attribute
    ADD CONSTRAINT constraint_role_attribute_pk PRIMARY KEY (id);


--
-- Name: user_attribute constraint_user_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_attribute
    ADD CONSTRAINT constraint_user_attribute_pk PRIMARY KEY (id);


--
-- Name: user_group_membership constraint_user_group; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_group_membership
    ADD CONSTRAINT constraint_user_group PRIMARY KEY (group_id, user_id);


--
-- Name: user_session_note constraint_usn_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_session_note
    ADD CONSTRAINT constraint_usn_pk PRIMARY KEY (user_session, name);


--
-- Name: web_origins constraint_web_origins; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.web_origins
    ADD CONSTRAINT constraint_web_origins PRIMARY KEY (client_id, value);


--
-- Name: databasechangeloglock databasechangeloglock_pkey; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.databasechangeloglock
    ADD CONSTRAINT databasechangeloglock_pkey PRIMARY KEY (id);


--
-- Name: client_scope_attributes pk_cl_tmpl_attr; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_scope_attributes
    ADD CONSTRAINT pk_cl_tmpl_attr PRIMARY KEY (scope_id, name);


--
-- Name: client_scope pk_cli_template; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_scope
    ADD CONSTRAINT pk_cli_template PRIMARY KEY (id);


--
-- Name: resource_server pk_resource_server; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server
    ADD CONSTRAINT pk_resource_server PRIMARY KEY (id);


--
-- Name: client_scope_role_mapping pk_template_scope; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_scope_role_mapping
    ADD CONSTRAINT pk_template_scope PRIMARY KEY (scope_id, role_id);


--
-- Name: default_client_scope r_def_cli_scope_bind; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.default_client_scope
    ADD CONSTRAINT r_def_cli_scope_bind PRIMARY KEY (realm_id, scope_id);


--
-- Name: realm_localizations realm_localizations_pkey; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_localizations
    ADD CONSTRAINT realm_localizations_pkey PRIMARY KEY (realm_id, locale);


--
-- Name: resource_attribute res_attr_pk; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_attribute
    ADD CONSTRAINT res_attr_pk PRIMARY KEY (id);


--
-- Name: keycloak_group sibling_names; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.keycloak_group
    ADD CONSTRAINT sibling_names UNIQUE (realm_id, parent_group, name);


--
-- Name: identity_provider uk_2daelwnibji49avxsrtuf6xj33; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT uk_2daelwnibji49avxsrtuf6xj33 UNIQUE (provider_alias, realm_id);


--
-- Name: client uk_b71cjlbenv945rb6gcon438at; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client
    ADD CONSTRAINT uk_b71cjlbenv945rb6gcon438at UNIQUE (realm_id, client_id);


--
-- Name: client_scope uk_cli_scope; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_scope
    ADD CONSTRAINT uk_cli_scope UNIQUE (realm_id, name);


--
-- Name: user_entity uk_dykn684sl8up1crfei6eckhd7; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT uk_dykn684sl8up1crfei6eckhd7 UNIQUE (realm_id, email_constraint);


--
-- Name: resource_server_resource uk_frsr6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5ha6 UNIQUE (name, owner, resource_server_id);


--
-- Name: resource_server_perm_ticket uk_frsr6t700s9v50bu18ws5pmt; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5pmt UNIQUE (owner, requester, resource_server_id, resource_id, scope_id);


--
-- Name: resource_server_policy uk_frsrpt700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT uk_frsrpt700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- Name: resource_server_scope uk_frsrst700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT uk_frsrst700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- Name: user_consent uk_jkuwuvd56ontgsuhogm8uewrt; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT uk_jkuwuvd56ontgsuhogm8uewrt UNIQUE (client_id, client_storage_provider, external_client_id, user_id);


--
-- Name: realm uk_orvsdmla56612eaefiq6wl5oi; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm
    ADD CONSTRAINT uk_orvsdmla56612eaefiq6wl5oi UNIQUE (name);


--
-- Name: user_entity uk_ru8tt6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT uk_ru8tt6t700s9v50bu18ws5ha6 UNIQUE (realm_id, username);


--
-- Name: canonical_invoices canonical_invoices_pkey; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_invoices
    ADD CONSTRAINT canonical_invoices_pkey PRIMARY KEY (id);


--
-- Name: canonical_order_line_items canonical_order_line_items_order_id_line_number_key; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_order_line_items
    ADD CONSTRAINT canonical_order_line_items_order_id_line_number_key UNIQUE (order_id, line_number);


--
-- Name: canonical_order_line_items canonical_order_line_items_pkey; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_order_line_items
    ADD CONSTRAINT canonical_order_line_items_pkey PRIMARY KEY (id);


--
-- Name: canonical_orders canonical_orders_idempotency_key_key; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_orders
    ADD CONSTRAINT canonical_orders_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: canonical_orders canonical_orders_pkey; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_orders
    ADD CONSTRAINT canonical_orders_pkey PRIMARY KEY (id);


--
-- Name: canonical_returns canonical_returns_pkey; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_returns
    ADD CONSTRAINT canonical_returns_pkey PRIMARY KEY (id);


--
-- Name: canonical_shipments canonical_shipments_pkey; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_shipments
    ADD CONSTRAINT canonical_shipments_pkey PRIMARY KEY (id);


--
-- Name: message_log message_log_pkey; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.message_log
    ADD CONSTRAINT message_log_pkey PRIMARY KEY (id);


--
-- Name: shipment_packs shipment_packs_pkey; Type: CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.shipment_packs
    ADD CONSTRAINT shipment_packs_pkey PRIMARY KEY (id);


--
-- Name: app_config app_config_config_key_key; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.app_config
    ADD CONSTRAINT app_config_config_key_key UNIQUE (config_key);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (id);


--
-- Name: calendar_entries calendar_entries_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.calendar_entries
    ADD CONSTRAINT calendar_entries_pkey PRIMARY KEY (id);


--
-- Name: commission_ledger commission_ledger_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.commission_ledger
    ADD CONSTRAINT commission_ledger_pkey PRIMARY KEY (id);


--
-- Name: escalation_log escalation_log_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.escalation_log
    ADD CONSTRAINT escalation_log_pkey PRIMARY KEY (id);


--
-- Name: escalation_rules escalation_rules_factory_id_step_number_key; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.escalation_rules
    ADD CONSTRAINT escalation_rules_factory_id_step_number_key UNIQUE (factory_id, step_number);


--
-- Name: escalation_rules escalation_rules_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.escalation_rules
    ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);


--
-- Name: factory_preferences factory_preferences_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.factory_preferences
    ADD CONSTRAINT factory_preferences_pkey PRIMARY KEY (id);


--
-- Name: factory_preferences factory_preferences_tenant_id_flag_name_key; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.factory_preferences
    ADD CONSTRAINT factory_preferences_tenant_id_flag_name_key UNIQUE (tenant_id, flag_name);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (flag_name);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_template_key_channel_language_key; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.notification_templates
    ADD CONSTRAINT notification_templates_template_key_channel_language_key UNIQUE (template_key, channel, language);


--
-- Name: operational_profile operational_profile_factory_id_key; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.operational_profile
    ADD CONSTRAINT operational_profile_factory_id_key UNIQUE (factory_id);


--
-- Name: operational_profile operational_profile_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.operational_profile
    ADD CONSTRAINT operational_profile_pkey PRIMARY KEY (id);


--
-- Name: partner_referrals partner_referrals_partner_id_factory_id_key; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.partner_referrals
    ADD CONSTRAINT partner_referrals_partner_id_factory_id_key UNIQUE (partner_id, factory_id);


--
-- Name: partner_referrals partner_referrals_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.partner_referrals
    ADD CONSTRAINT partner_referrals_pkey PRIMARY KEY (id);


--
-- Name: partner_referrals partner_referrals_referral_code_key; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.partner_referrals
    ADD CONSTRAINT partner_referrals_referral_code_key UNIQUE (referral_code);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: relationship_registry relationship_registry_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.relationship_registry
    ADD CONSTRAINT relationship_registry_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhook_subscriptions webhook_subscriptions_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: ai_fix_log ai_fix_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_fix_log
    ADD CONSTRAINT ai_fix_log_pkey PRIMARY KEY (id);


--
-- Name: app_config app_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_config_key_key UNIQUE (config_key);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: barcode_configs barcode_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode_configs
    ADD CONSTRAINT barcode_configs_pkey PRIMARY KEY (id);


--
-- Name: buyers buyers_factory_id_buyer_identifier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_factory_id_buyer_identifier_key UNIQUE (factory_id, buyer_identifier);


--
-- Name: buyers buyers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_pkey PRIMARY KEY (id);


--
-- Name: ca_clients ca_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_clients
    ADD CONSTRAINT ca_clients_pkey PRIMARY KEY (id);


--
-- Name: ca_firm_staff ca_firm_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_firm_staff
    ADD CONSTRAINT ca_firm_staff_pkey PRIMARY KEY (id);


--
-- Name: ca_firms ca_firms_gst_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_firms
    ADD CONSTRAINT ca_firms_gst_number_key UNIQUE (gst_number);


--
-- Name: ca_firms ca_firms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_firms
    ADD CONSTRAINT ca_firms_pkey PRIMARY KEY (id);


--
-- Name: ca_firms ca_firms_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_firms
    ADD CONSTRAINT ca_firms_registration_number_key UNIQUE (registration_number);


--
-- Name: calendar_entries calendar_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_entries
    ADD CONSTRAINT calendar_entries_pkey PRIMARY KEY (id);


--
-- Name: canonical_invoices canonical_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_invoices
    ADD CONSTRAINT canonical_invoices_pkey PRIMARY KEY (id);


--
-- Name: canonical_order_line_items canonical_order_line_items_order_id_line_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_order_line_items
    ADD CONSTRAINT canonical_order_line_items_order_id_line_number_key UNIQUE (order_id, line_number);


--
-- Name: canonical_order_line_items canonical_order_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_order_line_items
    ADD CONSTRAINT canonical_order_line_items_pkey PRIMARY KEY (id);


--
-- Name: canonical_orders canonical_orders_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_orders
    ADD CONSTRAINT canonical_orders_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: canonical_orders canonical_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_orders
    ADD CONSTRAINT canonical_orders_pkey PRIMARY KEY (id);


--
-- Name: canonical_returns canonical_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_returns
    ADD CONSTRAINT canonical_returns_pkey PRIMARY KEY (id);


--
-- Name: canonical_shipments canonical_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_shipments
    ADD CONSTRAINT canonical_shipments_pkey PRIMARY KEY (id);


--
-- Name: client_health_scores client_health_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_health_scores
    ADD CONSTRAINT client_health_scores_pkey PRIMARY KEY (id);


--
-- Name: commission_ledger commission_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_ledger
    ADD CONSTRAINT commission_ledger_pkey PRIMARY KEY (id);


--
-- Name: communication_log communication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_pkey PRIMARY KEY (id);


--
-- Name: compliance_exceptions compliance_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_pkey PRIMARY KEY (id);


--
-- Name: compliance_filings compliance_filings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_filings
    ADD CONSTRAINT compliance_filings_pkey PRIMARY KEY (id);


--
-- Name: connections connections_factory_id_buyer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_factory_id_buyer_id_key UNIQUE (factory_id, buyer_id);


--
-- Name: connections connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_pkey PRIMARY KEY (id);


--
-- Name: connector_catalog connector_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_catalog
    ADD CONSTRAINT connector_catalog_pkey PRIMARY KEY (id);


--
-- Name: connector_requests connector_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_requests
    ADD CONSTRAINT connector_requests_pkey PRIMARY KEY (id);


--
-- Name: document_requests document_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: escalation_log escalation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_log
    ADD CONSTRAINT escalation_log_pkey PRIMARY KEY (id);


--
-- Name: escalation_rules escalation_rules_factory_id_step_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_factory_id_step_number_key UNIQUE (factory_id, step_number);


--
-- Name: escalation_rules escalation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);


--
-- Name: factories factories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT factories_pkey PRIMARY KEY (id);


--
-- Name: factories factories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT factories_slug_key UNIQUE (slug);


--
-- Name: factory_preferences factory_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_preferences
    ADD CONSTRAINT factory_preferences_pkey PRIMARY KEY (id);


--
-- Name: factory_preferences factory_preferences_tenant_id_flag_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_preferences
    ADD CONSTRAINT factory_preferences_tenant_id_flag_name_key UNIQUE (tenant_id, flag_name);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (flag_name);


--
-- Name: impersonation_sessions impersonation_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impersonation_sessions
    ADD CONSTRAINT impersonation_sessions_pkey PRIMARY KEY (id);


--
-- Name: item_master item_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_master
    ADD CONSTRAINT item_master_pkey PRIMARY KEY (id);


--
-- Name: llm_cache llm_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_cache
    ADD CONSTRAINT llm_cache_pkey PRIMARY KEY (id);


--
-- Name: llm_cache llm_cache_prompt_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_cache
    ADD CONSTRAINT llm_cache_prompt_hash_key UNIQUE (prompt_hash);


--
-- Name: llm_usage_log llm_usage_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_usage_log
    ADD CONSTRAINT llm_usage_log_pkey PRIMARY KEY (id);


--
-- Name: mapping_configs mapping_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mapping_configs
    ADD CONSTRAINT mapping_configs_pkey PRIMARY KEY (id);


--
-- Name: message_log message_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_log
    ADD CONSTRAINT message_log_pkey PRIMARY KEY (id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_template_key_channel_language_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_template_key_channel_language_key UNIQUE (template_key, channel, language);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: operational_profile operational_profile_factory_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_profile
    ADD CONSTRAINT operational_profile_factory_id_key UNIQUE (factory_id);


--
-- Name: operational_profile operational_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_profile
    ADD CONSTRAINT operational_profile_pkey PRIMARY KEY (id);


--
-- Name: order_sagas order_sagas_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_sagas
    ADD CONSTRAINT order_sagas_order_id_key UNIQUE (order_id);


--
-- Name: order_sagas order_sagas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_sagas
    ADD CONSTRAINT order_sagas_pkey PRIMARY KEY (id);


--
-- Name: outbox outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);


--
-- Name: partner_referrals partner_referrals_partner_id_factory_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referrals
    ADD CONSTRAINT partner_referrals_partner_id_factory_id_key UNIQUE (partner_id, factory_id);


--
-- Name: partner_referrals partner_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referrals
    ADD CONSTRAINT partner_referrals_pkey PRIMARY KEY (id);


--
-- Name: partner_referrals partner_referrals_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referrals
    ADD CONSTRAINT partner_referrals_referral_code_key UNIQUE (referral_code);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: rate_cards rate_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT rate_cards_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_items reconciliation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_sessions reconciliation_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_sessions
    ADD CONSTRAINT reconciliation_sessions_pkey PRIMARY KEY (id);


--
-- Name: record_history record_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_history
    ADD CONSTRAINT record_history_pkey PRIMARY KEY (id);


--
-- Name: relationship_registry relationship_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_registry
    ADD CONSTRAINT relationship_registry_pkey PRIMARY KEY (id);


--
-- Name: resync_items resync_items_new_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resync_items
    ADD CONSTRAINT resync_items_new_idempotency_key_key UNIQUE (new_idempotency_key);


--
-- Name: resync_items resync_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resync_items
    ADD CONSTRAINT resync_items_pkey PRIMARY KEY (id);


--
-- Name: resync_requests resync_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resync_requests
    ADD CONSTRAINT resync_requests_pkey PRIMARY KEY (id);


--
-- Name: routing_rules routing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_rules
    ADD CONSTRAINT routing_rules_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: shipment_packs shipment_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_packs
    ADD CONSTRAINT shipment_packs_pkey PRIMARY KEY (id);


--
-- Name: staff_activity_log staff_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_activity_log
    ADD CONSTRAINT staff_activity_log_pkey PRIMARY KEY (id);


--
-- Name: subscription_tiers subscription_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_tiers
    ADD CONSTRAINT subscription_tiers_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhook_subscriptions webhook_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: order_sagas order_sagas_order_id_key; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.order_sagas
    ADD CONSTRAINT order_sagas_order_id_key UNIQUE (order_id);


--
-- Name: order_sagas order_sagas_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.order_sagas
    ADD CONSTRAINT order_sagas_pkey PRIMARY KEY (id);


--
-- Name: outbox outbox_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);


--
-- Name: resync_items resync_items_new_idempotency_key_key; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.resync_items
    ADD CONSTRAINT resync_items_new_idempotency_key_key UNIQUE (new_idempotency_key);


--
-- Name: resync_items resync_items_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.resync_items
    ADD CONSTRAINT resync_items_pkey PRIMARY KEY (id);


--
-- Name: resync_requests resync_requests_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.resync_requests
    ADD CONSTRAINT resync_requests_pkey PRIMARY KEY (id);


--
-- Name: routing_rules routing_rules_pkey; Type: CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.routing_rules
    ADD CONSTRAINT routing_rules_pkey PRIMARY KEY (id);


--
-- Name: idx_llm_cache_hash; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_llm_cache_hash ON ai.llm_cache USING btree (prompt_hash);


--
-- Name: idx_mapping_connection; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_mapping_connection ON ai.mapping_configs USING btree (connection_id);


--
-- Name: idx_audit_created; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_audit_created ON audit.audit_log USING btree (created_at);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_audit_entity ON audit.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_factory; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_audit_factory ON audit.audit_log USING btree (factory_id);


--
-- Name: idx_history_changed_by; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_history_changed_by ON audit.record_history USING btree (changed_by);


--
-- Name: idx_history_correlation; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_history_correlation ON audit.record_history USING btree (correlation_id);


--
-- Name: idx_history_created_at; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_history_created_at ON audit.record_history USING btree (created_at);


--
-- Name: idx_history_operation; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_history_operation ON audit.record_history USING btree (operation);


--
-- Name: idx_history_table; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_history_table ON audit.record_history USING btree (table_name, record_id);


--
-- Name: idx_history_tenant; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_history_tenant ON audit.record_history USING btree (tenant_id);


--
-- Name: idx_impersonation_factory; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_impersonation_factory ON audit.impersonation_sessions USING btree (factory_id);


--
-- Name: idx_impersonation_operator; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_impersonation_operator ON audit.impersonation_sessions USING btree (fc_operator_id);


--
-- Name: idx_ca_clients_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_ca_clients_firm ON compliance.ca_clients USING btree (ca_firm_id);


--
-- Name: idx_ca_clients_staff; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_ca_clients_staff ON compliance.ca_clients USING btree (assigned_staff_id);


--
-- Name: idx_ca_clients_status; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_ca_clients_status ON compliance.ca_clients USING btree (ca_firm_id, status);


--
-- Name: idx_ca_firm_staff_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_ca_firm_staff_firm ON compliance.ca_firm_staff USING btree (ca_firm_id);


--
-- Name: idx_comms_client; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_comms_client ON compliance.communication_log USING btree (client_id, created_at DESC);


--
-- Name: idx_comms_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_comms_firm ON compliance.communication_log USING btree (ca_firm_id);


--
-- Name: idx_doc_requests_client; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_doc_requests_client ON compliance.document_requests USING btree (client_id);


--
-- Name: idx_doc_requests_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_doc_requests_firm ON compliance.document_requests USING btree (ca_firm_id);


--
-- Name: idx_exceptions_client; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_exceptions_client ON compliance.compliance_exceptions USING btree (client_id);


--
-- Name: idx_exceptions_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_exceptions_firm ON compliance.compliance_exceptions USING btree (ca_firm_id);


--
-- Name: idx_filings_client; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_filings_client ON compliance.compliance_filings USING btree (client_id);


--
-- Name: idx_filings_due; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_filings_due ON compliance.compliance_filings USING btree (due_date) WHERE (status <> ALL (ARRAY['FILED'::compliance.filing_status, 'ACKNOWLEDGED'::compliance.filing_status, 'CANCELLED'::compliance.filing_status]));


--
-- Name: idx_filings_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_filings_firm ON compliance.compliance_filings USING btree (ca_firm_id);


--
-- Name: idx_filings_status; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_filings_status ON compliance.compliance_filings USING btree (ca_firm_id, status);


--
-- Name: idx_health_scores_client; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_health_scores_client ON compliance.client_health_scores USING btree (client_id);


--
-- Name: idx_health_scores_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_health_scores_firm ON compliance.client_health_scores USING btree (ca_firm_id, computed_at DESC);


--
-- Name: idx_notices_client; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_notices_client ON compliance.notices USING btree (client_id);


--
-- Name: idx_notices_due; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_notices_due ON compliance.notices USING btree (response_due_date) WHERE (status <> ALL (ARRAY['RESOLVED'::compliance.notice_status, 'CLOSED'::compliance.notice_status]));


--
-- Name: idx_notices_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_notices_firm ON compliance.notices USING btree (ca_firm_id);


--
-- Name: idx_recon_items_session; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_recon_items_session ON compliance.reconciliation_items USING btree (session_id);


--
-- Name: idx_recon_sessions_client; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_recon_sessions_client ON compliance.reconciliation_sessions USING btree (client_id);


--
-- Name: idx_recon_sessions_firm; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_recon_sessions_firm ON compliance.reconciliation_sessions USING btree (ca_firm_id);


--
-- Name: idx_staff_activity_log_activity_date; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_staff_activity_log_activity_date ON compliance.staff_activity_log USING btree (activity_date);


--
-- Name: idx_staff_activity_log_ca_firm_id; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_staff_activity_log_ca_firm_id ON compliance.staff_activity_log USING btree (ca_firm_id);


--
-- Name: idx_staff_activity_log_client_id; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_staff_activity_log_client_id ON compliance.staff_activity_log USING btree (client_id);


--
-- Name: idx_staff_activity_log_staff_id; Type: INDEX; Schema: compliance; Owner: -
--

CREATE INDEX idx_staff_activity_log_staff_id ON compliance.staff_activity_log USING btree (staff_id);


--
-- Name: idx_item_master_factory; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX idx_item_master_factory ON core.item_master USING btree (factory_id);


--
-- Name: idx_item_master_sku; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX idx_item_master_sku ON core.item_master USING btree (factory_id, factory_sku) WHERE (active = true);


--
-- Name: fed_user_attr_long_values; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX fed_user_attr_long_values ON keycloak.fed_user_attribute USING btree (long_value_hash, name);


--
-- Name: fed_user_attr_long_values_lower_case; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX fed_user_attr_long_values_lower_case ON keycloak.fed_user_attribute USING btree (long_value_hash_lower_case, name);


--
-- Name: idx_admin_event_time; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_admin_event_time ON keycloak.admin_event_entity USING btree (realm_id, admin_event_time);


--
-- Name: idx_assoc_pol_assoc_pol_id; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_assoc_pol_assoc_pol_id ON keycloak.associated_policy USING btree (associated_policy_id);


--
-- Name: idx_auth_config_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_auth_config_realm ON keycloak.authenticator_config USING btree (realm_id);


--
-- Name: idx_auth_exec_flow; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_auth_exec_flow ON keycloak.authentication_execution USING btree (flow_id);


--
-- Name: idx_auth_exec_realm_flow; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_auth_exec_realm_flow ON keycloak.authentication_execution USING btree (realm_id, flow_id);


--
-- Name: idx_auth_flow_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_auth_flow_realm ON keycloak.authentication_flow USING btree (realm_id);


--
-- Name: idx_cl_clscope; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_cl_clscope ON keycloak.client_scope_client USING btree (scope_id);


--
-- Name: idx_client_att_by_name_value; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_client_att_by_name_value ON keycloak.client_attributes USING btree (name, substr(value, 1, 255));


--
-- Name: idx_client_id; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_client_id ON keycloak.client USING btree (client_id);


--
-- Name: idx_client_init_acc_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_client_init_acc_realm ON keycloak.client_initial_access USING btree (realm_id);


--
-- Name: idx_client_session_session; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_client_session_session ON keycloak.client_session USING btree (session_id);


--
-- Name: idx_clscope_attrs; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_clscope_attrs ON keycloak.client_scope_attributes USING btree (scope_id);


--
-- Name: idx_clscope_cl; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_clscope_cl ON keycloak.client_scope_client USING btree (client_id);


--
-- Name: idx_clscope_protmap; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_clscope_protmap ON keycloak.protocol_mapper USING btree (client_scope_id);


--
-- Name: idx_clscope_role; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_clscope_role ON keycloak.client_scope_role_mapping USING btree (scope_id);


--
-- Name: idx_compo_config_compo; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_compo_config_compo ON keycloak.component_config USING btree (component_id);


--
-- Name: idx_component_provider_type; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_component_provider_type ON keycloak.component USING btree (provider_type);


--
-- Name: idx_component_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_component_realm ON keycloak.component USING btree (realm_id);


--
-- Name: idx_composite; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_composite ON keycloak.composite_role USING btree (composite);


--
-- Name: idx_composite_child; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_composite_child ON keycloak.composite_role USING btree (child_role);


--
-- Name: idx_defcls_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_defcls_realm ON keycloak.default_client_scope USING btree (realm_id);


--
-- Name: idx_defcls_scope; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_defcls_scope ON keycloak.default_client_scope USING btree (scope_id);


--
-- Name: idx_event_time; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_event_time ON keycloak.event_entity USING btree (realm_id, event_time);


--
-- Name: idx_fedidentity_feduser; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fedidentity_feduser ON keycloak.federated_identity USING btree (federated_user_id);


--
-- Name: idx_fedidentity_user; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fedidentity_user ON keycloak.federated_identity USING btree (user_id);


--
-- Name: idx_fu_attribute; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_attribute ON keycloak.fed_user_attribute USING btree (user_id, realm_id, name);


--
-- Name: idx_fu_cnsnt_ext; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_cnsnt_ext ON keycloak.fed_user_consent USING btree (user_id, client_storage_provider, external_client_id);


--
-- Name: idx_fu_consent; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_consent ON keycloak.fed_user_consent USING btree (user_id, client_id);


--
-- Name: idx_fu_consent_ru; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_consent_ru ON keycloak.fed_user_consent USING btree (realm_id, user_id);


--
-- Name: idx_fu_credential; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_credential ON keycloak.fed_user_credential USING btree (user_id, type);


--
-- Name: idx_fu_credential_ru; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_credential_ru ON keycloak.fed_user_credential USING btree (realm_id, user_id);


--
-- Name: idx_fu_group_membership; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_group_membership ON keycloak.fed_user_group_membership USING btree (user_id, group_id);


--
-- Name: idx_fu_group_membership_ru; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_group_membership_ru ON keycloak.fed_user_group_membership USING btree (realm_id, user_id);


--
-- Name: idx_fu_required_action; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_required_action ON keycloak.fed_user_required_action USING btree (user_id, required_action);


--
-- Name: idx_fu_required_action_ru; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_required_action_ru ON keycloak.fed_user_required_action USING btree (realm_id, user_id);


--
-- Name: idx_fu_role_mapping; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_role_mapping ON keycloak.fed_user_role_mapping USING btree (user_id, role_id);


--
-- Name: idx_fu_role_mapping_ru; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_fu_role_mapping_ru ON keycloak.fed_user_role_mapping USING btree (realm_id, user_id);


--
-- Name: idx_group_att_by_name_value; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_group_att_by_name_value ON keycloak.group_attribute USING btree (name, ((value)::character varying(250)));


--
-- Name: idx_group_attr_group; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_group_attr_group ON keycloak.group_attribute USING btree (group_id);


--
-- Name: idx_group_role_mapp_group; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_group_role_mapp_group ON keycloak.group_role_mapping USING btree (group_id);


--
-- Name: idx_id_prov_mapp_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_id_prov_mapp_realm ON keycloak.identity_provider_mapper USING btree (realm_id);


--
-- Name: idx_ident_prov_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_ident_prov_realm ON keycloak.identity_provider USING btree (realm_id);


--
-- Name: idx_keycloak_role_client; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_keycloak_role_client ON keycloak.keycloak_role USING btree (client);


--
-- Name: idx_keycloak_role_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_keycloak_role_realm ON keycloak.keycloak_role USING btree (realm);


--
-- Name: idx_offline_css_preload; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_offline_css_preload ON keycloak.offline_client_session USING btree (client_id, offline_flag);


--
-- Name: idx_offline_uss_by_user; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_offline_uss_by_user ON keycloak.offline_user_session USING btree (user_id, realm_id, offline_flag);


--
-- Name: idx_offline_uss_by_usersess; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_offline_uss_by_usersess ON keycloak.offline_user_session USING btree (realm_id, offline_flag, user_session_id);


--
-- Name: idx_offline_uss_createdon; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_offline_uss_createdon ON keycloak.offline_user_session USING btree (created_on);


--
-- Name: idx_offline_uss_preload; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_offline_uss_preload ON keycloak.offline_user_session USING btree (offline_flag, created_on, user_session_id);


--
-- Name: idx_protocol_mapper_client; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_protocol_mapper_client ON keycloak.protocol_mapper USING btree (client_id);


--
-- Name: idx_realm_attr_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_realm_attr_realm ON keycloak.realm_attribute USING btree (realm_id);


--
-- Name: idx_realm_clscope; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_realm_clscope ON keycloak.client_scope USING btree (realm_id);


--
-- Name: idx_realm_def_grp_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_realm_def_grp_realm ON keycloak.realm_default_groups USING btree (realm_id);


--
-- Name: idx_realm_evt_list_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_realm_evt_list_realm ON keycloak.realm_events_listeners USING btree (realm_id);


--
-- Name: idx_realm_evt_types_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_realm_evt_types_realm ON keycloak.realm_enabled_event_types USING btree (realm_id);


--
-- Name: idx_realm_master_adm_cli; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_realm_master_adm_cli ON keycloak.realm USING btree (master_admin_client);


--
-- Name: idx_realm_supp_local_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_realm_supp_local_realm ON keycloak.realm_supported_locales USING btree (realm_id);


--
-- Name: idx_redir_uri_client; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_redir_uri_client ON keycloak.redirect_uris USING btree (client_id);


--
-- Name: idx_req_act_prov_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_req_act_prov_realm ON keycloak.required_action_provider USING btree (realm_id);


--
-- Name: idx_res_policy_policy; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_res_policy_policy ON keycloak.resource_policy USING btree (policy_id);


--
-- Name: idx_res_scope_scope; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_res_scope_scope ON keycloak.resource_scope USING btree (scope_id);


--
-- Name: idx_res_serv_pol_res_serv; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_res_serv_pol_res_serv ON keycloak.resource_server_policy USING btree (resource_server_id);


--
-- Name: idx_res_srv_res_res_srv; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_res_srv_res_res_srv ON keycloak.resource_server_resource USING btree (resource_server_id);


--
-- Name: idx_res_srv_scope_res_srv; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_res_srv_scope_res_srv ON keycloak.resource_server_scope USING btree (resource_server_id);


--
-- Name: idx_role_attribute; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_role_attribute ON keycloak.role_attribute USING btree (role_id);


--
-- Name: idx_role_clscope; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_role_clscope ON keycloak.client_scope_role_mapping USING btree (role_id);


--
-- Name: idx_scope_mapping_role; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_scope_mapping_role ON keycloak.scope_mapping USING btree (role_id);


--
-- Name: idx_scope_policy_policy; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_scope_policy_policy ON keycloak.scope_policy USING btree (policy_id);


--
-- Name: idx_update_time; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_update_time ON keycloak.migration_model USING btree (update_time);


--
-- Name: idx_us_sess_id_on_cl_sess; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_us_sess_id_on_cl_sess ON keycloak.offline_client_session USING btree (user_session_id);


--
-- Name: idx_usconsent_clscope; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_usconsent_clscope ON keycloak.user_consent_client_scope USING btree (user_consent_id);


--
-- Name: idx_user_attribute; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_attribute ON keycloak.user_attribute USING btree (user_id);


--
-- Name: idx_user_attribute_name; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_attribute_name ON keycloak.user_attribute USING btree (name, value);


--
-- Name: idx_user_consent; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_consent ON keycloak.user_consent USING btree (user_id);


--
-- Name: idx_user_credential; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_credential ON keycloak.credential USING btree (user_id);


--
-- Name: idx_user_email; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_email ON keycloak.user_entity USING btree (email);


--
-- Name: idx_user_group_mapping; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_group_mapping ON keycloak.user_group_membership USING btree (user_id);


--
-- Name: idx_user_reqactions; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_reqactions ON keycloak.user_required_action USING btree (user_id);


--
-- Name: idx_user_role_mapping; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_role_mapping ON keycloak.user_role_mapping USING btree (user_id);


--
-- Name: idx_user_service_account; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_user_service_account ON keycloak.user_entity USING btree (realm_id, service_account_client_link);


--
-- Name: idx_usr_fed_map_fed_prv; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_usr_fed_map_fed_prv ON keycloak.user_federation_mapper USING btree (federation_provider_id);


--
-- Name: idx_usr_fed_map_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_usr_fed_map_realm ON keycloak.user_federation_mapper USING btree (realm_id);


--
-- Name: idx_usr_fed_prv_realm; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_usr_fed_prv_realm ON keycloak.user_federation_provider USING btree (realm_id);


--
-- Name: idx_web_orig_client; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX idx_web_orig_client ON keycloak.web_origins USING btree (client_id);


--
-- Name: user_attr_long_values; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX user_attr_long_values ON keycloak.user_attribute USING btree (long_value_hash, name);


--
-- Name: user_attr_long_values_lower_case; Type: INDEX; Schema: keycloak; Owner: -
--

CREATE INDEX user_attr_long_values_lower_case ON keycloak.user_attribute USING btree (long_value_hash_lower_case, name);


--
-- Name: idx_line_items_order; Type: INDEX; Schema: orders; Owner: -
--

CREATE INDEX idx_line_items_order ON orders.canonical_order_line_items USING btree (order_id);


--
-- Name: idx_messages_factory; Type: INDEX; Schema: orders; Owner: -
--

CREATE INDEX idx_messages_factory ON orders.message_log USING btree (factory_id);


--
-- Name: idx_messages_order; Type: INDEX; Schema: orders; Owner: -
--

CREATE INDEX idx_messages_order ON orders.message_log USING btree (order_id);


--
-- Name: idx_orders_buyer; Type: INDEX; Schema: orders; Owner: -
--

CREATE INDEX idx_orders_buyer ON orders.canonical_orders USING btree (buyer_id);


--
-- Name: idx_orders_factory; Type: INDEX; Schema: orders; Owner: -
--

CREATE INDEX idx_orders_factory ON orders.canonical_orders USING btree (factory_id);


--
-- Name: idx_orders_po; Type: INDEX; Schema: orders; Owner: -
--

CREATE INDEX idx_orders_po ON orders.canonical_orders USING btree (factory_id, buyer_po_number);


--
-- Name: idx_orders_status; Type: INDEX; Schema: orders; Owner: -
--

CREATE INDEX idx_orders_status ON orders.canonical_orders USING btree (factory_id, status);


--
-- Name: idx_calendar_factory_date; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_calendar_factory_date ON platform.calendar_entries USING btree (factory_id, entry_date);


--
-- Name: idx_commission_factory; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_commission_factory ON platform.commission_ledger USING btree (factory_id);


--
-- Name: idx_commission_partner; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_commission_partner ON platform.commission_ledger USING btree (partner_id);


--
-- Name: idx_commission_period; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_commission_period ON platform.commission_ledger USING btree (period);


--
-- Name: idx_commission_status; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_commission_status ON platform.commission_ledger USING btree (status);


--
-- Name: idx_partners_status; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_partners_status ON platform.partners USING btree (status);


--
-- Name: idx_referrals_code; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_referrals_code ON platform.partner_referrals USING btree (referral_code);


--
-- Name: idx_referrals_factory; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_referrals_factory ON platform.partner_referrals USING btree (factory_id);


--
-- Name: idx_referrals_partner; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_referrals_partner ON platform.partner_referrals USING btree (partner_id);


--
-- Name: idx_webhook_deliveries_failed; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_webhook_deliveries_failed ON platform.webhook_deliveries USING btree (created_at) WHERE ((status)::text = 'failed'::text);


--
-- Name: idx_webhook_deliveries_pending; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_webhook_deliveries_pending ON platform.webhook_deliveries USING btree (created_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_webhook_deliveries_subscription; Type: INDEX; Schema: platform; Owner: -
--

CREATE INDEX idx_webhook_deliveries_subscription ON platform.webhook_deliveries USING btree (subscription_id);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_factory ON public.audit_log USING btree (factory_id);


--
-- Name: idx_ca_clients_assigned_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_clients_assigned_staff_id ON public.ca_clients USING btree (assigned_staff_id);


--
-- Name: idx_ca_clients_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_clients_ca_firm_id ON public.ca_clients USING btree (ca_firm_id);


--
-- Name: idx_ca_clients_factory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_clients_factory_id ON public.ca_clients USING btree (factory_id);


--
-- Name: idx_ca_clients_tally_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_clients_tally_status ON public.ca_clients USING btree (tally_status);


--
-- Name: idx_ca_firm_staff_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_firm_staff_ca_firm_id ON public.ca_firm_staff USING btree (ca_firm_id);


--
-- Name: idx_ca_firm_staff_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_firm_staff_is_active ON public.ca_firm_staff USING btree (is_active);


--
-- Name: idx_ca_firm_staff_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_firm_staff_user_id ON public.ca_firm_staff USING btree (user_id);


--
-- Name: idx_ca_firms_owner_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_firms_owner_user_id ON public.ca_firms USING btree (owner_user_id);


--
-- Name: idx_ca_firms_subscription_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ca_firms_subscription_tier ON public.ca_firms USING btree (subscription_tier);


--
-- Name: idx_calendar_factory_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_factory_date ON public.calendar_entries USING btree (factory_id, entry_date);


--
-- Name: idx_client_health_scores_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_health_scores_ca_firm_id ON public.client_health_scores USING btree (ca_firm_id);


--
-- Name: idx_client_health_scores_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_health_scores_client_id ON public.client_health_scores USING btree (client_id);


--
-- Name: idx_client_health_scores_score_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_health_scores_score_date ON public.client_health_scores USING btree (score_date);


--
-- Name: idx_commission_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_factory ON public.commission_ledger USING btree (factory_id);


--
-- Name: idx_commission_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_partner ON public.commission_ledger USING btree (partner_id);


--
-- Name: idx_commission_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_period ON public.commission_ledger USING btree (period);


--
-- Name: idx_commission_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_status ON public.commission_ledger USING btree (status);


--
-- Name: idx_communication_log_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_log_ca_firm_id ON public.communication_log USING btree (ca_firm_id);


--
-- Name: idx_communication_log_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_log_channel ON public.communication_log USING btree (channel);


--
-- Name: idx_communication_log_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_log_client_id ON public.communication_log USING btree (client_id);


--
-- Name: idx_communication_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_log_status ON public.communication_log USING btree (status);


--
-- Name: idx_compliance_exceptions_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_exceptions_ca_firm_id ON public.compliance_exceptions USING btree (ca_firm_id);


--
-- Name: idx_compliance_exceptions_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_exceptions_client_id ON public.compliance_exceptions USING btree (client_id);


--
-- Name: idx_compliance_exceptions_filing_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_exceptions_filing_id ON public.compliance_exceptions USING btree (filing_id);


--
-- Name: idx_compliance_exceptions_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_exceptions_severity ON public.compliance_exceptions USING btree (severity);


--
-- Name: idx_compliance_exceptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_exceptions_status ON public.compliance_exceptions USING btree (status);


--
-- Name: idx_compliance_filings_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_filings_ca_firm_id ON public.compliance_filings USING btree (ca_firm_id);


--
-- Name: idx_compliance_filings_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_filings_client_id ON public.compliance_filings USING btree (client_id);


--
-- Name: idx_compliance_filings_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_filings_due_date ON public.compliance_filings USING btree (due_date);


--
-- Name: idx_compliance_filings_filing_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_filings_filing_type ON public.compliance_filings USING btree (filing_type);


--
-- Name: idx_compliance_filings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_filings_status ON public.compliance_filings USING btree (status);


--
-- Name: idx_document_requests_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_requests_ca_firm_id ON public.document_requests USING btree (ca_firm_id);


--
-- Name: idx_document_requests_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_requests_client_id ON public.document_requests USING btree (client_id);


--
-- Name: idx_document_requests_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_requests_due_date ON public.document_requests USING btree (due_date);


--
-- Name: idx_document_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_requests_status ON public.document_requests USING btree (status);


--
-- Name: idx_document_templates_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_ca_firm_id ON public.document_templates USING btree (ca_firm_id);


--
-- Name: idx_document_templates_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_channel ON public.document_templates USING btree (channel);


--
-- Name: idx_document_templates_template_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_template_type ON public.document_templates USING btree (template_type);


--
-- Name: idx_history_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_changed_by ON public.record_history USING btree (changed_by);


--
-- Name: idx_history_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_correlation ON public.record_history USING btree (correlation_id);


--
-- Name: idx_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_created_at ON public.record_history USING btree (created_at);


--
-- Name: idx_history_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_operation ON public.record_history USING btree (operation);


--
-- Name: idx_history_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_table ON public.record_history USING btree (table_name, record_id);


--
-- Name: idx_history_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_tenant ON public.record_history USING btree (tenant_id);


--
-- Name: idx_impersonation_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impersonation_factory ON public.impersonation_sessions USING btree (factory_id);


--
-- Name: idx_impersonation_operator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impersonation_operator ON public.impersonation_sessions USING btree (fc_operator_id);


--
-- Name: idx_item_master_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_master_factory ON public.item_master USING btree (factory_id);


--
-- Name: idx_item_master_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_item_master_sku ON public.item_master USING btree (factory_id, factory_sku) WHERE (active = true);


--
-- Name: idx_line_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_order ON public.canonical_order_line_items USING btree (order_id);


--
-- Name: idx_llm_cache_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_llm_cache_hash ON public.llm_cache USING btree (prompt_hash);


--
-- Name: idx_mapping_connection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mapping_connection ON public.mapping_configs USING btree (connection_id);


--
-- Name: idx_messages_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_factory ON public.message_log USING btree (factory_id);


--
-- Name: idx_messages_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_order ON public.message_log USING btree (order_id);


--
-- Name: idx_notices_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_ca_firm_id ON public.notices USING btree (ca_firm_id);


--
-- Name: idx_notices_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_client_id ON public.notices USING btree (client_id);


--
-- Name: idx_notices_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_priority ON public.notices USING btree (priority);


--
-- Name: idx_notices_response_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_response_due_date ON public.notices USING btree (response_due_date);


--
-- Name: idx_notices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_status ON public.notices USING btree (status);


--
-- Name: idx_notifications_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_factory ON public.notifications USING btree (factory_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_orders_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_buyer ON public.canonical_orders USING btree (buyer_id);


--
-- Name: idx_orders_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_factory ON public.canonical_orders USING btree (factory_id);


--
-- Name: idx_orders_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_po ON public.canonical_orders USING btree (factory_id, buyer_po_number);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.canonical_orders USING btree (factory_id, status);


--
-- Name: idx_outbox_failed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_failed ON public.outbox USING btree (created_at) WHERE ((status)::text = 'failed'::text);


--
-- Name: idx_partners_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_status ON public.partners USING btree (status);


--
-- Name: idx_reconciliation_items_match_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_items_match_status ON public.reconciliation_items USING btree (match_status);


--
-- Name: idx_reconciliation_items_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_items_session_id ON public.reconciliation_items USING btree (session_id);


--
-- Name: idx_reconciliation_sessions_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_sessions_ca_firm_id ON public.reconciliation_sessions USING btree (ca_firm_id);


--
-- Name: idx_reconciliation_sessions_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_sessions_client_id ON public.reconciliation_sessions USING btree (client_id);


--
-- Name: idx_reconciliation_sessions_recon_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_sessions_recon_type ON public.reconciliation_sessions USING btree (recon_type);


--
-- Name: idx_reconciliation_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_sessions_status ON public.reconciliation_sessions USING btree (status);


--
-- Name: idx_referrals_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_code ON public.partner_referrals USING btree (referral_code);


--
-- Name: idx_referrals_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_factory ON public.partner_referrals USING btree (factory_id);


--
-- Name: idx_referrals_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_partner ON public.partner_referrals USING btree (partner_id);


--
-- Name: idx_sagas_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sagas_deadline ON public.order_sagas USING btree (step_deadline) WHERE (completed_at IS NULL);


--
-- Name: idx_sagas_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sagas_factory ON public.order_sagas USING btree (factory_id);


--
-- Name: idx_sagas_stale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sagas_stale ON public.order_sagas USING btree (lock_expires) WHERE ((locked_by IS NOT NULL) AND (completed_at IS NULL));


--
-- Name: idx_staff_activity_log_activity_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_activity_log_activity_date ON public.staff_activity_log USING btree (activity_date);


--
-- Name: idx_staff_activity_log_ca_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_activity_log_ca_firm_id ON public.staff_activity_log USING btree (ca_firm_id);


--
-- Name: idx_staff_activity_log_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_activity_log_client_id ON public.staff_activity_log USING btree (client_id);


--
-- Name: idx_staff_activity_log_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_activity_log_staff_id ON public.staff_activity_log USING btree (staff_id);


--
-- Name: idx_webhook_deliveries_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_factory ON public.webhook_deliveries USING btree (factory_id);


--
-- Name: idx_webhook_deliveries_failed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_failed ON public.webhook_deliveries USING btree (created_at) WHERE ((status)::text = 'failed'::text);


--
-- Name: idx_webhook_deliveries_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_pending ON public.webhook_deliveries USING btree (created_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_webhook_deliveries_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_subscription ON public.webhook_deliveries USING btree (subscription_id);


--
-- Name: idx_outbox_failed; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_outbox_failed ON workflow.outbox USING btree (created_at) WHERE ((status)::text = 'failed'::text);


--
-- Name: idx_sagas_deadline; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_sagas_deadline ON workflow.order_sagas USING btree (step_deadline) WHERE (completed_at IS NULL);


--
-- Name: idx_sagas_factory; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_sagas_factory ON workflow.order_sagas USING btree (factory_id);


--
-- Name: idx_sagas_stale; Type: INDEX; Schema: workflow; Owner: -
--

CREATE INDEX idx_sagas_stale ON workflow.order_sagas USING btree (lock_expires) WHERE ((locked_by IS NOT NULL) AND (completed_at IS NULL));


--
-- Name: ai_fix_log trg_history_ai_fix_log; Type: TRIGGER; Schema: ai; Owner: -
--

CREATE TRIGGER trg_history_ai_fix_log AFTER INSERT OR DELETE OR UPDATE ON ai.ai_fix_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: mapping_configs trg_history_mapping_configs; Type: TRIGGER; Schema: ai; Owner: -
--

CREATE TRIGGER trg_history_mapping_configs AFTER INSERT OR DELETE OR UPDATE ON ai.mapping_configs FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: mapping_configs trg_updated_at; Type: TRIGGER; Schema: ai; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON ai.mapping_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: audit_log trg_audit_hash_chain; Type: TRIGGER; Schema: audit; Owner: -
--

CREATE TRIGGER trg_audit_hash_chain BEFORE INSERT ON audit.audit_log FOR EACH ROW EXECUTE FUNCTION public.audit_log_hash_chain();


--
-- Name: audit_log trg_audit_no_delete; Type: TRIGGER; Schema: audit; Owner: -
--

CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit.audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();


--
-- Name: audit_log trg_audit_no_update; Type: TRIGGER; Schema: audit; Owner: -
--

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit.audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();


--
-- Name: ca_clients trg_history_ca_clients; Type: TRIGGER; Schema: compliance; Owner: -
--

CREATE TRIGGER trg_history_ca_clients AFTER INSERT OR DELETE OR UPDATE ON compliance.ca_clients FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: ca_firms trg_history_ca_firms; Type: TRIGGER; Schema: compliance; Owner: -
--

CREATE TRIGGER trg_history_ca_firms AFTER INSERT OR DELETE OR UPDATE ON compliance.ca_firms FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: compliance_filings trg_history_compliance_filings; Type: TRIGGER; Schema: compliance; Owner: -
--

CREATE TRIGGER trg_history_compliance_filings AFTER INSERT OR DELETE OR UPDATE ON compliance.compliance_filings FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: document_requests trg_history_document_requests; Type: TRIGGER; Schema: compliance; Owner: -
--

CREATE TRIGGER trg_history_document_requests AFTER INSERT OR DELETE OR UPDATE ON compliance.document_requests FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: notices trg_history_notices; Type: TRIGGER; Schema: compliance; Owner: -
--

CREATE TRIGGER trg_history_notices AFTER INSERT OR DELETE OR UPDATE ON compliance.notices FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: staff_activity_log trg_history_staff_activity_log; Type: TRIGGER; Schema: compliance; Owner: -
--

CREATE TRIGGER trg_history_staff_activity_log AFTER INSERT OR DELETE OR UPDATE ON compliance.staff_activity_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: barcode_configs trg_history_barcode_configs; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_history_barcode_configs AFTER INSERT OR DELETE OR UPDATE ON core.barcode_configs FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: buyers trg_history_buyers; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_history_buyers AFTER INSERT OR DELETE OR UPDATE ON core.buyers FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: connections trg_history_connections; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_history_connections AFTER INSERT OR DELETE OR UPDATE ON core.connections FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: factories trg_history_factories; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_history_factories AFTER INSERT OR DELETE OR UPDATE ON core.factories FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: item_master trg_history_item_master; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_history_item_master AFTER INSERT OR DELETE OR UPDATE ON core.item_master FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: rate_cards trg_history_rate_cards; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_history_rate_cards AFTER INSERT OR DELETE OR UPDATE ON core.rate_cards FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: buyers trg_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON core.buyers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: connections trg_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON core.connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: factories trg_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON core.factories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: item_master trg_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON core.item_master FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: canonical_invoices trg_history_canonical_invoices; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_history_canonical_invoices AFTER INSERT OR DELETE OR UPDATE ON orders.canonical_invoices FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_order_line_items trg_history_canonical_order_line_items; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_history_canonical_order_line_items AFTER INSERT OR DELETE OR UPDATE ON orders.canonical_order_line_items FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_orders trg_history_canonical_orders; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_history_canonical_orders AFTER INSERT OR DELETE OR UPDATE ON orders.canonical_orders FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_returns trg_history_canonical_returns; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_history_canonical_returns AFTER INSERT OR DELETE OR UPDATE ON orders.canonical_returns FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_shipments trg_history_canonical_shipments; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_history_canonical_shipments AFTER INSERT OR DELETE OR UPDATE ON orders.canonical_shipments FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: message_log trg_history_message_log; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_history_message_log AFTER INSERT OR DELETE OR UPDATE ON orders.message_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: shipment_packs trg_history_shipment_packs; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_history_shipment_packs AFTER INSERT OR DELETE OR UPDATE ON orders.shipment_packs FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_invoices trg_updated_at; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON orders.canonical_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: canonical_orders trg_updated_at; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON orders.canonical_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: canonical_returns trg_updated_at; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON orders.canonical_returns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: canonical_shipments trg_updated_at; Type: TRIGGER; Schema: orders; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON orders.canonical_shipments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: commission_ledger set_updated_at_commission_ledger; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER set_updated_at_commission_ledger BEFORE UPDATE ON platform.commission_ledger FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: factory_preferences set_updated_at_factory_preferences; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER set_updated_at_factory_preferences BEFORE UPDATE ON platform.factory_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: feature_flags set_updated_at_feature_flags; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER set_updated_at_feature_flags BEFORE UPDATE ON platform.feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: partner_referrals set_updated_at_partner_referrals; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER set_updated_at_partner_referrals BEFORE UPDATE ON platform.partner_referrals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: partners set_updated_at_partners; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER set_updated_at_partners BEFORE UPDATE ON platform.partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: calendar_entries trg_history_calendar_entries; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_calendar_entries AFTER INSERT OR DELETE OR UPDATE ON platform.calendar_entries FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: commission_ledger trg_history_commission_ledger; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_commission_ledger AFTER INSERT OR DELETE OR UPDATE ON platform.commission_ledger FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: escalation_log trg_history_escalation_log; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_escalation_log AFTER INSERT OR DELETE OR UPDATE ON platform.escalation_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: escalation_rules trg_history_escalation_rules; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_escalation_rules AFTER INSERT OR DELETE OR UPDATE ON platform.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: factory_preferences trg_history_factory_preferences; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_factory_preferences AFTER INSERT OR DELETE OR UPDATE ON platform.factory_preferences FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: operational_profile trg_history_operational_profile; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_operational_profile AFTER INSERT OR DELETE OR UPDATE ON platform.operational_profile FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: partner_referrals trg_history_partner_referrals; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_partner_referrals AFTER INSERT OR DELETE OR UPDATE ON platform.partner_referrals FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: partners trg_history_partners; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_partners AFTER INSERT OR DELETE OR UPDATE ON platform.partners FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: webhook_subscriptions trg_history_webhook_subscriptions; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_history_webhook_subscriptions AFTER INSERT OR DELETE OR UPDATE ON platform.webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: app_config trg_updated_at; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON platform.app_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: escalation_log trg_updated_at; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON platform.escalation_log FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: operational_profile trg_updated_at; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON platform.operational_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: webhook_subscriptions trg_updated_at; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON platform.webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: commission_ledger set_updated_at_commission_ledger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_commission_ledger BEFORE UPDATE ON public.commission_ledger FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: factory_preferences set_updated_at_factory_preferences; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_factory_preferences BEFORE UPDATE ON public.factory_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: feature_flags set_updated_at_feature_flags; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_feature_flags BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: partner_referrals set_updated_at_partner_referrals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_partner_referrals BEFORE UPDATE ON public.partner_referrals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: partners set_updated_at_partners; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_partners BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: audit_log trg_audit_hash_chain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_hash_chain BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.audit_log_hash_chain();


--
-- Name: audit_log trg_audit_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();


--
-- Name: audit_log trg_audit_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();


--
-- Name: ai_fix_log trg_history_ai_fix_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_ai_fix_log AFTER INSERT OR DELETE OR UPDATE ON public.ai_fix_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: barcode_configs trg_history_barcode_configs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_barcode_configs AFTER INSERT OR DELETE OR UPDATE ON public.barcode_configs FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: buyers trg_history_buyers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_buyers AFTER INSERT OR DELETE OR UPDATE ON public.buyers FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: ca_clients trg_history_ca_clients; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_ca_clients AFTER INSERT OR DELETE OR UPDATE ON public.ca_clients FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: ca_firm_staff trg_history_ca_firm_staff; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_ca_firm_staff AFTER INSERT OR DELETE OR UPDATE ON public.ca_firm_staff FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: ca_firms trg_history_ca_firms; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_ca_firms AFTER INSERT OR DELETE OR UPDATE ON public.ca_firms FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: calendar_entries trg_history_calendar_entries; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_calendar_entries AFTER INSERT OR DELETE OR UPDATE ON public.calendar_entries FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_invoices trg_history_canonical_invoices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_canonical_invoices AFTER INSERT OR DELETE OR UPDATE ON public.canonical_invoices FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_order_line_items trg_history_canonical_order_line_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_canonical_order_line_items AFTER INSERT OR DELETE OR UPDATE ON public.canonical_order_line_items FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_orders trg_history_canonical_orders; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_canonical_orders AFTER INSERT OR DELETE OR UPDATE ON public.canonical_orders FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_returns trg_history_canonical_returns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_canonical_returns AFTER INSERT OR DELETE OR UPDATE ON public.canonical_returns FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: canonical_shipments trg_history_canonical_shipments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_canonical_shipments AFTER INSERT OR DELETE OR UPDATE ON public.canonical_shipments FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: client_health_scores trg_history_client_health_scores; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_client_health_scores AFTER INSERT OR DELETE OR UPDATE ON public.client_health_scores FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: commission_ledger trg_history_commission_ledger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_commission_ledger AFTER INSERT OR DELETE OR UPDATE ON public.commission_ledger FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: communication_log trg_history_communication_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_communication_log AFTER INSERT OR DELETE OR UPDATE ON public.communication_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: compliance_exceptions trg_history_compliance_exceptions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_compliance_exceptions AFTER INSERT OR DELETE OR UPDATE ON public.compliance_exceptions FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: compliance_filings trg_history_compliance_filings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_compliance_filings AFTER INSERT OR DELETE OR UPDATE ON public.compliance_filings FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: connections trg_history_connections; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_connections AFTER INSERT OR DELETE OR UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: document_requests trg_history_document_requests; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_document_requests AFTER INSERT OR DELETE OR UPDATE ON public.document_requests FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: document_templates trg_history_document_templates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_document_templates AFTER INSERT OR DELETE OR UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: escalation_log trg_history_escalation_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_escalation_log AFTER INSERT OR DELETE OR UPDATE ON public.escalation_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: escalation_rules trg_history_escalation_rules; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_escalation_rules AFTER INSERT OR DELETE OR UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: factories trg_history_factories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_factories AFTER INSERT OR DELETE OR UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: factory_preferences trg_history_factory_preferences; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_factory_preferences AFTER INSERT OR DELETE OR UPDATE ON public.factory_preferences FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: item_master trg_history_item_master; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_item_master AFTER INSERT OR DELETE OR UPDATE ON public.item_master FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: mapping_configs trg_history_mapping_configs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_mapping_configs AFTER INSERT OR DELETE OR UPDATE ON public.mapping_configs FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: message_log trg_history_message_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_message_log AFTER INSERT OR DELETE OR UPDATE ON public.message_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: notices trg_history_notices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_notices AFTER INSERT OR DELETE OR UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: operational_profile trg_history_operational_profile; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_operational_profile AFTER INSERT OR DELETE OR UPDATE ON public.operational_profile FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: order_sagas trg_history_order_sagas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_order_sagas AFTER INSERT OR DELETE OR UPDATE ON public.order_sagas FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: partner_referrals trg_history_partner_referrals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_partner_referrals AFTER INSERT OR DELETE OR UPDATE ON public.partner_referrals FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: partners trg_history_partners; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_partners AFTER INSERT OR DELETE OR UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: rate_cards trg_history_rate_cards; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_rate_cards AFTER INSERT OR DELETE OR UPDATE ON public.rate_cards FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: reconciliation_items trg_history_reconciliation_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_reconciliation_items AFTER INSERT OR DELETE OR UPDATE ON public.reconciliation_items FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: reconciliation_sessions trg_history_reconciliation_sessions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_reconciliation_sessions AFTER INSERT OR DELETE OR UPDATE ON public.reconciliation_sessions FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: resync_items trg_history_resync_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_resync_items AFTER INSERT OR DELETE OR UPDATE ON public.resync_items FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: resync_requests trg_history_resync_requests; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_resync_requests AFTER INSERT OR DELETE OR UPDATE ON public.resync_requests FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: routing_rules trg_history_routing_rules; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_routing_rules AFTER INSERT OR DELETE OR UPDATE ON public.routing_rules FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: shipment_packs trg_history_shipment_packs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_shipment_packs AFTER INSERT OR DELETE OR UPDATE ON public.shipment_packs FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: staff_activity_log trg_history_staff_activity_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_staff_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.staff_activity_log FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: webhook_subscriptions trg_history_webhook_subscriptions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_webhook_subscriptions AFTER INSERT OR DELETE OR UPDATE ON public.webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: app_config trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.app_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: buyers trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.buyers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ca_clients trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.ca_clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ca_firms trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.ca_firms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: canonical_invoices trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.canonical_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: canonical_orders trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.canonical_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: canonical_returns trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.canonical_returns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: canonical_shipments trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.canonical_shipments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: compliance_filings trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.compliance_filings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: connections trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: escalation_log trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.escalation_log FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: factories trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: item_master trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.item_master FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: mapping_configs trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.mapping_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notices trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: operational_profile trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.operational_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: order_sagas trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.order_sagas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: resync_requests trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.resync_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: webhook_subscriptions trg_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: order_sagas trg_history_order_sagas; Type: TRIGGER; Schema: workflow; Owner: -
--

CREATE TRIGGER trg_history_order_sagas AFTER INSERT OR DELETE OR UPDATE ON workflow.order_sagas FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: resync_items trg_history_resync_items; Type: TRIGGER; Schema: workflow; Owner: -
--

CREATE TRIGGER trg_history_resync_items AFTER INSERT OR DELETE OR UPDATE ON workflow.resync_items FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: resync_requests trg_history_resync_requests; Type: TRIGGER; Schema: workflow; Owner: -
--

CREATE TRIGGER trg_history_resync_requests AFTER INSERT OR DELETE OR UPDATE ON workflow.resync_requests FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: routing_rules trg_history_routing_rules; Type: TRIGGER; Schema: workflow; Owner: -
--

CREATE TRIGGER trg_history_routing_rules AFTER INSERT OR DELETE OR UPDATE ON workflow.routing_rules FOR EACH ROW EXECUTE FUNCTION public.record_history_trigger();


--
-- Name: order_sagas trg_updated_at; Type: TRIGGER; Schema: workflow; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON workflow.order_sagas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: resync_requests trg_updated_at; Type: TRIGGER; Schema: workflow; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON workflow.resync_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ai_fix_log ai_fix_log_factory_id_fkey; Type: FK CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.ai_fix_log
    ADD CONSTRAINT ai_fix_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: mapping_configs mapping_configs_connection_id_fkey; Type: FK CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.mapping_configs
    ADD CONSTRAINT mapping_configs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: mapping_configs mapping_configs_factory_id_fkey; Type: FK CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.mapping_configs
    ADD CONSTRAINT mapping_configs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: impersonation_sessions impersonation_sessions_factory_id_fkey; Type: FK CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.impersonation_sessions
    ADD CONSTRAINT impersonation_sessions_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id) ON DELETE CASCADE;


--
-- Name: ca_clients ca_clients_assigned_staff_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.ca_clients
    ADD CONSTRAINT ca_clients_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES compliance.ca_firm_staff(id);


--
-- Name: ca_clients ca_clients_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.ca_clients
    ADD CONSTRAINT ca_clients_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: ca_firm_staff ca_firm_staff_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.ca_firm_staff
    ADD CONSTRAINT ca_firm_staff_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: client_health_scores client_health_scores_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.client_health_scores
    ADD CONSTRAINT client_health_scores_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: client_health_scores client_health_scores_client_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.client_health_scores
    ADD CONSTRAINT client_health_scores_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;


--
-- Name: communication_log communication_log_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.communication_log
    ADD CONSTRAINT communication_log_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: communication_log communication_log_client_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.communication_log
    ADD CONSTRAINT communication_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;


--
-- Name: communication_log communication_log_related_filing_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.communication_log
    ADD CONSTRAINT communication_log_related_filing_id_fkey FOREIGN KEY (related_filing_id) REFERENCES compliance.compliance_filings(id);


--
-- Name: communication_log communication_log_related_notice_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.communication_log
    ADD CONSTRAINT communication_log_related_notice_id_fkey FOREIGN KEY (related_notice_id) REFERENCES compliance.notices(id);


--
-- Name: communication_log communication_log_staff_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.communication_log
    ADD CONSTRAINT communication_log_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES compliance.ca_firm_staff(id);


--
-- Name: compliance_exceptions compliance_exceptions_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: compliance_exceptions compliance_exceptions_client_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;


--
-- Name: compliance_exceptions compliance_exceptions_filing_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_filing_id_fkey FOREIGN KEY (filing_id) REFERENCES compliance.compliance_filings(id) ON DELETE CASCADE;


--
-- Name: compliance_exceptions compliance_exceptions_resolved_by_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES compliance.ca_firm_staff(id);


--
-- Name: compliance_filings compliance_filings_assigned_staff_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_filings
    ADD CONSTRAINT compliance_filings_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES compliance.ca_firm_staff(id);


--
-- Name: compliance_filings compliance_filings_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_filings
    ADD CONSTRAINT compliance_filings_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: compliance_filings compliance_filings_client_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.compliance_filings
    ADD CONSTRAINT compliance_filings_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;


--
-- Name: document_requests document_requests_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.document_requests
    ADD CONSTRAINT document_requests_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: document_requests document_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.document_requests
    ADD CONSTRAINT document_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;


--
-- Name: document_requests document_requests_filing_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.document_requests
    ADD CONSTRAINT document_requests_filing_id_fkey FOREIGN KEY (filing_id) REFERENCES compliance.compliance_filings(id);


--
-- Name: document_requests document_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.document_requests
    ADD CONSTRAINT document_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES compliance.ca_firm_staff(id);


--
-- Name: document_requests document_requests_template_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.document_requests
    ADD CONSTRAINT document_requests_template_id_fkey FOREIGN KEY (template_id) REFERENCES compliance.document_templates(id);


--
-- Name: document_templates document_templates_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.document_templates
    ADD CONSTRAINT document_templates_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: notices notices_assigned_staff_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.notices
    ADD CONSTRAINT notices_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES compliance.ca_firm_staff(id);


--
-- Name: notices notices_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.notices
    ADD CONSTRAINT notices_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: notices notices_client_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.notices
    ADD CONSTRAINT notices_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;


--
-- Name: reconciliation_items reconciliation_items_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.reconciliation_items
    ADD CONSTRAINT reconciliation_items_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: reconciliation_items reconciliation_items_session_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.reconciliation_items
    ADD CONSTRAINT reconciliation_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES compliance.reconciliation_sessions(id) ON DELETE CASCADE;


--
-- Name: reconciliation_sessions reconciliation_sessions_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.reconciliation_sessions
    ADD CONSTRAINT reconciliation_sessions_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: reconciliation_sessions reconciliation_sessions_client_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.reconciliation_sessions
    ADD CONSTRAINT reconciliation_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES compliance.ca_clients(id) ON DELETE CASCADE;


--
-- Name: reconciliation_sessions reconciliation_sessions_initiated_by_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.reconciliation_sessions
    ADD CONSTRAINT reconciliation_sessions_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES compliance.ca_firm_staff(id);


--
-- Name: staff_activity_log staff_activity_log_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.staff_activity_log
    ADD CONSTRAINT staff_activity_log_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES compliance.ca_firms(id) ON DELETE CASCADE;


--
-- Name: staff_activity_log staff_activity_log_staff_id_fkey; Type: FK CONSTRAINT; Schema: compliance; Owner: -
--

ALTER TABLE ONLY compliance.staff_activity_log
    ADD CONSTRAINT staff_activity_log_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES compliance.ca_firm_staff(id) ON DELETE CASCADE;


--
-- Name: barcode_configs barcode_configs_factory_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.barcode_configs
    ADD CONSTRAINT barcode_configs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: buyers buyers_factory_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.buyers
    ADD CONSTRAINT buyers_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: connections connections_buyer_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.connections
    ADD CONSTRAINT connections_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES core.buyers(id);


--
-- Name: connections connections_factory_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.connections
    ADD CONSTRAINT connections_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: connector_requests connector_requests_factory_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.connector_requests
    ADD CONSTRAINT connector_requests_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: item_master item_master_buyer_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.item_master
    ADD CONSTRAINT item_master_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES core.buyers(id);


--
-- Name: item_master item_master_factory_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.item_master
    ADD CONSTRAINT item_master_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: rate_cards rate_cards_buyer_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.rate_cards
    ADD CONSTRAINT rate_cards_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES core.buyers(id);


--
-- Name: rate_cards rate_cards_factory_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.rate_cards
    ADD CONSTRAINT rate_cards_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: rate_cards rate_cards_item_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.rate_cards
    ADD CONSTRAINT rate_cards_item_id_fkey FOREIGN KEY (item_id) REFERENCES core.item_master(id);


--
-- Name: client_session_auth_status auth_status_constraint; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session_auth_status
    ADD CONSTRAINT auth_status_constraint FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: identity_provider fk2b4ebc52ae5c3b34; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT fk2b4ebc52ae5c3b34 FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: client_attributes fk3c47c64beacca966; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_attributes
    ADD CONSTRAINT fk3c47c64beacca966 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: federated_identity fk404288b92ef007a6; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.federated_identity
    ADD CONSTRAINT fk404288b92ef007a6 FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: client_node_registrations fk4129723ba992f594; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_node_registrations
    ADD CONSTRAINT fk4129723ba992f594 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: client_session_note fk5edfb00ff51c2736; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session_note
    ADD CONSTRAINT fk5edfb00ff51c2736 FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: user_session_note fk5edfb00ff51d3472; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_session_note
    ADD CONSTRAINT fk5edfb00ff51d3472 FOREIGN KEY (user_session) REFERENCES keycloak.user_session(id);


--
-- Name: client_session_role fk_11b7sgqw18i532811v7o2dv76; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session_role
    ADD CONSTRAINT fk_11b7sgqw18i532811v7o2dv76 FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: redirect_uris fk_1burs8pb4ouj97h5wuppahv9f; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.redirect_uris
    ADD CONSTRAINT fk_1burs8pb4ouj97h5wuppahv9f FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: user_federation_provider fk_1fj32f6ptolw2qy60cd8n01e8; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_provider
    ADD CONSTRAINT fk_1fj32f6ptolw2qy60cd8n01e8 FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: client_session_prot_mapper fk_33a8sgqw18i532811v7o2dk89; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session_prot_mapper
    ADD CONSTRAINT fk_33a8sgqw18i532811v7o2dk89 FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: realm_required_credential fk_5hg65lybevavkqfki3kponh9v; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_required_credential
    ADD CONSTRAINT fk_5hg65lybevavkqfki3kponh9v FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: resource_attribute fk_5hrm2vlf9ql5fu022kqepovbr; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu022kqepovbr FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: user_attribute fk_5hrm2vlf9ql5fu043kqepovbr; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu043kqepovbr FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: user_required_action fk_6qj3w1jw9cvafhe19bwsiuvmd; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_required_action
    ADD CONSTRAINT fk_6qj3w1jw9cvafhe19bwsiuvmd FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: keycloak_role fk_6vyqfe4cn4wlq8r6kt5vdsj5c; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT fk_6vyqfe4cn4wlq8r6kt5vdsj5c FOREIGN KEY (realm) REFERENCES keycloak.realm(id);


--
-- Name: realm_smtp_config fk_70ej8xdxgxd0b9hh6180irr0o; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_smtp_config
    ADD CONSTRAINT fk_70ej8xdxgxd0b9hh6180irr0o FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_attribute fk_8shxd6l3e9atqukacxgpffptw; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_attribute
    ADD CONSTRAINT fk_8shxd6l3e9atqukacxgpffptw FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: composite_role fk_a63wvekftu8jo1pnj81e7mce2; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT fk_a63wvekftu8jo1pnj81e7mce2 FOREIGN KEY (composite) REFERENCES keycloak.keycloak_role(id);


--
-- Name: authentication_execution fk_auth_exec_flow; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT fk_auth_exec_flow FOREIGN KEY (flow_id) REFERENCES keycloak.authentication_flow(id);


--
-- Name: authentication_execution fk_auth_exec_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT fk_auth_exec_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: authentication_flow fk_auth_flow_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.authentication_flow
    ADD CONSTRAINT fk_auth_flow_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: authenticator_config fk_auth_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.authenticator_config
    ADD CONSTRAINT fk_auth_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: client_session fk_b4ao2vcvat6ukau74wbwtfqo1; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_session
    ADD CONSTRAINT fk_b4ao2vcvat6ukau74wbwtfqo1 FOREIGN KEY (session_id) REFERENCES keycloak.user_session(id);


--
-- Name: user_role_mapping fk_c4fqv34p1mbylloxang7b1q3l; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_role_mapping
    ADD CONSTRAINT fk_c4fqv34p1mbylloxang7b1q3l FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: client_scope_attributes fk_cl_scope_attr_scope; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_scope_attributes
    ADD CONSTRAINT fk_cl_scope_attr_scope FOREIGN KEY (scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: client_scope_role_mapping fk_cl_scope_rm_scope; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_scope_role_mapping
    ADD CONSTRAINT fk_cl_scope_rm_scope FOREIGN KEY (scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: client_user_session_note fk_cl_usr_ses_note; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_user_session_note
    ADD CONSTRAINT fk_cl_usr_ses_note FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: protocol_mapper fk_cli_scope_mapper; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT fk_cli_scope_mapper FOREIGN KEY (client_scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: client_initial_access fk_client_init_acc_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.client_initial_access
    ADD CONSTRAINT fk_client_init_acc_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: component_config fk_component_config; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.component_config
    ADD CONSTRAINT fk_component_config FOREIGN KEY (component_id) REFERENCES keycloak.component(id);


--
-- Name: component fk_component_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.component
    ADD CONSTRAINT fk_component_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_default_groups fk_def_groups_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT fk_def_groups_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: user_federation_mapper_config fk_fedmapper_cfg; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_mapper_config
    ADD CONSTRAINT fk_fedmapper_cfg FOREIGN KEY (user_federation_mapper_id) REFERENCES keycloak.user_federation_mapper(id);


--
-- Name: user_federation_mapper fk_fedmapperpm_fedprv; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_fedprv FOREIGN KEY (federation_provider_id) REFERENCES keycloak.user_federation_provider(id);


--
-- Name: user_federation_mapper fk_fedmapperpm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: associated_policy fk_frsr5s213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT fk_frsr5s213xcx4wnkog82ssrfy FOREIGN KEY (associated_policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: scope_policy fk_frsrasp13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT fk_frsrasp13xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog82sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82sspmt FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_server_resource fk_frsrho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog83sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog83sspmt FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog84sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog84sspmt FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: associated_policy fk_frsrpas14xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT fk_frsrpas14xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: scope_policy fk_frsrpass3xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT fk_frsrpass3xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: resource_server_perm_ticket fk_frsrpo2128cx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrpo2128cx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_server_policy fk_frsrpo213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT fk_frsrpo213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_scope fk_frsrpos13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT fk_frsrpos13xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_policy fk_frsrpos53xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT fk_frsrpos53xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_policy fk_frsrpp213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT fk_frsrpp213xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_scope fk_frsrps213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT fk_frsrps213xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: resource_server_scope fk_frsrso213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT fk_frsrso213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: composite_role fk_gr7thllb9lu8q4vqa4524jjy8; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT fk_gr7thllb9lu8q4vqa4524jjy8 FOREIGN KEY (child_role) REFERENCES keycloak.keycloak_role(id);


--
-- Name: user_consent_client_scope fk_grntcsnt_clsc_usc; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_consent_client_scope
    ADD CONSTRAINT fk_grntcsnt_clsc_usc FOREIGN KEY (user_consent_id) REFERENCES keycloak.user_consent(id);


--
-- Name: user_consent fk_grntcsnt_user; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT fk_grntcsnt_user FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: group_attribute fk_group_attribute_group; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.group_attribute
    ADD CONSTRAINT fk_group_attribute_group FOREIGN KEY (group_id) REFERENCES keycloak.keycloak_group(id);


--
-- Name: group_role_mapping fk_group_role_group; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.group_role_mapping
    ADD CONSTRAINT fk_group_role_group FOREIGN KEY (group_id) REFERENCES keycloak.keycloak_group(id);


--
-- Name: realm_enabled_event_types fk_h846o4h0w8epx5nwedrf5y69j; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_enabled_event_types
    ADD CONSTRAINT fk_h846o4h0w8epx5nwedrf5y69j FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_events_listeners fk_h846o4h0w8epx5nxev9f5y69j; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_events_listeners
    ADD CONSTRAINT fk_h846o4h0w8epx5nxev9f5y69j FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: identity_provider_mapper fk_idpm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.identity_provider_mapper
    ADD CONSTRAINT fk_idpm_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: idp_mapper_config fk_idpmconfig; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.idp_mapper_config
    ADD CONSTRAINT fk_idpmconfig FOREIGN KEY (idp_mapper_id) REFERENCES keycloak.identity_provider_mapper(id);


--
-- Name: web_origins fk_lojpho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.web_origins
    ADD CONSTRAINT fk_lojpho213xcx4wnkog82ssrfy FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: scope_mapping fk_ouse064plmlr732lxjcn1q5f1; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.scope_mapping
    ADD CONSTRAINT fk_ouse064plmlr732lxjcn1q5f1 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: protocol_mapper fk_pcm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT fk_pcm_realm FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: credential fk_pfyr0glasqyl0dei3kl69r6v0; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.credential
    ADD CONSTRAINT fk_pfyr0glasqyl0dei3kl69r6v0 FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: protocol_mapper_config fk_pmconfig; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.protocol_mapper_config
    ADD CONSTRAINT fk_pmconfig FOREIGN KEY (protocol_mapper_id) REFERENCES keycloak.protocol_mapper(id);


--
-- Name: default_client_scope fk_r_def_cli_scope_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.default_client_scope
    ADD CONSTRAINT fk_r_def_cli_scope_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: required_action_provider fk_req_act_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.required_action_provider
    ADD CONSTRAINT fk_req_act_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: resource_uris fk_resource_server_uris; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.resource_uris
    ADD CONSTRAINT fk_resource_server_uris FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: role_attribute fk_role_attribute_id; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.role_attribute
    ADD CONSTRAINT fk_role_attribute_id FOREIGN KEY (role_id) REFERENCES keycloak.keycloak_role(id);


--
-- Name: realm_supported_locales fk_supported_locales_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.realm_supported_locales
    ADD CONSTRAINT fk_supported_locales_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: user_federation_config fk_t13hpu1j94r2ebpekr39x5eu5; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_federation_config
    ADD CONSTRAINT fk_t13hpu1j94r2ebpekr39x5eu5 FOREIGN KEY (user_federation_provider_id) REFERENCES keycloak.user_federation_provider(id);


--
-- Name: user_group_membership fk_user_group_user; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.user_group_membership
    ADD CONSTRAINT fk_user_group_user FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: policy_config fkdc34197cf864c4e43; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.policy_config
    ADD CONSTRAINT fkdc34197cf864c4e43 FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: identity_provider_config fkdc4897cf864c4e43; Type: FK CONSTRAINT; Schema: keycloak; Owner: -
--

ALTER TABLE ONLY keycloak.identity_provider_config
    ADD CONSTRAINT fkdc4897cf864c4e43 FOREIGN KEY (identity_provider_id) REFERENCES keycloak.identity_provider(internal_id);


--
-- Name: canonical_invoices canonical_invoices_connection_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_invoices
    ADD CONSTRAINT canonical_invoices_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: canonical_invoices canonical_invoices_factory_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_invoices
    ADD CONSTRAINT canonical_invoices_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: canonical_invoices canonical_invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_invoices
    ADD CONSTRAINT canonical_invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id);


--
-- Name: canonical_invoices canonical_invoices_shipment_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_invoices
    ADD CONSTRAINT canonical_invoices_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES orders.canonical_shipments(id);


--
-- Name: canonical_order_line_items canonical_order_line_items_factory_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_order_line_items
    ADD CONSTRAINT canonical_order_line_items_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: canonical_order_line_items canonical_order_line_items_order_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_order_line_items
    ADD CONSTRAINT canonical_order_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id) ON DELETE CASCADE;


--
-- Name: canonical_orders canonical_orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_orders
    ADD CONSTRAINT canonical_orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES core.buyers(id);


--
-- Name: canonical_orders canonical_orders_connection_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_orders
    ADD CONSTRAINT canonical_orders_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: canonical_orders canonical_orders_factory_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_orders
    ADD CONSTRAINT canonical_orders_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: canonical_returns canonical_returns_connection_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_returns
    ADD CONSTRAINT canonical_returns_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: canonical_returns canonical_returns_factory_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_returns
    ADD CONSTRAINT canonical_returns_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: canonical_returns canonical_returns_order_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_returns
    ADD CONSTRAINT canonical_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id);


--
-- Name: canonical_shipments canonical_shipments_connection_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_shipments
    ADD CONSTRAINT canonical_shipments_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: canonical_shipments canonical_shipments_factory_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_shipments
    ADD CONSTRAINT canonical_shipments_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: canonical_shipments canonical_shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.canonical_shipments
    ADD CONSTRAINT canonical_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id);


--
-- Name: message_log message_log_connection_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.message_log
    ADD CONSTRAINT message_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: message_log message_log_factory_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.message_log
    ADD CONSTRAINT message_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: message_log message_log_order_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.message_log
    ADD CONSTRAINT message_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id);


--
-- Name: shipment_packs shipment_packs_factory_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.shipment_packs
    ADD CONSTRAINT shipment_packs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: shipment_packs shipment_packs_shipment_id_fkey; Type: FK CONSTRAINT; Schema: orders; Owner: -
--

ALTER TABLE ONLY orders.shipment_packs
    ADD CONSTRAINT shipment_packs_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES orders.canonical_shipments(id) ON DELETE CASCADE;


--
-- Name: calendar_entries calendar_entries_factory_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.calendar_entries
    ADD CONSTRAINT calendar_entries_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: commission_ledger commission_ledger_factory_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.commission_ledger
    ADD CONSTRAINT commission_ledger_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id) ON DELETE CASCADE;


--
-- Name: commission_ledger commission_ledger_partner_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.commission_ledger
    ADD CONSTRAINT commission_ledger_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES platform.partners(id) ON DELETE CASCADE;


--
-- Name: escalation_log escalation_log_connection_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.escalation_log
    ADD CONSTRAINT escalation_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: escalation_log escalation_log_factory_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.escalation_log
    ADD CONSTRAINT escalation_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: escalation_rules escalation_rules_factory_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.escalation_rules
    ADD CONSTRAINT escalation_rules_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: escalation_rules escalation_rules_template_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.escalation_rules
    ADD CONSTRAINT escalation_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES platform.notification_templates(id);


--
-- Name: factory_preferences factory_preferences_flag_name_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.factory_preferences
    ADD CONSTRAINT factory_preferences_flag_name_fkey FOREIGN KEY (flag_name) REFERENCES platform.feature_flags(flag_name) ON DELETE CASCADE;


--
-- Name: factory_preferences factory_preferences_tenant_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.factory_preferences
    ADD CONSTRAINT factory_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES core.factories(id) ON DELETE CASCADE;


--
-- Name: operational_profile operational_profile_factory_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.operational_profile
    ADD CONSTRAINT operational_profile_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: partner_referrals partner_referrals_factory_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.partner_referrals
    ADD CONSTRAINT partner_referrals_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id) ON DELETE CASCADE;


--
-- Name: partner_referrals partner_referrals_partner_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.partner_referrals
    ADD CONSTRAINT partner_referrals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES platform.partners(id) ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_subscription_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES platform.webhook_subscriptions(id);


--
-- Name: webhook_subscriptions webhook_subscriptions_factory_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: ai_fix_log ai_fix_log_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_fix_log
    ADD CONSTRAINT ai_fix_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: barcode_configs barcode_configs_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode_configs
    ADD CONSTRAINT barcode_configs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: buyers buyers_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: ca_clients ca_clients_assigned_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_clients
    ADD CONSTRAINT ca_clients_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES public.ca_firm_staff(id);


--
-- Name: ca_clients ca_clients_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_clients
    ADD CONSTRAINT ca_clients_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: ca_firm_staff ca_firm_staff_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_firm_staff
    ADD CONSTRAINT ca_firm_staff_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: calendar_entries calendar_entries_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_entries
    ADD CONSTRAINT calendar_entries_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: canonical_invoices canonical_invoices_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_invoices
    ADD CONSTRAINT canonical_invoices_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: canonical_invoices canonical_invoices_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_invoices
    ADD CONSTRAINT canonical_invoices_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: canonical_invoices canonical_invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_invoices
    ADD CONSTRAINT canonical_invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.canonical_orders(id);


--
-- Name: canonical_invoices canonical_invoices_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_invoices
    ADD CONSTRAINT canonical_invoices_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.canonical_shipments(id);


--
-- Name: canonical_order_line_items canonical_order_line_items_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_order_line_items
    ADD CONSTRAINT canonical_order_line_items_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: canonical_order_line_items canonical_order_line_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_order_line_items
    ADD CONSTRAINT canonical_order_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.canonical_orders(id) ON DELETE CASCADE;


--
-- Name: canonical_orders canonical_orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_orders
    ADD CONSTRAINT canonical_orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id);


--
-- Name: canonical_orders canonical_orders_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_orders
    ADD CONSTRAINT canonical_orders_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: canonical_orders canonical_orders_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_orders
    ADD CONSTRAINT canonical_orders_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: canonical_returns canonical_returns_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_returns
    ADD CONSTRAINT canonical_returns_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: canonical_returns canonical_returns_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_returns
    ADD CONSTRAINT canonical_returns_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: canonical_returns canonical_returns_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_returns
    ADD CONSTRAINT canonical_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.canonical_orders(id);


--
-- Name: canonical_shipments canonical_shipments_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_shipments
    ADD CONSTRAINT canonical_shipments_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: canonical_shipments canonical_shipments_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_shipments
    ADD CONSTRAINT canonical_shipments_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: canonical_shipments canonical_shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_shipments
    ADD CONSTRAINT canonical_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.canonical_orders(id);


--
-- Name: client_health_scores client_health_scores_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_health_scores
    ADD CONSTRAINT client_health_scores_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: client_health_scores client_health_scores_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_health_scores
    ADD CONSTRAINT client_health_scores_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.ca_clients(id) ON DELETE CASCADE;


--
-- Name: commission_ledger commission_ledger_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_ledger
    ADD CONSTRAINT commission_ledger_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: commission_ledger commission_ledger_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_ledger
    ADD CONSTRAINT commission_ledger_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: communication_log communication_log_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: communication_log communication_log_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.ca_clients(id) ON DELETE CASCADE;


--
-- Name: compliance_exceptions compliance_exceptions_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: compliance_exceptions compliance_exceptions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.ca_clients(id) ON DELETE CASCADE;


--
-- Name: compliance_exceptions compliance_exceptions_filing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_exceptions
    ADD CONSTRAINT compliance_exceptions_filing_id_fkey FOREIGN KEY (filing_id) REFERENCES public.compliance_filings(id) ON DELETE CASCADE;


--
-- Name: compliance_filings compliance_filings_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_filings
    ADD CONSTRAINT compliance_filings_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: compliance_filings compliance_filings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_filings
    ADD CONSTRAINT compliance_filings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.ca_clients(id) ON DELETE CASCADE;


--
-- Name: connections connections_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id);


--
-- Name: connections connections_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: connector_requests connector_requests_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_requests
    ADD CONSTRAINT connector_requests_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: document_requests document_requests_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: document_requests document_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.ca_clients(id) ON DELETE CASCADE;


--
-- Name: document_templates document_templates_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: escalation_log escalation_log_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_log
    ADD CONSTRAINT escalation_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: escalation_log escalation_log_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_log
    ADD CONSTRAINT escalation_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: escalation_rules escalation_rules_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: escalation_rules escalation_rules_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(id);


--
-- Name: factory_preferences factory_preferences_flag_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_preferences
    ADD CONSTRAINT factory_preferences_flag_name_fkey FOREIGN KEY (flag_name) REFERENCES public.feature_flags(flag_name) ON DELETE CASCADE;


--
-- Name: factory_preferences factory_preferences_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factory_preferences
    ADD CONSTRAINT factory_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: impersonation_sessions impersonation_sessions_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impersonation_sessions
    ADD CONSTRAINT impersonation_sessions_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: item_master item_master_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_master
    ADD CONSTRAINT item_master_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id);


--
-- Name: item_master item_master_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_master
    ADD CONSTRAINT item_master_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: mapping_configs mapping_configs_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mapping_configs
    ADD CONSTRAINT mapping_configs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: mapping_configs mapping_configs_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mapping_configs
    ADD CONSTRAINT mapping_configs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: message_log message_log_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_log
    ADD CONSTRAINT message_log_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: message_log message_log_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_log
    ADD CONSTRAINT message_log_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: message_log message_log_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_log
    ADD CONSTRAINT message_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.canonical_orders(id);


--
-- Name: notices notices_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: notices notices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.ca_clients(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: operational_profile operational_profile_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_profile
    ADD CONSTRAINT operational_profile_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: order_sagas order_sagas_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_sagas
    ADD CONSTRAINT order_sagas_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: order_sagas order_sagas_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_sagas
    ADD CONSTRAINT order_sagas_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: order_sagas order_sagas_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_sagas
    ADD CONSTRAINT order_sagas_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.canonical_orders(id);


--
-- Name: partner_referrals partner_referrals_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referrals
    ADD CONSTRAINT partner_referrals_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: partner_referrals partner_referrals_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referrals
    ADD CONSTRAINT partner_referrals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: rate_cards rate_cards_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT rate_cards_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id);


--
-- Name: rate_cards rate_cards_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT rate_cards_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: rate_cards rate_cards_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT rate_cards_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item_master(id);


--
-- Name: reconciliation_items reconciliation_items_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE;


--
-- Name: reconciliation_sessions reconciliation_sessions_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_sessions
    ADD CONSTRAINT reconciliation_sessions_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: reconciliation_sessions reconciliation_sessions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_sessions
    ADD CONSTRAINT reconciliation_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.ca_clients(id) ON DELETE CASCADE;


--
-- Name: resync_items resync_items_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resync_items
    ADD CONSTRAINT resync_items_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: resync_items resync_items_original_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resync_items
    ADD CONSTRAINT resync_items_original_order_id_fkey FOREIGN KEY (original_order_id) REFERENCES public.canonical_orders(id);


--
-- Name: resync_items resync_items_resync_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resync_items
    ADD CONSTRAINT resync_items_resync_id_fkey FOREIGN KEY (resync_id) REFERENCES public.resync_requests(id) ON DELETE CASCADE;


--
-- Name: resync_requests resync_requests_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resync_requests
    ADD CONSTRAINT resync_requests_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: resync_requests resync_requests_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resync_requests
    ADD CONSTRAINT resync_requests_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: routing_rules routing_rules_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_rules
    ADD CONSTRAINT routing_rules_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: routing_rules routing_rules_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_rules
    ADD CONSTRAINT routing_rules_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: shipment_packs shipment_packs_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_packs
    ADD CONSTRAINT shipment_packs_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: shipment_packs shipment_packs_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_packs
    ADD CONSTRAINT shipment_packs_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.canonical_shipments(id) ON DELETE CASCADE;


--
-- Name: staff_activity_log staff_activity_log_ca_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_activity_log
    ADD CONSTRAINT staff_activity_log_ca_firm_id_fkey FOREIGN KEY (ca_firm_id) REFERENCES public.ca_firms(id) ON DELETE CASCADE;


--
-- Name: staff_activity_log staff_activity_log_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_activity_log
    ADD CONSTRAINT staff_activity_log_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.ca_firm_staff(id) ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: webhook_deliveries webhook_deliveries_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE;


--
-- Name: webhook_subscriptions webhook_subscriptions_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id);


--
-- Name: order_sagas order_sagas_connection_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.order_sagas
    ADD CONSTRAINT order_sagas_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: order_sagas order_sagas_factory_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.order_sagas
    ADD CONSTRAINT order_sagas_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: order_sagas order_sagas_order_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.order_sagas
    ADD CONSTRAINT order_sagas_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders.canonical_orders(id);


--
-- Name: resync_items resync_items_factory_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.resync_items
    ADD CONSTRAINT resync_items_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: resync_items resync_items_original_order_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.resync_items
    ADD CONSTRAINT resync_items_original_order_id_fkey FOREIGN KEY (original_order_id) REFERENCES orders.canonical_orders(id);


--
-- Name: resync_items resync_items_resync_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.resync_items
    ADD CONSTRAINT resync_items_resync_id_fkey FOREIGN KEY (resync_id) REFERENCES workflow.resync_requests(id) ON DELETE CASCADE;


--
-- Name: resync_requests resync_requests_connection_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.resync_requests
    ADD CONSTRAINT resync_requests_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: resync_requests resync_requests_factory_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.resync_requests
    ADD CONSTRAINT resync_requests_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: routing_rules routing_rules_connection_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.routing_rules
    ADD CONSTRAINT routing_rules_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES core.connections(id);


--
-- Name: routing_rules routing_rules_factory_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: -
--

ALTER TABLE ONLY workflow.routing_rules
    ADD CONSTRAINT routing_rules_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES core.factories(id);


--
-- Name: ai_fix_log; Type: ROW SECURITY; Schema: ai; Owner: -
--

ALTER TABLE ai.ai_fix_log ENABLE ROW LEVEL SECURITY;

--
-- Name: mapping_configs; Type: ROW SECURITY; Schema: ai; Owner: -
--

ALTER TABLE ai.mapping_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_fix_log tenant_isolation; Type: POLICY; Schema: ai; Owner: -
--

CREATE POLICY tenant_isolation ON ai.ai_fix_log USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: mapping_configs tenant_isolation; Type: POLICY; Schema: ai; Owner: -
--

CREATE POLICY tenant_isolation ON ai.mapping_configs USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: ca_clients; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.ca_clients ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_clients ca_clients_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY ca_clients_tenant ON compliance.ca_clients USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: ca_firm_staff; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.ca_firm_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_firm_staff ca_firm_staff_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY ca_firm_staff_tenant ON compliance.ca_firm_staff USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: ca_firms; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.ca_firms ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_firms ca_firms_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY ca_firms_tenant ON compliance.ca_firms USING ((id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: client_health_scores; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.client_health_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: client_health_scores client_health_scores_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY client_health_scores_tenant ON compliance.client_health_scores USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: communication_log; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.communication_log ENABLE ROW LEVEL SECURITY;

--
-- Name: communication_log communication_log_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY communication_log_tenant ON compliance.communication_log USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: compliance_exceptions; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.compliance_exceptions ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_exceptions compliance_exceptions_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY compliance_exceptions_tenant ON compliance.compliance_exceptions USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: compliance_filings; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.compliance_filings ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_filings compliance_filings_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY compliance_filings_tenant ON compliance.compliance_filings USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: document_requests; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.document_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: document_requests document_requests_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY document_requests_tenant ON compliance.document_requests USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: document_templates; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.document_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: document_templates document_templates_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY document_templates_tenant ON compliance.document_templates USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: notices; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.notices ENABLE ROW LEVEL SECURITY;

--
-- Name: notices notices_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY notices_tenant ON compliance.notices USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: reconciliation_items; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.reconciliation_items ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_items reconciliation_items_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY reconciliation_items_tenant ON compliance.reconciliation_items USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: reconciliation_sessions; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.reconciliation_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_sessions reconciliation_sessions_tenant; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY reconciliation_sessions_tenant ON compliance.reconciliation_sessions USING ((ca_firm_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: staff_activity_log; Type: ROW SECURITY; Schema: compliance; Owner: -
--

ALTER TABLE compliance.staff_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: document_templates tenant_isolation; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY tenant_isolation ON compliance.document_templates USING (((ca_firm_id IS NULL) OR ((ca_firm_id)::text = current_setting('app.current_tenant'::text, true))));


--
-- Name: reconciliation_items tenant_isolation; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY tenant_isolation ON compliance.reconciliation_items USING ((session_id IN ( SELECT reconciliation_sessions.id
   FROM compliance.reconciliation_sessions
  WHERE ((reconciliation_sessions.ca_firm_id)::text = current_setting('app.current_tenant'::text, true)))));


--
-- Name: staff_activity_log tenant_isolation; Type: POLICY; Schema: compliance; Owner: -
--

CREATE POLICY tenant_isolation ON compliance.staff_activity_log USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: barcode_configs; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.barcode_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: buyers; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.buyers ENABLE ROW LEVEL SECURITY;

--
-- Name: connections; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.connections ENABLE ROW LEVEL SECURITY;

--
-- Name: factories; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.factories ENABLE ROW LEVEL SECURITY;

--
-- Name: item_master; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.item_master ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_cards; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.rate_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: barcode_configs tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.barcode_configs USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: buyers tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.buyers USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: connections tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.connections USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: factories tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.factories USING (((id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: item_master tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.item_master USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: rate_cards tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.rate_cards USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_invoices; Type: ROW SECURITY; Schema: orders; Owner: -
--

ALTER TABLE orders.canonical_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_order_line_items; Type: ROW SECURITY; Schema: orders; Owner: -
--

ALTER TABLE orders.canonical_order_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_orders; Type: ROW SECURITY; Schema: orders; Owner: -
--

ALTER TABLE orders.canonical_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_returns; Type: ROW SECURITY; Schema: orders; Owner: -
--

ALTER TABLE orders.canonical_returns ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_shipments; Type: ROW SECURITY; Schema: orders; Owner: -
--

ALTER TABLE orders.canonical_shipments ENABLE ROW LEVEL SECURITY;

--
-- Name: message_log; Type: ROW SECURITY; Schema: orders; Owner: -
--

ALTER TABLE orders.message_log ENABLE ROW LEVEL SECURITY;

--
-- Name: shipment_packs; Type: ROW SECURITY; Schema: orders; Owner: -
--

ALTER TABLE orders.shipment_packs ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_invoices tenant_isolation; Type: POLICY; Schema: orders; Owner: -
--

CREATE POLICY tenant_isolation ON orders.canonical_invoices USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_order_line_items tenant_isolation; Type: POLICY; Schema: orders; Owner: -
--

CREATE POLICY tenant_isolation ON orders.canonical_order_line_items USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_orders tenant_isolation; Type: POLICY; Schema: orders; Owner: -
--

CREATE POLICY tenant_isolation ON orders.canonical_orders USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_returns tenant_isolation; Type: POLICY; Schema: orders; Owner: -
--

CREATE POLICY tenant_isolation ON orders.canonical_returns USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_shipments tenant_isolation; Type: POLICY; Schema: orders; Owner: -
--

CREATE POLICY tenant_isolation ON orders.canonical_shipments USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: message_log tenant_isolation; Type: POLICY; Schema: orders; Owner: -
--

CREATE POLICY tenant_isolation ON orders.message_log USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: shipment_packs tenant_isolation; Type: POLICY; Schema: orders; Owner: -
--

CREATE POLICY tenant_isolation ON orders.shipment_packs USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: calendar_entries; Type: ROW SECURITY; Schema: platform; Owner: -
--

ALTER TABLE platform.calendar_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: escalation_log; Type: ROW SECURITY; Schema: platform; Owner: -
--

ALTER TABLE platform.escalation_log ENABLE ROW LEVEL SECURITY;

--
-- Name: escalation_rules; Type: ROW SECURITY; Schema: platform; Owner: -
--

ALTER TABLE platform.escalation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: factory_preferences; Type: ROW SECURITY; Schema: platform; Owner: -
--

ALTER TABLE platform.factory_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: operational_profile; Type: ROW SECURITY; Schema: platform; Owner: -
--

ALTER TABLE platform.operational_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_entries tenant_isolation; Type: POLICY; Schema: platform; Owner: -
--

CREATE POLICY tenant_isolation ON platform.calendar_entries USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: escalation_log tenant_isolation; Type: POLICY; Schema: platform; Owner: -
--

CREATE POLICY tenant_isolation ON platform.escalation_log USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: escalation_rules tenant_isolation; Type: POLICY; Schema: platform; Owner: -
--

CREATE POLICY tenant_isolation ON platform.escalation_rules USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: factory_preferences tenant_isolation; Type: POLICY; Schema: platform; Owner: -
--

CREATE POLICY tenant_isolation ON platform.factory_preferences USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: operational_profile tenant_isolation; Type: POLICY; Schema: platform; Owner: -
--

CREATE POLICY tenant_isolation ON platform.operational_profile USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: webhook_subscriptions tenant_isolation; Type: POLICY; Schema: platform; Owner: -
--

CREATE POLICY tenant_isolation ON platform.webhook_subscriptions USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: platform; Owner: -
--

ALTER TABLE platform.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_subscriptions; Type: ROW SECURITY; Schema: platform; Owner: -
--

ALTER TABLE platform.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_fix_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_fix_log ENABLE ROW LEVEL SECURITY;

--
-- Name: barcode_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.barcode_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: buyers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_clients ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_firm_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_firm_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_firms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_firms ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_order_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_order_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_returns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_returns ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_shipments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_shipments ENABLE ROW LEVEL SECURITY;

--
-- Name: client_health_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_health_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: communication_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communication_log ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_exceptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_exceptions ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_filings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_filings ENABLE ROW LEVEL SECURITY;

--
-- Name: connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

--
-- Name: document_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: document_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: escalation_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.escalation_log ENABLE ROW LEVEL SECURITY;

--
-- Name: escalation_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: factories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;

--
-- Name: factory_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.factory_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: item_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.item_master ENABLE ROW LEVEL SECURITY;

--
-- Name: mapping_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mapping_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: message_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_log ENABLE ROW LEVEL SECURITY;

--
-- Name: notices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

--
-- Name: operational_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operational_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: order_sagas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_sagas ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reconciliation_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: resync_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resync_items ENABLE ROW LEVEL SECURITY;

--
-- Name: resync_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resync_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: routing_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: shipment_packs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipment_packs ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_fix_log tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.ai_fix_log USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: barcode_configs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.barcode_configs USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: buyers tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.buyers USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: ca_clients tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.ca_clients USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: ca_firm_staff tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.ca_firm_staff USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: ca_firms tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.ca_firms USING (((id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: calendar_entries tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.calendar_entries USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_invoices tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.canonical_invoices USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_order_line_items tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.canonical_order_line_items USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_orders tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.canonical_orders USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_returns tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.canonical_returns USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: canonical_shipments tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.canonical_shipments USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: client_health_scores tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.client_health_scores USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: communication_log tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.communication_log USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: compliance_exceptions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.compliance_exceptions USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: compliance_filings tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.compliance_filings USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: connections tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.connections USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: document_requests tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.document_requests USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: document_templates tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.document_templates USING (((ca_firm_id IS NULL) OR ((ca_firm_id)::text = current_setting('app.current_tenant'::text, true))));


--
-- Name: escalation_log tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.escalation_log USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: escalation_rules tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.escalation_rules USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: factories tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.factories USING (((id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: factory_preferences tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.factory_preferences USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: item_master tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.item_master USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: mapping_configs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.mapping_configs USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: message_log tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.message_log USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: notices tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.notices USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: operational_profile tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.operational_profile USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: order_sagas tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.order_sagas USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: rate_cards tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.rate_cards USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: reconciliation_items tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.reconciliation_items USING ((session_id IN ( SELECT reconciliation_sessions.id
   FROM public.reconciliation_sessions
  WHERE ((reconciliation_sessions.ca_firm_id)::text = current_setting('app.current_tenant'::text, true)))));


--
-- Name: reconciliation_sessions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.reconciliation_sessions USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: resync_items tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.resync_items USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: resync_requests tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.resync_requests USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: routing_rules tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.routing_rules USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: shipment_packs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.shipment_packs USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: staff_activity_log tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.staff_activity_log USING (((ca_firm_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: webhook_deliveries tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.webhook_deliveries USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: webhook_subscriptions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.webhook_subscriptions USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: order_sagas; Type: ROW SECURITY; Schema: workflow; Owner: -
--

ALTER TABLE workflow.order_sagas ENABLE ROW LEVEL SECURITY;

--
-- Name: resync_items; Type: ROW SECURITY; Schema: workflow; Owner: -
--

ALTER TABLE workflow.resync_items ENABLE ROW LEVEL SECURITY;

--
-- Name: resync_requests; Type: ROW SECURITY; Schema: workflow; Owner: -
--

ALTER TABLE workflow.resync_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: routing_rules; Type: ROW SECURITY; Schema: workflow; Owner: -
--

ALTER TABLE workflow.routing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: order_sagas tenant_isolation; Type: POLICY; Schema: workflow; Owner: -
--

CREATE POLICY tenant_isolation ON workflow.order_sagas USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: resync_items tenant_isolation; Type: POLICY; Schema: workflow; Owner: -
--

CREATE POLICY tenant_isolation ON workflow.resync_items USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: resync_requests tenant_isolation; Type: POLICY; Schema: workflow; Owner: -
--

CREATE POLICY tenant_isolation ON workflow.resync_requests USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- Name: routing_rules tenant_isolation; Type: POLICY; Schema: workflow; Owner: -
--

CREATE POLICY tenant_isolation ON workflow.routing_rules USING (((factory_id)::text = current_setting('app.current_tenant'::text, true)));


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('001'),
    ('002'),
    ('003'),
    ('004'),
    ('005'),
    ('006'),
    ('007'),
    ('008'),
    ('009'),
    ('010');
