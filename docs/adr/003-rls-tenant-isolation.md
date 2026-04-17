# ADR-003: PostgreSQL RLS for Multi-Tenant Isolation

**Status:** Accepted
**Date:** 2026-04-02
**Author:** Kishor Dama

## Context

FactoryConnect is a multi-tenant SaaS. Each tenant is a factory (Indian SME). A factory's order data, mapping configs, connection credentials, and compliance filings must be completely isolated — a bug in application-level filtering must not expose one factory's data to another.

The system must also scale to hundreds of factories on a shared PostgreSQL cluster without per-tenant operational overhead.

## Decision

Use **PostgreSQL Row-Level Security (RLS)** as the primary isolation mechanism, not application-level filtering.

Every tenant-scoped table has:
1. `factory_id UUID NOT NULL` column (or `ca_firm_id` for compliance schema)
2. RLS enabled: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`
3. RLS policy: `CREATE POLICY tenant_isolation ON <table> USING (factory_id = current_setting('app.current_tenant')::uuid)`
4. Application middleware sets tenant context before each query:
   ```sql
   SET LOCAL app.current_tenant = '<uuid>';
   SET LOCAL app.current_user = '<uuid>';
   SET LOCAL app.correlation_id = '<uuid>';
   ```

All 7 database schemas (`core`, `orders`, `workflow`, `compliance`, `audit`, `ai`, `platform`) follow this pattern.

## Alternatives Considered

| Approach | Why Rejected |
|----------|-------------|
| **Schema-per-tenant** | Migration nightmare at 200+ factories — every `ALTER TABLE` runs N times. Operational cost is prohibitive. |
| **Database-per-tenant** | Cost prohibitive (each PG instance needs dedicated resources). Connection overhead prevents pooling. |
| **Application-level filtering** (`WHERE factory_id = $1` in every query) | A single missed `WHERE` clause leaks cross-tenant data. Bugs are silent and catastrophic. |
| **View-per-tenant** | Still requires application-level discipline; views add query planning overhead. |

Both Gemini and ChatGPT independently recommended RLS in their architecture reviews. This was the only approach recommended by both reviewers.

## Consequences

**Positive:**
- Data isolation is mathematically guaranteed by the database — application bugs cannot leak data across tenants.
- Single schema, single migration set — adding a new factory is a data operation, not a schema operation.
- RLS adds only ~5% query overhead (measured with EXPLAIN ANALYZE on canonical_orders).
- Security is auditable: `pg_policies` system view shows all active policies.

**Negative:**
- Every DB connection in a request must call `SET LOCAL` before any query — forgetting this causes the query to return empty results or hit the default-deny policy.
- `SET search_path` is prohibited — all table references must be schema-qualified.
- Testing requires setting tenant context in test setup.
- Connection poolers (PgBouncer) must use `session` mode, not `transaction` mode, for `SET LOCAL` to work correctly.

## Verification Pattern

```typescript
// In tests — verify cross-tenant isolation:
await setTenantContext(clientA, tenantA);
await insertOrder(clientA, { factoryId: tenantA, ... });

await setTenantContext(clientB, tenantB);
const result = await clientB.query('SELECT id FROM orders.canonical_orders');
assert(result.rows.length === 0, 'Cross-tenant data must not be visible');
```

## References

- `docs/FC_Architecture_Decisions_History.md` — Decision D4, C16 (record_history trigger)
- `packages/database/src/rls.ts` — tenant context helpers
- `CLAUDE.md` §5.4 (RLS — Every Query Sets Tenant)
- `CLAUDE.md` §9 (Security — Non-Negotiable)
