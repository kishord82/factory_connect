-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- FIX: record_history_trigger should use NULLIF to handle unset tenant
-- context (empty string) gracefully instead of failing with a uuid
-- cast error. This allows cleanup operations that run outside of
-- tenant context (e.g., test teardown) to work correctly.
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
    NULLIF(current_setting('app.current_tenant', true), '')::uuid,
    current_setting('app.correlation_id', true)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- migrate:down

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
