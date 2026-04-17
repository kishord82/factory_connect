# ADR-001: Raw SQL with `pg` — No ORM

**Status:** Accepted
**Date:** 2026-04-02
**Author:** Kishor Dama

## Context

FactoryConnect processes orders across multiple Indian ERP systems (Tally, Zoho, SAP B1, ERPNext) and global procurement platforms. The database layer needs to:

1. Support PostgreSQL Row-Level Security (RLS) for multi-tenant isolation — this requires `SET LOCAL app.current_tenant` before each query, which most ORMs don't support transparently.
2. Execute schema-qualified queries (`orders.canonical_orders`, not just `canonical_orders`) — this requires explicit control over table references.
3. Avoid `SELECT *` — every query must name its columns explicitly so adding a new column never silently breaks callers.
4. Handle the Transactional Outbox pattern (4 writes in one transaction: domain + outbox + saga + audit) with precise control over each statement.

## Decision

Use raw SQL via the `pg` (node-postgres) library exclusively. No ORM (Prisma, Drizzle, TypeORM, Sequelize, Knex) is permitted anywhere in the codebase.

All queries use parameterized placeholders (`$1`, `$2`, ...) — never string concatenation.

## Alternatives Considered

| ORM / Library | Why Rejected |
|---------------|-------------|
| **Prisma** | Does not support `SET LOCAL` session variables needed for RLS. Schema migrations conflict with dbmate. Generated queries use `SELECT *` internally. |
| **Drizzle** | Better RLS support but still abstracts away the explicit `SET LOCAL` tenant context step. Hard to guarantee schema-qualified names. |
| **TypeORM** | Large, opinionated, generates inefficient queries. RLS requires custom interceptors that add complexity without reducing it. |
| **Knex (query builder)** | Reduces raw SQL control. The benefit (fluent API) doesn't outweigh the need for precise RLS and outbox query composition. |

## Consequences

**Positive:**
- RLS works correctly — every connection sets tenant context before queries execute.
- Full control over column selection — no accidental `SELECT *` via abstraction.
- Simpler mental model: what you write is what runs.
- No ORM migration conflicts — dbmate owns the migration lifecycle.
- Zero ORM overhead in hot paths (order processing, outbox polling).

**Negative:**
- More boilerplate per query vs. an ORM.
- No automatic type inference from schema — types are manually maintained in `packages/shared/types/`.
- Developers must be disciplined about parameterization; the lint rule `security/detect-non-literal-regexp` and code review catch regressions.

## Implementation Note

All queries MUST follow this pattern:
```typescript
const result = await pool.query(
  `SELECT id, factory_id, buyer_po_number, status, created_at
   FROM orders.canonical_orders
   WHERE factory_id = $1 AND status = $2`,
  [factoryId, status]
);
```

Helper: `packages/database/src/query.ts` wraps `pool.query` with automatic tenant context injection.

## References

- `docs/FC_Architecture_Decisions_History.md` — Decision D4 (Multi-Tenancy), C1 (Outbox)
- `packages/database/src/` — implementation
- `CLAUDE.md` §5 — Database Rules
