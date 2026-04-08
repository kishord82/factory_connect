# CA Platform Integration Tests

Comprehensive integration test suite for the FactoryConnect CA (Chartered Accountant) Platform covering all API endpoints, RLS verification, feature flag gating, and end-to-end workflows.

## Test Files Overview

### 1. `setup.ts`
Test setup utilities and fixtures.

**Exports:**
- `generateCaToken()` — Generate test JWT for CA firm context
- `generateFactoryToken()` — Generate test JWT for factory context (non-CA)
- `seedCaTestData()` — Seed test database with CA firm, staff, clients, filings
- `cleanCaTestData()` — Clean up test data after tests
- `app` — Express app instance for testing
- `request` — Supertest request builder
- `createTestContext()` — Create test context with token, firm ID, user ID
- `getAuthHeader()` — Get Bearer token header

**Usage:**
```typescript
import { createTestContext, getAuthHeader, request } from './setup.js';

const ctx = createTestContext({ subscriptionTier: 'professional' });
const res = await request
  .get('/api/v1/ca/firms/me')
  .set('Authorization', getAuthHeader(ctx.token));
```

---

### 2. `firm-endpoints.test.ts`
Tests for CA firm CRUD and profile endpoints.

**Endpoints Covered:**
- `POST /api/v1/ca/firms` — Create CA firm (25+ test cases)
- `GET /api/v1/ca/firms/me` — Get current firm profile
- `PATCH /api/v1/ca/firms/me` — Update firm settings
- `GET /api/v1/ca/firms/me/subscription` — Get subscription details
- `GET /api/v1/ca/firms/me/dashboard` — Get dashboard summary

**Key Test Categories:**
- Happy path (all required + optional fields)
- Validation (missing fields, invalid formats, etc.)
- Authentication (401 for missing token)
- RLS isolation (firms cannot access other firms)
- Field-specific tests (GSTIN, email, phone validation)
- Duplicate detection (GST number, PAN)

---

### 3. `client-endpoints.test.ts`
Tests for client management and lifecycle.

**Endpoints Covered:**
- `POST /api/v1/ca/clients` — Create client (30+ test cases)
- `GET /api/v1/ca/clients` — List with pagination and filters
- `GET /api/v1/ca/clients/:id` — Get client detail
- `PATCH /api/v1/ca/clients/:id` — Update client
- `GET /api/v1/ca/clients/:id/health` — Health score history
- `POST /api/v1/ca/clients/:id/bridge` — Link bridge agent

**Key Test Categories:**
- CRUD operations (create, read, update)
- Pagination and filtering (tally_status, assigned_staff_id, search)
- Subscription limits (trial=1, starter=10, professional=100)
- RLS isolation (cross-tenant access denied)
- Health score tracking
- Bridge agent linking

---

### 4. `compliance-endpoints.test.ts`
Tests for compliance filing, exceptions, and reconciliation.

**Endpoints Covered:**
- `POST /api/v1/ca/compliance/gst/prepare` — Prepare GSTR-1/3B (20+ test cases)
- `POST /api/v1/ca/compliance/tds/reconcile` — Reconcile TDS
- `GET /api/v1/ca/compliance/filings` — List filings with filters
- `GET /api/v1/ca/compliance/filings/:id` — Get filing detail
- `PATCH /api/v1/ca/compliance/filings/:id` — Update filing status
- `GET /api/v1/ca/compliance/exceptions` — List exceptions
- `PATCH /api/v1/ca/compliance/exceptions/:id` — Resolve/escalate
- `GET /api/v1/ca/compliance/dashboard` — Dashboard summary

**Key Test Categories:**
- GST filing preparation (GSTR1, GSTR3B)
- TDS reconciliation (Q1-Q4)
- Filing status transitions (valid + invalid)
- Exception detection and resolution
- Filter combinations (filing_type, status, client_id, date range)
- Feature gate enforcement (trial blocks GST)
- Dashboard aggregation

---

### 5. `rls-verification.test.ts`
Critical Row-Level Security (RLS) tests ensuring complete tenant isolation.

**Tables Tested:**
- `ca_firms` — Firm isolation
- `ca_clients` — Client isolation
- `compliance_filings` — Filing isolation
- `compliance_exceptions` — Exception isolation
- `document_requests` — Document isolation
- `notices` — Notice isolation
- Cross-tenant integrity checks
- Pagination isolation

**Core Principle:**
Insert data as Firm A → Query as Firm B → Must return 0 rows

**Test Pattern:**
```typescript
// Firm 1 creates data
const createRes = await request
  .post('/api/v1/ca/clients')
  .set('Authorization', getAuthHeader(ctx1.token))
  .send({ business_name: 'Firm 1 Client' });

// Firm 2 tries to access
const getRes = await request
  .get(`/api/v1/ca/clients/${clientId}`)
  .set('Authorization', getAuthHeader(ctx2.token));

expect(getRes.status).toBe(404); // RLS enforced
```

---

### 6. `subscription-endpoints.test.ts`
Tests for subscription tiers, feature availability, and access control.

**Endpoints Covered:**
- `GET /api/v1/ca/subscription/tiers` — List all tiers
- `GET /api/v1/ca/subscription/features` — Features for current tier
- `POST /api/v1/ca/subscription/upgrade` — Request upgrade

**Subscription Tiers:**
- **Trial** — 1 client, F1 only (Bridge)
- **Starter** — 10 clients, F1-F2 (GST)
- **Professional** — 100 clients, F1-F6 (TDS, Bank Recon)
- **Enterprise** — Unlimited, all features

**Feature Gates Tested:**
- F1 (Bridge) — All tiers
- F2 (GST) — Starter+
- F3 (TDS) — Professional+
- F6 (Export) — Professional+
- Client limits per tier
- Dashboard access (all tiers)
- Upgrade flows (trial→starter→professional→enterprise)

**Test Pattern:**
```typescript
// Trial tier cannot access F2 (GST)
const res = await request
  .post('/api/v1/ca/compliance/gst/prepare')
  .set('Authorization', getAuthHeader(trialToken))
  .send({ /* ... */ });

expect(res.status).toBe(403);
expect(res.body.error.code).toBe('FC_ERR_FEATURE_DISABLED');
```

---

### 7. `e2e-workflows.test.ts`
End-to-end workflow tests covering real-world CA platform scenarios.

**Workflows Covered:**

1. **CA Onboarding Flow**
   - Create firm → Add staff → Add client → Link bridge → Prepare GST → Review

2. **Document Collection Flow**
   - Create request → Send (WhatsApp/Email) → Receive → Verify

3. **Compliance Filing Flow**
   - Extract from Tally → Prepare GSTR-1 → Detect exceptions → Resolve → Mark completed

4. **TDS Reconciliation Flow**
   - Extract TDS → Reconcile with TRACES → Identify mismatches → Prepare 26Q

5. **Bank Reconciliation Flow**
   - Upload statement → Auto-match → Manual match → Generate BRS

6. **Notice Response Flow**
   - Create notice → Assign → Escalate → Resolve → Close

7. **Health Score Monitoring Flow**
   - Create client → Monitor → Generate recommendations

8. **Concurrent Multi-Client Workflow**
   - Create 3 clients → File GST for all → Verify aggregation

9. **Error Recovery & Retry Workflow**
   - Attempt invalid operation → Verify error → Retry with valid data

---

## Running Tests

### Run all CA tests
```bash
make test-ca
# or
pnpm test tests/integration/ca
```

### Run specific test file
```bash
pnpm test tests/integration/ca/firm-endpoints.test.ts
pnpm test tests/integration/ca/compliance-endpoints.test.ts
pnpm test tests/integration/ca/rls-verification.test.ts
```

### Run with coverage
```bash
pnpm test:coverage tests/integration/ca
```

### Run in watch mode
```bash
pnpm test --watch tests/integration/ca
```

---

## Test Coverage Summary

| File | Test Cases | Coverage |
|------|-----------|----------|
| firm-endpoints.test.ts | 25+ | Firm CRUD, subscription, dashboard |
| client-endpoints.test.ts | 30+ | Client CRUD, health, bridge linking |
| compliance-endpoints.test.ts | 35+ | GST/TDS filings, exceptions, dashboard |
| rls-verification.test.ts | 15+ | RLS isolation across all tables |
| subscription-endpoints.test.ts | 20+ | Feature gates, tier limits, upgrades |
| e2e-workflows.test.ts | 10+ | Complete real-world workflows |
| **TOTAL** | **135+** | All CA platform endpoints + workflows |

---

## Testing Patterns

### 1. Authentication Testing
```typescript
const ctx = createTestContext();
const res = await request
  .get('/api/v1/ca/firms/me')
  .set('Authorization', getAuthHeader(ctx.token));
```

### 2. Feature Gate Testing
```typescript
const trialCtx = createTestContext({ subscriptionTier: 'trial' });
const res = await request
  .post('/api/v1/ca/compliance/gst/prepare')
  .set('Authorization', getAuthHeader(trialCtx.token))
  .send({ /* ... */ });

expect(res.status).toBe(403); // Feature disabled
```

### 3. RLS Testing
```typescript
// Firm A creates data
const createRes = await request.post('/api/v1/ca/clients')
  .set('Authorization', getAuthHeader(ctx1.token))
  .send({ business_name: 'Firm A Client' });

// Firm B tries to access
const getRes = await request.get(`/api/v1/ca/clients/${id}`)
  .set('Authorization', getAuthHeader(ctx2.token));

expect(getRes.status).toBe(404); // Not accessible
```

### 4. Pagination Testing
```typescript
const res = await request
  .get('/api/v1/ca/clients?limit=10&page=2')
  .set('Authorization', getAuthHeader(ctx.token));

expect(res.body.pagination.page).toBe(2);
expect(res.body.pagination.limit).toBe(10);
```

### 5. Filter Testing
```typescript
const res = await request
  .get('/api/v1/ca/compliance/filings?filing_type=GSTR1&status=completed')
  .set('Authorization', getAuthHeader(ctx.token));

expect(res.body.data.every(f => f.filing_type === 'GSTR1')).toBe(true);
```

---

## Error Response Format

All errors follow this format:
```json
{
  "error": {
    "code": "FC_ERR_COMPLIANCE_INVALID_TRANSITION",
    "message": "Cannot transition from completed to pending",
    "details": {
      "from_status": "completed",
      "to_status": "pending"
    }
  }
}
```

Common error codes:
- `FC_ERR_AUTH_TOKEN_MISSING` — 401, Missing Bearer token
- `FC_ERR_VALIDATION_FAILED` — 400, Zod validation error
- `FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND` — 404, Client not found
- `FC_ERR_COMPLIANCE_FILING_NOT_FOUND` — 404, Filing not found
- `FC_ERR_COMPLIANCE_LIMIT_EXCEEDED` — 403, Subscription limit exceeded
- `FC_ERR_FEATURE_DISABLED` — 403, Feature not available in tier
- `FC_ERR_COMPLIANCE_INVALID_TRANSITION` — 400, Invalid status transition

---

## Key Testing Principles

1. **Isolation** — Each test is independent, uses fresh test context
2. **RLS Verification** — Every multi-tenant table tested for cross-tenant leaks
3. **Feature Gates** — Feature flags enforced at API level
4. **Error Cases** — Both validation errors and business logic errors
5. **Edge Cases** — Empty lists, pagination boundaries, limits
6. **Workflows** — Full end-to-end scenarios matching real user flows

---

## Prerequisites

- Node.js 22+ LTS
- PostgreSQL 16+ (for integration tests)
- Redis 7+ (for queue tests)
- Vitest + Supertest configured in workspace

---

## Maintenance

When adding new CA endpoints:
1. Add test cases to relevant file (firm/client/compliance/etc.)
2. Ensure RLS tests added to `rls-verification.test.ts`
3. Update feature gate tests if feature-gated
4. Consider end-to-end workflow impact
5. Update this README with new test counts

---

Generated: 2026-04-04
Last Updated: 2026-04-04
