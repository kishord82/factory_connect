# Architecture Decision Records (ADRs)

This folder contains Architecture Decision Records for FactoryConnect.

An ADR captures a significant architectural decision made during the project, including the context, the decision itself, the alternatives considered, and the consequences. ADRs are write-once / append-only — once accepted, they are never deleted. If a decision is superseded, a new ADR is written and the old one is marked as such.

## Format

Each ADR follows this template:

```
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Date:** YYYY-MM-DD
**Author:** Name

## Context
What is the problem? What forces are at play?

## Decision
What decision was made?

## Alternatives Considered
What other options were evaluated and why were they rejected?

## Consequences
What are the trade-offs? What does this make easier? What does this make harder?

## References
Links to relevant docs, issues, or external resources.
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-raw-sql-no-orm.md) | Raw SQL with `pg` — No ORM | Accepted |
| [002](002-pnpm-monorepo.md) | pnpm Workspaces Monorepo | Accepted |
| [003](003-rls-tenant-isolation.md) | PostgreSQL RLS for Multi-Tenant Isolation | Accepted |
| [004](004-transactional-outbox.md) | Transactional Outbox Pattern for Reliable Messaging | Accepted |
| [005](005-fle-vault-transit.md) | Field-Level Encryption via HashiCorp Vault Transit | Accepted |

## Full Architecture Context

For the complete set of architecture decisions (21 patterns, all tracks), see:
- `docs/FC_Architecture_Blueprint.md` — master architecture document
- `docs/FC_Architecture_Decisions_History.md` — all 16+ decision codes with implementation code samples
