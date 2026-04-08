# FactoryConnect Comprehensive Test Suite

## Overview

This document describes the comprehensive E2E and integration test suite created for FactoryConnect platform. Tests are designed to validate the entire system architecture following the specifications in `docs/FC_Architecture_Blueprint.md`, `docs/FC_SalesOrder_Connector_Design.md`, and related architecture decision documents.

## Test Files Created

### 1. E2E Tests - API Gateway (Track B)

#### `apps/api/src/tests/e2e/order-lifecycle.test.ts`
**Purpose:** Full order lifecycle from creation through completion with saga progression and audit trail verification.

**Tests Covered:**
- Create order and verify saga initiated in `PO_RECEIVED` state
- Confirm order → saga advances to `PO_CONFIRMED`
- Create shipment → saga advances through ASN states
- Create invoice → saga advances through INVOICE states
- Complete saga → `COMPLETED` state
- Verify audit trail with hash-chain at each step
- Concurrent order creation with idempotency keys
- Order validation (invalid data rejection)

**Key Assertions:**
- Saga state progression follows 15-state machine
- Audit log entries maintain cryptographic hash-chain (C13)
- Each action creates immutable audit record with `previous_hash` reference
- Idempotency prevents duplicate order creation (same PO number)

**Dependencies:**
- Database: `canonical_orders`, `order_sagas`, `audit_log` tables
- Middleware: Auth, tenant context, idempotency, validation
- Services: Order creation, confirmation, saga coordination

---

#### `apps/api/src/tests/e2e/webhook-delivery.test.ts`
**Purpose:** Webhook lifecycle - registration, delivery, HMAC verification, retry logic.

**Tests Covered:**
- Register webhook subscription with URL validation
- Deliver webhook when order is confirmed
- Verify HMAC-SHA256 signature in webhook headers (C3 security pattern)
- List webhook subscriptions with filtering by event type
- Delete webhook subscription
- Tenant isolation (webhooks not visible across tenants)
- Webhook retry on delivery failure

**Key Assertions:**
- HMAC signature matches payload and secret (timing-safe comparison)
- Webhook subscriptions are tenant-scoped via RLS
- Delivery records track status and retry count
- Event filtering works correctly

**Dependencies:**
- Database: `webhook_subscriptions`, `webhook_deliveries` tables
- Services: Webhook service, event publishing
- Patterns: Transactional outbox for event durability

---

#### `apps/api/src/tests/e2e/resync-flow.test.ts`
**Purpose:** Resync request lifecycle - request → validate → approve → queue → in-progress → complete.

**Tests Covered:**
- Create resync request in `REQUESTED` state
- Validate resync (move to `VALIDATED`)
- Approve resync (move to `APPROVED`)
- Queue resync for processing
- Start and complete resync processing
- Reject resync with reason
- Handle partial failure during resync
- List and filter resync requests by status

**Key Assertions:**
- State transitions follow valid sequence (no skipping)
- Each transition creates audit log entry
- Partial failures logged with details
- Filtering by status returns correct subset

**Dependencies:**
- Database: `resync_requests`, `resync_items` tables
- Services: Resync service, validation engine
- Patterns: Saga coordinator for long-running operation

---

### 2. Integration Tests - Middleware & Security (Track B)

#### `apps/api/src/tests/integration/middleware.test.ts`
**Purpose:** Validate complete middleware stack - auth, tenant context, rate limiting, validation, idempotency, feature gates.

**Tests Covered:**

**Auth Middleware:**
- Accept valid JWT in Authorization header
- Reject missing authorization header
- Reject invalid/expired JWT tokens

**Tenant Context Middleware:**
- Extract and validate tenant_id from X-Tenant-ID header
- Extract and validate user_id from X-User-ID header
- Reject requests missing required context headers

**Correlation ID Middleware:**
- Accept X-Correlation-ID header
- Generate unique correlation ID if not provided
- Propagate correlation ID in response headers

**Rate Limiter Middleware:**
- Allow requests within rate limit (token bucket)
- Return 429 when limit exceeded
- Include rate limit headers in response (ratelimit-limit, ratelimit-remaining)

**Validation Middleware:**
- Reject malformed JSON request body
- Validate request body against Zod schemas
- Validate URL path parameters (UUID format)
- Validate query parameters with type coercion
- Return structured error with error code

**Idempotency Middleware:**
- Accept requests with X-Idempotency-Key header
- Return 200 (cached response) for duplicate idempotency key
- Allow POST without idempotency key (backward compatibility)

**Feature Gate Middleware:**
- Block requests to disabled features
- Return 403 Forbidden for disabled features

**Error Handler Middleware:**
- Return standardized error format with code and message
- Include correlation ID in error responses
- Not expose sensitive information (SQL, database names)
- Return 404 for non-existent endpoints

**Key Assertions:**
- Each middleware properly validates inputs
- Error messages are user-friendly and don't leak internals
- Correlation ID flows through entire request/response cycle
- Rate limiting uses tenant + user combination for isolation

**Dependencies:**
- Express middleware stack
- Zod validation schemas
- JWT verification library
- Token bucket rate limiter
- Redis for distributed rate limiting

---

#### `apps/api/src/tests/integration/rls.test.ts`
**Purpose:** Verify Row-Level Security (RLS) policies block cross-tenant access at database level.

**Tests Covered:**

**Factory RLS:**
- Allow tenant1 to see only its own factory
- Deny tenant1 access to tenant2 factory
- Query with wrong tenant context returns 0 rows

**Buyer RLS:**
- Allow tenant1 to list only its own buyers
- Deny tenant1 visibility of tenant2 buyers
- Prevent information leakage across tenants

**Order RLS:**
- Tenant1 cannot see tenant2's orders by ID
- Tenant1 cannot see tenant2's orders by query
- Order count is per-tenant (no cross-tenant leakage)

**Shipment RLS:**
- Shipments inherit factory_id RLS policy
- Cross-tenant shipment access blocked

**Invoice RLS:**
- Invoices inherit factory_id RLS policy
- Cross-tenant invoice access blocked

**Audit Log RLS:**
- Audit entries are tenant-scoped
- Cannot query other tenant's audit logs

**Admin Impersonation Scenario:**
- Even with modified context, RLS at DB level blocks access
- Regular users cannot bypass RLS

**Key Assertions:**
- Every query with wrong tenant returns empty result set
- RLS policy enforced at database level (SET LOCAL tenant context)
- No information leakage through error messages or timing
- Each table has RLS policy: `(factory_id = app.current_tenant)`

**Dependencies:**
- PostgreSQL RLS policies on all tenant tables (C1, C16 patterns)
- Tenant context: `app.current_tenant` set before every query
- Transaction isolation: `SET LOCAL` within transaction
- Database: All tables in foundation schema

**SQL Pattern Used:**
```sql
ALTER TABLE canonical_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant ON canonical_orders
  FOR ALL
  USING (factory_id = (SELECT current_setting('app.current_tenant')::uuid))
  WITH CHECK (factory_id = (SELECT current_setting('app.current_tenant')::uuid));
```

---

### 3. E2E Tests - Mapping Engine (Track C)

#### `packages/shared/src/tests/mapping-e2e.test.ts`
**Purpose:** Full mapping pipeline - source data → mapping config → transformed canonical output.

**Tests Covered:**

**Tally → Canonical Order:**
- Parse Tally PO XML structure to canonical order
- Map nested fields (BASICFACTDETAILS.VOUCHERNUMBER)
- Extract line items array with transformation
- Validate required fields (throw on missing)

**Zoho → Canonical Order:**
- Map Zoho Books PO structure to canonical order
- Handle different field naming conventions
- Preserve dates with format conversion (YYYY-MM-DD)

**Transform Chains:**
- Apply multiple transforms to single field
  - Uppercase + trim
  - Date parsing + normalize to ISO
- Concatenate multiple source fields
  - Join city, state, zip with separator

**Error Handling:**
- Handle invalid date formats gracefully
- Skip missing optional fields
- Continue mapping on non-required field error
- Validate line item array structure

**Performance & Scale:**
- Process 1000+ line items within 5 seconds
- Linear performance degradation with item count

**Key Assertions:**
- All canonical fields properly mapped
- Line items extracted and transformed
- Date formats converted correctly
- Transform chains execute in order
- Schema validation passes for output

**Mapping Config Pattern:**
```typescript
{
  source_type: 'tally',
  target_type: 'canonical_order',
  root_path: 'TALLYMESSAGE.COMPANY.PURCHASEORDER',
  fields: [
    {
      target_field: 'buyer_po_number',
      source_path: 'BASICFACTDETAILS.VOUCHERNUMBER',
      transform: 'string',
      required: true
    }
  ],
  line_items: {
    source_path: 'LISTITEM.LINEITEM',
    fields: [...]
  }
}
```

**Dependencies:**
- MappingEngine class in `packages/shared/src/mapping/`
- Zod schemas for validation
- Date formatting library
- Transform rule executor

---

### 4. E2E Tests - EDI Processing (Track C)

#### `packages/shared/src/tests/edi-e2e.test.ts`
**Purpose:** EDI round-trip - canonical order → EDI 855/856/810 → parse back to canonical.

**Tests Covered:**

**X12 EDI Format:**
- Generate X12 850 (Purchase Order) from canonical order
- Generate X12 855 (Purchase Order Acknowledgment)
- Generate X12 856 (Advance Ship Notice) from shipment
- Generate X12 810 (Invoice) from invoice
- Parse X12 messages back to canonical structures
- Validate control numbers (ISA, GS, ST)
- Verify message structure (segments and hierarchy)

**cXML Format:**
- Generate cXML OrderRequest from canonical order
- Generate cXML ShipNotice from shipment
- Parse cXML back to canonical structures
- Validate XML namespaces and payload attributes
- Verify proper XML escaping of special characters

**JSON REST Adapter:**
- Generate JSON REST format for orders
- Generate JSON REST format for shipments
- Parse JSON back to canonical structures
- Verify nested address structures
- Support for multiple data types

**Format Validation:**
- All mandatory EDI segments present
- Control numbers unique or sequential
- XML well-formed and schema-valid
- JSON valid and deserializable
- Special characters properly escaped

**Performance:**
- Generate EDI message in < 100ms
- Parse EDI message in < 100ms
- Handle large amounts with precision

**Error Handling:**
- Missing optional line item fields accepted
- Special characters (apostrophe, ampersand) escaped
- Large amounts preserved accurately (999999.99)

**Key Assertions:**
- Round-trip data integrity (canonical → EDI → canonical)
- All required fields present in output
- Format-specific validation rules followed
- Performance within acceptable bounds

**EDI Segment Examples:**
```
ISA*00*          *00*          *ZZ*SENDID         *ZZ*RECID           *YYMMDD*HHMM*U*00401*000000123*0*P*:
GS*PO*APP*SENDCO*RECCO*YYMMDD*HHMM*123*X*004010
ST*850*0001
BEG*00*SA*PO-2024-001**YYMMDD
N1*BY*GlobalBuyer Inc
IT1*1*100*EA**50*SKU-001
CTT*2
SE*12*0001
```

**Dependencies:**
- X12Generator and X12Parser in `packages/shared/src/edi/`
- cXML adapter for cXML messages
- JSON REST adapter for REST APIs
- Zod schemas for validation
- Date/time formatting

---

### 5. E2E Tests - Bridge Agent (Track D)

#### `apps/bridge/src/tests/bridge-e2e.test.ts`
**Purpose:** Bridge agent lifecycle - polling → local queue → cloud sync with health monitoring.

**Tests Covered:**

**Data Extraction and Queueing:**
- Extract POs from ERP at scheduled intervals
- Extract ASN and invoices from ERP
- Queue multiple data types locally (PO, shipment, invoice)
- Maintain extraction timestamps

**Local Queue Operations (SQLite):**
- Enqueue and dequeue FIFO
- Handle retry logic with increment counter
- Persist queue state across disconnections
- Handle queue overflow (1000+ items)
- Mark items as processed

**Cloud Sync (WebSocket Tunnel):**
- Establish and maintain WebSocket connection
- Graceful disconnect handling
- Send queued items to cloud when connected
- Retry on connection failure
- Buffer items during offline period
- Drain queue when reconnected
- Track sent messages

**Health Probes and Monitoring:**
- Monitor ERP adapter health (latency, availability)
- Monitor cloud connectivity (connected state, latency)
- Monitor local queue status
- Detect service degradation (increasing latency)
- Report health metrics to cloud endpoint
- Alert on service failures

**Adaptive Polling:**
- Start with default interval (5 seconds)
- Increase interval on repeated failures (back-off)
- Decrease interval on success (exponential recovery)
- Respect min interval (5 seconds) and max interval (5 minutes)
- Reset interval on reconnection

**Full Lifecycle Integration:**
- Extract data → queue locally → check health → connect cloud → drain queue
- Handle network interruption mid-sync
- Resume after reconnection
- Complete sync cycle end-to-end

**Offline Mode:**
- Queue data while disconnected
- Persist to local SQLite
- Maintain queue state
- Drain queue when connection restored

**Key Assertions:**
- Queue maintains FIFO order
- Retry counter increments on failures
- Health probes track latency correctly
- Polling intervals adjust based on success/failure
- Offline queue persists and drains correctly
- No data loss during network interruption

**Architecture Patterns Verified:**
- Local SQLite queue (offline-first design)
- WebSocket tunnel for bidirectional sync
- Health probe pattern (every service monitored)
- Adaptive backoff (exponential + cap)
- Transactional integrity (item processing atomicity)

**Dependencies:**
- ERP adapters (TallyAdapter, ZohoAdapter)
- Local SQLite queue
- WebSocket client
- Health reporter service
- Adaptive polling algorithm

---

## Test Execution

### Running Tests

```bash
# Run all tests
make test

# Run specific test suite
make test-api          # API tests only
make test-api-e2e      # E2E tests only
make test-api-integration # Integration tests only

# Run mapping tests
make test-shared

# Run bridge tests
make test-bridge

# With coverage
make test-coverage
```

### Test Database Setup

Tests use Docker PostgreSQL with seed data:

```bash
make docker-up         # Start postgres, redis, other services
make db-migrate        # Run migrations
make seed              # Seed test data
```

Tests clean up after themselves (transaction rollback).

---

## Coverage Summary

| Component | Coverage | Tests |
|-----------|----------|-------|
| Order Lifecycle | E2E | 7 tests |
| Webhooks | E2E | 7 tests |
| Resync Flow | E2E | 8 tests |
| Middleware | Integration | 25+ tests |
| RLS Security | Integration | 12+ tests |
| Mapping Engine | E2E | 10+ tests |
| EDI Processing | E2E | 15+ tests |
| Bridge Agent | E2E | 18+ tests |
| **TOTAL** | | **100+ tests** |

---

## Key Testing Patterns

### 1. Test Context Creation
Each test builds a `RequestContext` with unique IDs to simulate different users/tenants:

```typescript
const ctx: RequestContext = {
  tenantId: uuidv4(),
  userId: uuidv4(),
  correlationId: `test-${uuidv4()}`,
  role: 'factory_admin',
};
```

### 2. Database Transaction Helpers
Tests use `withTenantTransaction` and `withTenantClient` for RLS verification:

```typescript
const result = await withTenantTransaction(ctx, async (client) => {
  // Tenant context automatically set via SET LOCAL
  const res = await client.query('INSERT INTO ...');
  return res.rows[0];
});
```

### 3. Cleanup Pattern
Each test suite cleans up in `afterEach` to prevent data leakage:

```typescript
afterEach(async () => {
  // Delete test data for this tenant only
  await client.query('DELETE FROM orders WHERE factory_id = $1', [ctx.tenantId]);
});
```

### 4. Mock/Stub Implementation
Bridge tests use fully mocked implementations (no real Tally/WebSocket):

```typescript
class MockErpAdapter {
  async extractPurchaseOrders() { /* return stub data */ }
}
```

### 5. Audit Trail Verification
Order lifecycle tests verify hash-chain integrity:

```typescript
const auditLog = await getAuditLog(ctx, orderId);
for (let i = 1; i < auditLog.length; i++) {
  expect(auditLog[i].previous_hash).toBe(auditLog[i - 1].hash);
}
```

---

## Security & Compliance Verified

✅ **RLS Enforcement:** Cross-tenant access blocked at DB level
✅ **Idempotency:** Duplicate requests return same response
✅ **HMAC Signatures:** Webhook payloads cryptographically verified
✅ **Audit Trail:** All actions logged with hash-chain
✅ **Error Handling:** No PII in error messages
✅ **Rate Limiting:** Per-tenant token bucket
✅ **Correlation Tracking:** All requests traceable

---

## Notes for Development

1. **Test Database:** Uses test PostgreSQL instance. Ensure `docker-compose` services running.

2. **Async Cleanup:** All cleanup happens in `afterEach`. Do not rely on test order.

3. **Mock Servers:** Webhook and cloud sync tests use local mocks (no external HTTP calls).

4. **Performance Assertions:** Some tests check timing (< 100ms for EDI generation). May need adjustment for slow systems.

5. **Feature Flags:** Bridge and mapping tests assume feature flags are enabled by default.

6. **Keycloak:** Auth tests mock JWT verification. Real JWT generation can use test utilities in `packages/shared/src/test-utils/`.

---

## Future Enhancements

- [ ] Load testing for order processing at scale (1000+ POs/sec)
- [ ] Chaos engineering tests (network failures, database unavailability)
- [ ] Performance benchmarking for EDI round-trip
- [ ] Integration with real ERP systems (Tally XML, Zoho API)
- [ ] End-to-end tests for Ariba/Coupa integrations
- [ ] Mutation testing to verify test quality
- [ ] Contract testing for API contracts

---

## Architecture Reference

Tests validate these key patterns from documentation:

| Pattern | Location | Test File |
|---------|----------|-----------|
| Transactional Outbox | C1 | `order-lifecycle.test.ts` |
| Saga Coordinator | G1 | `order-lifecycle.test.ts`, `resync-flow.test.ts` |
| Circuit Breaker | C2 | (API integration tests) |
| PII Redaction | C3 | (Middleware tests) |
| HMAC Verification | C9 | `webhook-delivery.test.ts` |
| Audit Log Hash-Chain | C13 | `order-lifecycle.test.ts` |
| RLS Policies | C15 | `rls.test.ts` |
| Record History Trigger | C16 | (Database-level) |
| Claim Check Pattern | C5 | (Not directly tested, integration) |
| FLE (Field-Level Encryption) | C6 | (Database-level) |

---

**Created:** April 4, 2026
**Test Framework:** Vitest + Supertest
**Database:** PostgreSQL 16 with RLS
**Coverage:** 100+ comprehensive tests across all major platform components
