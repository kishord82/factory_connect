# FactoryConnect — Agent Instructions
**Owner:** Kishor Dama (kishord82@gmail.com) | **Repo:** PRIVATE

---

## 1. CONTEXT BOOTSTRAP — READ THESE FIRST

Before writing ANY code, read the architecture docs in order:

1. `docs/FC_Architecture_Blueprint.md` — tech stack, 21 patterns, 3-agent architecture, DB schema, security
2. `docs/FC_SalesOrder_Connector_Design.md` — complete Phase 1 connector design with all features
3. `docs/FC_Development_Plan.md` — task breakdown, 5 parallel tracks, dependencies, hours
4. `docs/FC_Architecture_Decisions_History.md` — implementation-level code samples (outbox SQL, circuit breaker params, PII regex, record history trigger, etc.)

These 4 docs ARE the specification. Do not deviate from them.

---

## 2. MONOREPO STRUCTURE

```
factory_connect/
├── apps/
│   ├── api/                  # Agent 1 — Core (Express.js 5)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── workers/      # BullMQ workers
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── *.test.ts         # Co-located tests (next to source)
│   │   └── package.json
│   ├── bridge/               # Agent 2 — Bridge (standalone Node.js)
│   │   ├── src/
│   │   └── package.json
│   └── portal/               # Agent 3 — Portal (React 19 + Vite 6)
│       ├── src/
│       │   ├── components/
│       │   │   ├── common/   # Shared UI components
│       │   │   └── features/ # Feature-specific components
│       │   ├── hooks/        # Shared hooks
│       │   ├── utils/        # Shared utilities
│       │   ├── stores/       # Zustand stores
│       │   ├── api/          # TanStack Query hooks
│       │   └── pages/
│       └── package.json
├── packages/
│   ├── shared/               # Cross-app types, constants, errors, Zod schemas
│   ├── database/             # Migrations (dbmate), raw SQL helpers, RLS utils
│   └── config/               # ESLint, TSConfig, Vitest base configs
├── docker/                   # Docker Compose + service Dockerfiles
├── docs/                     # Architecture docs (READ FIRST)
├── .env.example              # Template — never commit actual .env
├── Makefile                  # All dev commands
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. TECH STACK — NON-NEGOTIABLE

| Layer | Technology | CRITICAL NOTES |
|-------|-----------|----------------|
| Runtime | Node.js 22 LTS + TypeScript 5 strict | Zero `any` types. Ever. |
| Package manager | pnpm 9.x workspaces | NOT npm, NOT yarn |
| API | Express.js 5 | NOT Fastify, NOT Hono |
| Validation | Zod 3.x | ALL inputs validated. Schemas in `packages/shared/` |
| Database | PostgreSQL 16 + RLS | **RAW SQL with `pg` — NO ORM (no Prisma, no Drizzle, no TypeORM)** |
| Migrations | dbmate | SQL migration files in `packages/database/migrations/` |
| Queue | BullMQ 5 + Redis 7 | NOT Bull, NOT Agenda |
| Auth | Keycloak 24 + MFA (TOTP) | JWT validation middleware |
| Secrets | HashiCorp Vault | Transit engine for FLE. NO secrets in env vars for production. |
| Logging | Pino 9.x | PII redaction interceptor on ALL log output |
| Proxy | Caddy 2.x | Auto-SSL |
| Frontend | React 19 + Vite 6 + shadcn/ui + Tailwind v4 | Zustand for state, TanStack Query for server state |
| Testing | Vitest + Supertest | Co-located (test file next to source file) |
| Container | Docker Compose | ARM64 (OCI Ampere A1) |

---

## 4. CODING STANDARDS — ENFORCED

### 4.1 DRY Rule (MANDATORY)
Any code block appearing **more than 2 times** MUST be extracted to a reusable function.
- Backend shared code → `packages/shared/` or `packages/database/`
- Frontend shared code → `apps/portal/src/components/common/`, `hooks/`, `utils/`
- Enforce via `eslint-plugin-sonarjs` (no-duplicate-string, no-identical-functions)

### 4.2 Naming Conventions
| Context | Convention | Example |
|---------|-----------|---------|
| Files & folders | kebab-case | `order-saga.ts`, `mapping-studio/` |
| Classes | PascalCase | `SagaCoordinator`, `FcError` |
| Functions & methods | camelCase | `processOutbox()`, `validateMapping()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `CLAIM_CHECK_THRESHOLD` |
| DB tables & columns | snake_case | `canonical_orders`, `created_at` |
| Env vars | UPPER_SNAKE_CASE | `DATABASE_URL`, `REDIS_HOST` |
| Zod schemas | PascalCase + Schema suffix | `CanonicalOrderSchema`, `FactoryCreateSchema` |

### 4.3 Function Size
Max **50 lines** per function. If longer, split into helper functions.

### 4.4 Error Handling
Always use `FcError` class with structured error codes:
```typescript
throw new FcError('FC_ERR_MAPPING_INVALID', 'Field X not found in source', {
  field: 'purchase_order_number',
  source: 'tally',
});
```
Error code format: `FC_ERR_{DOMAIN}_{SPECIFIC}` — e.g., `FC_ERR_EDI_ENVELOPE_FAIL`, `FC_ERR_SAGA_TIMEOUT`.

### 4.5 TypeScript Strict
- `strict: true` in all tsconfig
- Zero `any` types — use `unknown` + type guards if type is truly unknown
- All function parameters and return types explicitly typed
- No `@ts-ignore` or `@ts-expect-error` without a comment explaining why

### 4.6 Tests — Co-located
```
src/services/order-service.ts
src/services/order-service.test.ts    ← RIGHT HERE, not in __tests__/
```

### 4.7 Import Order (eslint-plugin-import)
```typescript
// 1. External packages
import express from 'express';
import { z } from 'zod';

// 2. Monorepo packages
import { FcError } from '@fc/shared';
import { query } from '@fc/database';

// 3. Relative imports
import { validateOrder } from './validators';
```

---

## 5. DATABASE RULES

### 5.1 Raw SQL Only — Explicit Column Names (NO SELECT *)
```typescript
// ✅ CORRECT — raw SQL with parameterized queries AND explicit columns
const result = await pool.query(
  `SELECT id, factory_id, buyer_po_number, order_date, status, created_at
   FROM orders.canonical_orders
   WHERE factory_id = $1 AND status = $2`,
  [factoryId, status]
);

// ❌ WRONG — SELECT * (adding a column breaks code, pulls unnecessary data)
const result = await pool.query(
  'SELECT * FROM canonical_orders WHERE factory_id = $1',
  [factoryId]
);

// ❌ WRONG — no ORM, no query builder
const result = await prisma.canonicalOrder.findMany({ where: { factoryId } });
```
**MANDATORY**: Every SELECT query MUST list columns explicitly. `SELECT *` is NEVER allowed.
- Adding a new column to a table must NOT break existing queries or code
- Each query should only fetch columns that the calling code actually uses
- Use schema-qualified table names: `orders.canonical_orders`, `core.factories`, etc.

### 5.2 Database Schemas — 7 Schema Split
All tables MUST be in their designated schema. Never use the `public` schema.

| Schema | Purpose | Key Tables |
|--------|---------|------------|
| `core` | Factory & connection master data | factories, buyers, connections, item_master, rate_cards, connector_catalog, connector_requests, barcode_configs |
| `orders` | Order processing & fulfillment | canonical_orders, canonical_order_line_items, canonical_shipments, shipment_packs, canonical_invoices, canonical_returns, message_log |
| `workflow` | Saga, outbox & resync engine | order_sagas, outbox, resync_requests, resync_items, routing_rules |
| `compliance` | CA platform & filings | ca_firms, ca_firm_staff, ca_clients, compliance_filings, compliance_exceptions, reconciliation_sessions, reconciliation_items, document_requests, document_templates, notices, client_health_scores, communication_log |
| `audit` | Security, audit & history | audit_log, record_history, staff_activity_log, impersonation_sessions |
| `ai` | LLM, AI & mapping | llm_cache, llm_usage_log, ai_fix_log, mapping_configs |
| `platform` | Config, features, partners, notifications | app_config, feature_flags, factory_preferences, notification_templates, calendar_entries, operational_profile, escalation_rules, escalation_log, webhook_subscriptions, webhook_deliveries, relationship_registry, partners, partner_referrals, commission_ledger, subscription_tiers |

**Rules:**
- Always use schema-qualified names in queries: `orders.canonical_orders`, not just `canonical_orders`
- RLS policies apply per-schema: `core` + `orders` = factory_id scoped, `compliance` = ca_firm_id scoped
- `SET search_path` is NOT allowed — always use explicit schema prefix
- Migrations must specify schema in CREATE TABLE statements

### 5.4 RLS — Every Query Sets Tenant
```typescript
// Every request MUST set tenant context before any query
await client.query("SET LOCAL app.current_tenant = $1", [tenantId]);
await client.query("SET LOCAL app.current_user = $1", [userId]);
await client.query("SET LOCAL app.correlation_id = $1", [correlationId]);
```

### 5.5 Transactions for Multi-Table Writes
All multi-table writes use explicit transactions (see Transactional Outbox pattern in Architecture Decisions History doc).

### 5.6 Migrations
```bash
# Create migration
dbmate new "add_canonical_orders_table"
# Run migrations
dbmate up
# Rollback last
dbmate rollback
```
Every migration has both `up` and `down`. Every table gets: RLS policy, record_history trigger, appropriate indexes.

---

## 6. DEVELOPMENT WORKFLOW

### 6.1 Commands (via Makefile)
```bash
make install          # pnpm install
make dev              # Start all services in dev mode
make dev-api          # Start only API
make dev-portal       # Start only Portal
make dev-bridge       # Start only Bridge
make test             # Run all tests (Vitest)
make test-api         # Run API tests only
make test-portal      # Run Portal tests only
make lint             # ESLint across all packages
make fmt              # Prettier format
make typecheck        # tsc --noEmit across all packages
make db-migrate       # dbmate up
make db-rollback      # dbmate rollback
make db-reset         # dbmate drop + up + seed
make docker-up        # Docker Compose up (PG, Redis, Keycloak, Vault, MinIO, OpenAS2)
make docker-down      # Docker Compose down
```

### 6.2 Before Marking Any Task Done
1. `make typecheck` — zero errors
2. `make lint` — zero warnings
3. `make fmt` — all formatted
4. `make test` — all pass (or relevant subset)
5. Verify RLS: test with wrong tenant context → must return empty/forbidden

### 6.3 Feature Flags for Incomplete Features
If a feature depends on another track that isn't done yet:
- **DO NOT WAIT.** Build your feature with a mock/stub and feature-flag it.
- Use the `feature_flags` table pattern:
```typescript
// Check platform-level flag first, then factory preference
const isEnabled = await featureFlag.check('SANDBOX_TEST_HARNESS', factoryId);
if (!isEnabled) throw new FcError('FC_ERR_FEATURE_DISABLED', 'Feature not available');
```
- Feature flag evaluation order: **platform flag → factory preference** (C10 from Architecture Decisions)

### 6.4 Mocking Cross-Track Dependencies
Each track can be developed independently. Use these patterns when the dependency isn't built yet:

| Your Track | Depends On | Mock Strategy |
|-----------|-----------|---------------|
| B (API) | A (DB) | Use test DB with seed data. Migration files are Track A deliverables — build them first or use a schema snapshot. |
| C (Mapping/EDI) | B (API) | Mock API responses with Supertest or in-memory handlers |
| D (Bridge) | B (API) | Mock WebSocket server. Bridge tests should work fully offline. |
| E (Portal) | B (API) | MSW (Mock Service Worker) for all API calls. Portal must render/function with mock data. |
| Any track | Keycloak | Use a test JWT generator utility in `packages/shared/test-utils/` |
| Any track | Vault | Use env vars in dev/test. Vault integration is real only in staging/prod. |
| Any track | Redis/BullMQ | Use real Redis in Docker for integration tests. Unit tests mock the queue. |

---

## 7. TRACK ASSIGNMENTS

Development Plan has 5 parallel tracks. Each can be worked independently:

| Track | Scope | Key Outputs |
|-------|-------|-------------|
| **A: Foundation** (~30h) | DB schema, migrations, RLS policies, seed data, Makefile, Docker Compose, monorepo scaffold | All other tracks depend on Track A's schema |
| **B: API + Workflow** (~96h) | REST endpoints, middleware stack, outbox poller, saga coordinator, notifications, webhooks, validation, analytics | Core backend — all CRUD + workflow |
| **C: Mapping + AI + EDI** (~149h) | LLM registry, mapping engine, AI mapper, transform rules, EDI spec engine, AS2 sidecar, sandbox test harness, connector catalog | The "middleware brain" |
| **D: Bridge Agent** (~91h) | Tally XML client, adaptive polling, local SQLite queue, WebSocket tunnel, health probes, rules engine, auto-fix, OTP bootstrap, auto-upgrade | Standalone agent for factory Windows PC |
| **E: Portal UI** (~258h) | Full React dashboard — every feature has a UI counterpart | Depends on API contracts from Track B |

**Dependency rule:** Track A should be done first (or at least the schema + migrations). Tracks B/C/D/E can then run in parallel using mocks for anything not yet available.

---

## 8. KEY PATTERNS TO IMPLEMENT

Reference the Architecture Decisions History doc for code samples. Summary:

| Pattern | Implementation Note |
|---------|-------------------|
| **Transactional Outbox** | 4 writes in 1 transaction (domain + outbox + saga + audit). See C1. |
| **Saga Coordinator** | 15 states. Separate `order_sagas` table. Deadlines from connection SLA config. See G1, C12. |
| **Circuit Breaker** | Opossum per-connection. See C2 for exact params. |
| **PII Redaction** | Pino transport with 6 regex patterns. See C3. |
| **Audit Log** | Hash-chain SHA-256. See C13 for verification query. |
| **Record History** | Trigger on ALL tenant tables. See C16 for trigger SQL. |
| **Idempotency** | X-Idempotency-Key header → Redis check → DB check → process. |
| **Claim Check** | Payloads >256KB → MinIO. See C5. |
| **FLE** | Vault Transit for GSTIN, PAN, bank accounts, IFSC, Aadhaar. See C6. |
| **Error-Code-Only LLM** | ONLY send error code + language to LLM. NEVER factory data. See C4. |

---

## 9. SECURITY — NON-NEGOTIABLE

1. **RLS on every tenant table** — no exceptions
2. **PII redaction on every log line** — Pino interceptor, no raw PII ever logged
3. **FLE for sensitive columns** — GSTIN, PAN, bank account, IFSC, Aadhaar
4. **Parameterized queries only** — no string concatenation in SQL
5. **Zod validation on all inputs** — request body, query params, path params
6. **JWT verification middleware** — every protected route
7. **Tenant context middleware** — sets `app.current_tenant` before any DB access
8. **HMAC verification** — timing-safe comparison (`crypto.timingSafeEqual`) for webhooks
9. **Correlation ID** — `X-Correlation-ID` header on all API responses
10. **Zero secrets in code** — use Vault (prod) or `.env` (dev only, gitignored)

---

## 10. GIT WORKFLOW

- **Branch:** `Phase1` is the main development branch
- **Don't commit unless asked.** Don't push unless asked.
- **Don't amend commits** — create new ones.
- **Commit messages:** Concise, "why" not "what". Format: `track-X: description`
  - Example: `track-a: add RLS policies for all tenant tables`
  - Example: `track-b: implement saga coordinator with 15-state lifecycle`
- **Never commit:** `.env`, credentials, PATs, secrets, `node_modules/`, `dist/`

---

## 11. DOCKER SERVICES (Dev Environment)

```bash
# Start infrastructure services
docker compose up -d postgres redis keycloak vault minio openas2

# Services and ports:
# PostgreSQL:  5432
# Redis:       6379
# Keycloak:    8080
# Vault:       8200
# MinIO:       9000 (API), 9001 (Console)
# OpenAS2:     4080 (HTTP), 4081 (HTTPS)
```

Do NOT modify `docker-compose.yml` without asking.

---

## 12. TESTING REQUIREMENTS

### Unit Tests (Vitest)
- Co-located with source files
- Test each function in isolation
- Mock external dependencies (DB, Redis, Vault, LLM APIs)
- Target: every public function has at least 1 happy path + 1 error path test

### Integration Tests (Supertest)
- Test full API request → response cycle
- Use test database with RLS verification
- Verify: correct tenant isolation, proper error codes, idempotency

### RLS Verification Tests
- Every tenant-scoped table MUST have a test proving cross-tenant access fails
- Pattern: insert as tenant A, query as tenant B → must return zero rows

### What to Test Before Marking Done
| Component | Must Test |
|-----------|----------|
| API endpoint | Happy path, validation error, auth error, tenant isolation |
| DB migration | Up works, down works, RLS policy works |
| Worker | Processes job, handles failure, retries with backoff |
| Saga transition | Valid transitions work, invalid transitions throw |
| UI component | Renders, handles loading/error states, fires correct API calls |

---

## 13. COMMON PITFALLS — AVOID THESE

1. **Forgetting SET LOCAL tenant** — every DB query in a request must have tenant context set
2. **Using `any` type** — use `unknown` + type narrowing instead
3. **Logging PII** — always go through Pino with the redaction interceptor
4. **Hardcoding config** — everything goes in `app_config` table or env vars
5. **Skipping migration down** — every `up` needs a `down`
6. **Tests in separate directory** — tests go NEXT TO the source file
7. **Installing packages without asking** — ask first, explain why
8. **String concatenation in SQL** — always use parameterized queries ($1, $2, ...)
9. **Importing from another app directly** — use `packages/shared/` for cross-app code
10. **Forgetting feature flag check** — incomplete features MUST be behind a flag

---

## 14. WHEN YOU'RE BLOCKED

- **Missing schema/migration?** Check if Track A has it. If not, create the migration yourself and note it needs reconciliation.
- **Need API contract that doesn't exist yet?** Define the Zod schema in `packages/shared/`, build against it with mocks, and document the contract.
- **Unclear requirement?** Check the 4 docs in `docs/`. If still unclear, ask — don't guess.
- **Need a new dependency?** Ask before installing. Explain what it does and why alternatives won't work.
- **Tests failing for unrelated code?** Fix your tests, skip others with `.todo` and note why.

---

## 15. QUICK REFERENCE — FC ERROR CODES

Format: `FC_ERR_{DOMAIN}_{SPECIFIC}`

Domains: `AUTH`, `TENANT`, `ORDER`, `SAGA`, `EDI`, `AS2`, `MAPPING`, `BRIDGE`, `SYNC`, `WEBHOOK`, `NOTIFICATION`, `LLM`, `SANDBOX`, `CATALOG`, `VALIDATION`, `CONFIG`, `FEATURE`

Examples:
- `FC_ERR_AUTH_TOKEN_EXPIRED` — JWT expired
- `FC_ERR_TENANT_NOT_SET` — Missing tenant context
- `FC_ERR_SAGA_INVALID_TRANSITION` — Invalid saga state transition
- `FC_ERR_EDI_ENVELOPE_FAIL` — EDI envelope generation failed
- `FC_ERR_MAPPING_FIELD_NOT_FOUND` — Source field missing in mapping
- `FC_ERR_LLM_ALL_PROVIDERS_DOWN` — All LLM fallback layers exhausted
- `FC_ERR_FEATURE_DISABLED` — Feature flag is OFF

---

*These instructions are the operating contract for any agent session working on FactoryConnect. The 4 docs in `docs/` are the specification. This file is the "how to build it" guide. Together they provide everything needed to develop any track independently.*
