-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- fc_app is the bootstrap superuser and cannot be demoted.
-- Create fc_app_rls as a regular (non-superuser) application role
-- that IS subject to RLS policies. Use this role in any context
-- where tenant isolation must be enforced (e.g. test suites).
-- fc_app retains superuser for DDL / migration operations.
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fc_app_rls') THEN
    CREATE ROLE fc_app_rls WITH LOGIN PASSWORD 'fc_password'
      NOSUPERUSER NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA core, orders, workflow, compliance, audit, ai, platform TO fc_app_rls;
GRANT ALL ON ALL TABLES IN SCHEMA core TO fc_app_rls;
GRANT ALL ON ALL TABLES IN SCHEMA orders TO fc_app_rls;
GRANT ALL ON ALL TABLES IN SCHEMA workflow TO fc_app_rls;
GRANT ALL ON ALL TABLES IN SCHEMA compliance TO fc_app_rls;
GRANT ALL ON ALL TABLES IN SCHEMA audit TO fc_app_rls;
GRANT ALL ON ALL TABLES IN SCHEMA ai TO fc_app_rls;
GRANT ALL ON ALL TABLES IN SCHEMA platform TO fc_app_rls;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core TO fc_app_rls;
GRANT ALL ON ALL SEQUENCES IN SCHEMA orders TO fc_app_rls;
GRANT ALL ON ALL SEQUENCES IN SCHEMA workflow TO fc_app_rls;
GRANT ALL ON ALL SEQUENCES IN SCHEMA compliance TO fc_app_rls;
GRANT ALL ON ALL SEQUENCES IN SCHEMA audit TO fc_app_rls;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ai TO fc_app_rls;
GRANT ALL ON ALL SEQUENCES IN SCHEMA platform TO fc_app_rls;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA core TO fc_app_rls;

-- Set search_path so unqualified table names resolve to application schemas
-- (not public), ensuring RLS policies on core/orders/etc. are enforced.
ALTER ROLE fc_app_rls SET search_path TO core, orders, workflow, compliance, audit, ai, platform, public;
ALTER ROLE fc_app     SET search_path TO core, orders, workflow, compliance, audit, ai, platform, public;

-- migrate:down

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA core FROM fc_app_rls;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA orders FROM fc_app_rls;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA workflow FROM fc_app_rls;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA compliance FROM fc_app_rls;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit FROM fc_app_rls;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai FROM fc_app_rls;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform FROM fc_app_rls;
DROP ROLE IF EXISTS fc_app_rls;
