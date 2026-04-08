# FactoryConnect Testing - Quick Start Guide

## Files Created

### E2E Tests (End-to-End)

1. **Order Lifecycle E2E** (`apps/api/src/tests/e2e/order-lifecycle.test.ts`)
   - Tests complete order flow from creation → confirmation → shipment → invoice → completion
   - Validates 15-state saga progression
   - Verifies audit trail with cryptographic hash-chain
   - 7 comprehensive tests

2. **Webhook Delivery E2E** (`apps/api/src/tests/e2e/webhook-delivery.test.ts`)
   - Tests webhook registration, delivery, HMAC verification
   - Tests webhook retry on failure
   - Tests deletion and event filtering
   - 7 comprehensive tests

3. **Resync Flow E2E** (`apps/api/src/tests/e2e/resync-flow.test.ts`)
   - Tests complete resync lifecycle: REQUESTED → VALIDATED → APPROVED → QUEUED → IN_PROGRESS → COMPLETED
   - Tests rejection and partial failure flows
   - Tests filtering by status
   - 8 comprehensive tests

4. **Mapping Pipeline E2E** (`packages/shared/src/tests/mapping-e2e.test.ts`)
   - Tests Tally XML → canonical order mapping
   - Tests Zoho API → canonical order mapping
   - Tests transform chains and field concatenation
   - Tests error handling and large-scale processing (1000+ items)
   - 10+ comprehensive tests

5. **EDI Round-Trip E2E** (`packages/shared/src/tests/edi-e2e.test.ts`)
   - Tests X12 850/855/856/810 message generation and parsing
   - Tests cXML OrderRequest/ShipNotice generation and parsing
   - Tests JSON REST adapter for orders/shipments
   - Tests control number validation and special character handling
   - 15+ comprehensive tests

6. **Bridge Agent E2E** (`apps/bridge/src/tests/bridge-e2e.test.ts`)
   - Tests ERP data extraction and local queueing
   - Tests WebSocket cloud sync
   - Tests health probes and monitoring
   - Tests adaptive polling with backoff
   - Tests offline resilience and recovery
   - 18+ comprehensive tests

### Integration Tests

7. **Middleware Stack Integration** (`apps/api/src/tests/integration/middleware.test.ts`)
   - Auth middleware (JWT validation)
   - Tenant context extraction (X-Tenant-ID, X-User-ID)
   - Correlation ID propagation
   - Rate limiting (token bucket)
   - Request validation (Zod schemas)
   - Idempotency (X-Idempotency-Key)
   - Feature gates
   - Error handler
   - 25+ comprehensive tests

8. **RLS (Row-Level Security) Integration** (`apps/api/src/tests/integration/rls.test.ts`)
   - Factory RLS (cross-tenant isolation)
   - Buyer RLS (cross-tenant isolation)
   - Order RLS (cross-tenant isolation)
   - Shipment RLS (cross-tenant isolation)
   - Invoice RLS (cross-tenant isolation)
   - Audit log RLS (cross-tenant isolation)
   - Admin impersonation scenario (verified blocked)
   - 12+ comprehensive tests

## Running Tests

### Prerequisites

```bash
# Start Docker services
make docker-up

# Install dependencies
make install

# Run migrations
make db-migrate

# (Optional) Seed test data
make seed
```

### Run All Tests
```bash
make test
```

### Run Specific Test Suites

```bash
# API tests only
make test-api

# Order lifecycle E2E
npx vitest apps/api/src/tests/e2e/order-lifecycle.test.ts

# Middleware integration
npx vitest apps/api/src/tests/integration/middleware.test.ts

# RLS verification
npx vitest apps/api/src/tests/integration/rls.test.ts

# Mapping pipeline
npx vitest packages/shared/src/tests/mapping-e2e.test.ts

# EDI round-trip
npx vitest packages/shared/src/tests/edi-e2e.test.ts

# Bridge agent
npx vitest apps/bridge/src/tests/bridge-e2e.test.ts
```

### Run with Coverage

```bash
make test-coverage
# Opens coverage.html in browser
```

### Watch Mode (Development)

```bash
npx vitest --watch
```

## Test Structure

Each test file follows this pattern:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { withTenantTransaction, withTenantClient } from '@fc/database';

describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup: Create test data
  });

  afterEach(async () => {
    // Cleanup: Delete test data
  });

  describe('Specific Scenario', () => {
    it('should do something', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Key Testing Patterns

### 1. Create Test Context
```typescript
const ctx: RequestContext = {
  tenantId: uuidv4(),
  userId: uuidv4(),
  correlationId: `test-${uuidv4()}`,
  role: 'factory_admin',
};
```

### 2. Make API Request
```typescript
const res = await request(app)
  .post('/api/v1/orders')
  .set('Authorization', 'Bearer test-token')
  .set('X-Tenant-ID', ctx.tenantId)
  .set('X-User-ID', ctx.userId)
  .send(orderPayload);

expect(res.status).toBe(201);
expect(res.body.data.id).toBeDefined();
```

### 3. Query Database with RLS
```typescript
const orders = await withTenantClient(ctx, async (client) => {
  const res = await client.query(
    'SELECT * FROM canonical_orders WHERE id = $1',
    [orderId]
  );
  return res.rows;
});
```

### 4. Verify Audit Trail
```typescript
const auditLog = await getAuditLog(ctx, orderId);
expect(auditLog[0].action).toBe('CREATE');
expect(auditLog[1].previous_hash).toBe(auditLog[0].hash);
```

## Architecture Patterns Tested

- ✅ **15-State Saga Machine** (order lifecycle)
- ✅ **Transactional Outbox** (event durability)
- ✅ **Row-Level Security (RLS)** (tenant isolation)
- ✅ **HMAC Verification** (webhook security)
- ✅ **Audit Trail Hash-Chain** (immutable audit log)
- ✅ **Idempotency** (duplicate request handling)
- ✅ **Circuit Breaker** (ERP adapter resilience)
- ✅ **Adaptive Backoff** (bridge polling)
- ✅ **Claim Check Pattern** (large payload handling)
- ✅ **FLE (Field-Level Encryption)** (sensitive data)
- ✅ **Feature Flags** (gradual rollout)

## Common Issues & Troubleshooting

### Test Database Connection Fails
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check database exists
docker exec postgres psql -U postgres -l | grep skydesk

# Recreate database
make db-reset
```

### Tests Timeout
```bash
# Increase timeout in vitest.config.ts
export VITEST_TIMEOUT=30000

# Or run specific test with timeout
npx vitest --testTimeout 30000
```

### Foreign Key Constraint Errors
```bash
# Run migrations
make db-migrate

# Verify schema
docker exec postgres psql -U postgres -d skydesk -c '\dt'
```

### RLS Tests Fail
```bash
# Verify RLS policies are created
docker exec postgres psql -U postgres -d skydesk -c '\d canonical_orders'

# Check policy
docker exec postgres psql -U postgres -d skydesk -c '\dp canonical_orders'
```

## Performance Expectations

| Test | Expected Duration |
|------|-------------------|
| Order Lifecycle E2E | < 2 seconds |
| Webhook Delivery E2E | < 1 second |
| Resync Flow E2E | < 3 seconds |
| Middleware Integration | < 1 second |
| RLS Verification | < 2 seconds |
| Mapping Pipeline E2E | < 1 second |
| EDI Round-Trip E2E | < 1 second |
| Bridge Agent E2E | < 2 seconds |
| **Total Suite** | **< 15 seconds** |

If tests run slower, check:
- Database query performance
- Network latency
- Docker container resource limits

## Adding New Tests

1. Create test file in appropriate directory:
   - E2E tests: `apps/api/src/tests/e2e/` or `apps/bridge/src/tests/`
   - Integration tests: `apps/api/src/tests/integration/`
   - Shared tests: `packages/shared/src/tests/`

2. Follow naming convention: `{feature}.test.ts`

3. Use standard imports:
   ```typescript
   import { describe, it, expect, beforeEach, afterEach } from 'vitest';
   import request from 'supertest'; // for API tests
   import { withTenantTransaction, withTenantClient } from '@fc/database';
   ```

4. Create test context for each test:
   ```typescript
   const ctx = buildTestContext(); // or define locally
   ```

5. Clean up in `afterEach`:
   ```typescript
   afterEach(async () => {
     // Delete test data
   });
   ```

## Documentation Reference

For detailed information about patterns being tested, see:

- **Architecture:** `docs/FC_Architecture_Blueprint.md`
- **Design Decisions:** `docs/FC_Architecture_Decisions_History.md`
- **Development Plan:** `docs/FC_Development_Plan.md`

## Test Summary

**Total Test Files:** 8
**Total Tests:** 100+
**Coverage Areas:**
- Order lifecycle (saga, audit, validation)
- Webhook delivery (HMAC, retry, filtering)
- Resync flow (state transitions)
- Middleware stack (auth, validation, rate limiting)
- RLS security (tenant isolation)
- Mapping engine (source adapters)
- EDI processing (formats)
- Bridge agent (offline-first, health monitoring)

All tests are designed to be:
- ✅ Deterministic (no flakiness)
- ✅ Isolated (no test interdependencies)
- ✅ Fast (< 15 seconds total)
- ✅ Maintainable (clear purpose and assertions)
- ✅ Comprehensive (happy path + error cases + edge cases)

---

**Last Updated:** April 4, 2026
**Test Framework:** Vitest 1.x + Supertest
**Node Version:** 22 LTS
**TypeScript:** 5 strict mode
