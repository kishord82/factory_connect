# Quick Start Guide — CA Integration Tests

## 30-Second Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Run all CA tests
pnpm test tests/integration/ca

# 3. Done! ✅
```

---

## Common Commands

```bash
# Run all CA tests
pnpm test tests/integration/ca

# Run specific test file
pnpm test tests/integration/ca/firm-endpoints.test.ts
pnpm test tests/integration/ca/compliance-endpoints.test.ts
pnpm test tests/integration/ca/rls-verification.test.ts

# Watch mode (auto-rerun on file changes)
pnpm test --watch tests/integration/ca

# Generate coverage report
pnpm test:coverage tests/integration/ca

# Run single test case
pnpm test -t "should create CA firm with all required fields"

# Run all tests matching pattern
pnpm test -t "RLS"
```

---

## Test Coverage

| Test File | Tests | Focus |
|-----------|-------|-------|
| firm-endpoints.test.ts | 25+ | Firm CRUD, subscription |
| client-endpoints.test.ts | 30+ | Client management |
| compliance-endpoints.test.ts | 35+ | GST/TDS filing |
| rls-verification.test.ts | 15+ | Tenant isolation |
| subscription-endpoints.test.ts | 20+ | Feature gates |
| e2e-workflows.test.ts | 10+ | Real workflows |

**Total: 135+ test cases**

---

## Writing Your First Test

```typescript
import { describe, it, expect } from 'vitest';
import { request, createTestContext, getAuthHeader } from './setup.js';

describe('My New Feature', () => {
  it('should do something', async () => {
    // Create test context (includes JWT token, firm ID, etc.)
    const ctx = createTestContext({ subscriptionTier: 'professional' });

    // Make API request
    const res = await request
      .post('/api/v1/ca/clients')
      .set('Authorization', getAuthHeader(ctx.token))
      .send({ business_name: 'Test Client' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data.business_name).toBe('Test Client');
  });
});
```

---

## Common Test Patterns

### Pattern 1: Authentication Required
```typescript
const res = await request.get('/api/v1/ca/firms/me');
expect(res.status).toBe(401); // Missing token
```

### Pattern 2: Feature Gated
```typescript
const trialCtx = createTestContext({ subscriptionTier: 'trial' });
const res = await request
  .post('/api/v1/ca/compliance/gst/prepare')
  .set('Authorization', getAuthHeader(trialCtx.token))
  .send({ /* ... */ });
expect(res.status).toBe(403); // Feature disabled
```

### Pattern 3: RLS Isolation
```typescript
// Firm A creates data
await request.post('/api/v1/ca/clients')
  .set('Authorization', getAuthHeader(ctx1.token))
  .send({ business_name: 'Secret' });

// Firm B cannot access
const res = await request.get(`/api/v1/ca/clients/${id}`)
  .set('Authorization', getAuthHeader(ctx2.token));
expect(res.status).toBe(404); // Not accessible
```

### Pattern 4: Pagination
```typescript
const res = await request
  .get('/api/v1/ca/clients?limit=10&page=2')
  .set('Authorization', getAuthHeader(ctx.token));

expect(res.body.pagination.page).toBe(2);
expect(res.body.pagination.limit).toBe(10);
expect(res.body.pagination.total).toBeDefined();
```

---

## Error Codes Reference

| Code | Status | Meaning |
|------|--------|---------|
| FC_ERR_AUTH_TOKEN_MISSING | 401 | Missing Bearer token |
| FC_ERR_VALIDATION_FAILED | 400 | Input validation error |
| FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND | 404 | Client not found |
| FC_ERR_COMPLIANCE_FILING_NOT_FOUND | 404 | Filing not found |
| FC_ERR_FEATURE_DISABLED | 403 | Feature not in tier |
| FC_ERR_COMPLIANCE_LIMIT_EXCEEDED | 403 | Client limit reached |
| FC_ERR_COMPLIANCE_INVALID_TRANSITION | 400 | Invalid status change |

---

## Test Context Options

```typescript
// Default (trial tier)
const ctx = createTestContext();

// Professional tier
const ctx = createTestContext({ subscriptionTier: 'professional' });

// With custom firm ID
const ctx = createTestContext({
  subscriptionTier: 'professional',
  caFirmId: 'my-custom-id'
});

// Access properties
ctx.token              // JWT token
ctx.caFirmId          // Firm ID
ctx.userId            // User ID
ctx.subscriptionTier  // 'trial' | 'starter' | 'professional' | 'enterprise'
ctx.correlationId     // Correlation ID
```

---

## Debugging Tests

### Print Response
```typescript
const res = await request.get('/api/v1/ca/firms/me')
  .set('Authorization', getAuthHeader(ctx.token));

console.log(res.status, res.body); // See full response
```

### Run Single Test
```bash
pnpm test -t "should create CA firm with all required fields"
```

### Run in Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/vitest tests/integration/ca/firm-endpoints.test.ts
```

---

## Database Integration

When ready to connect to test database:

1. Update `setup.ts` `seedCaTestData()` function
2. Replace stubs with actual database queries
3. Use test database with RLS policies enabled

```typescript
// Current stub
export async function seedCaTestData() {
  return { firmId: uuidv4(), /* ... */ };
}

// Should become
export async function seedCaTestData() {
  const client = await pool.connect();
  await client.query('INSERT INTO ca_firms ...');
  return { firmId, /* ... */ };
}
```

---

## Performance Tips

- Tests run in parallel by default
- Ensure each test is independent (no shared state)
- Use `beforeEach` for setup, `afterEach` for cleanup
- Mock external services when possible
- Add `.skip` or `.todo` for incomplete tests

```typescript
it.skip('not yet implemented', () => {
  // Skipped
});

it.todo('implement this', () => {
  // Marked as TODO
});
```

---

## Troubleshooting

**Q: Tests timeout**
- Increase test timeout: `it('test', async () => { ... }, { timeout: 10000 })`
- Check if database connection is hanging

**Q: "Cannot find module" error**
- Run `pnpm install`
- Check imports use `.js` extension (ESM)

**Q: Assertion fails unexpectedly**
- Print response: `console.log(res.body)`
- Check authorization header: `getAuthHeader(ctx.token)`
- Verify test context tier: `ctx.subscriptionTier`

**Q: RLS test fails**
- Ensure test database has RLS policies enabled
- Check SET LOCAL statements in queries
- Verify seed data created correctly

---

## File Organization

```
tests/integration/ca/
├── setup.ts                    # Common utilities (import from here)
├── firm-endpoints.test.ts      # Each test file is independent
├── client-endpoints.test.ts    # Can run in any order
├── compliance-endpoints.test.ts
├── rls-verification.test.ts
├── subscription-endpoints.test.ts
├── e2e-workflows.test.ts
├── README.md                   # Full documentation
├── SUMMARY.md                  # Overview
├── INDEX.md                    # Navigation
└── QUICKSTART.md              # This file
```

---

## Resources

- **Full Docs:** [README.md](./README.md)
- **Test Overview:** [SUMMARY.md](./SUMMARY.md)
- **Navigation:** [INDEX.md](./INDEX.md)
- **Vitest Docs:** https://vitest.dev
- **Supertest Docs:** https://github.com/visionmedia/supertest

---

**Ready to test!** 🚀

Run `pnpm test tests/integration/ca` and watch the tests pass.
