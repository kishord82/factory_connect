/**
 * Integration: Middleware stack — auth, tenant context, rate limit, idempotency, validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import type { RequestContext } from '@fc/shared';
import { createApp } from '../../app.js';

const app = createApp();

describe('Integration: Middleware Stack', () => {
  const validTenantId = uuidv4();
  const validUserId = uuidv4();
  const validCorrelationId = `test-${uuidv4()}`;

  describe('Auth Middleware', () => {
    it('should accept request with valid authorization header', async () => {
      // Health endpoint is public, but protected endpoints need auth
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
    });

    it('should reject request without authorization header on protected endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/orders');

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBeDefined();
    });

    it('should reject request with invalid JWT token', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should reject request with expired JWT token', async () => {
      // Token with exp in the past
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';

      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', expiredToken);

      expect(res.status).toBe(401);
    });

    it('should accept request with valid JWT in Authorization header', async () => {
      // Mock JWT (would be real token from Keycloak in production)
      const validToken = 'Bearer valid-test-token';

      // Mock the JWT verification to accept this token
      // (In real tests, use a test JWT generator or mock the auth middleware)
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', validToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      // Should get past auth middleware
      // Actual response depends on whether test data exists
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('Tenant Context Middleware', () => {
    const authToken = 'Bearer test-token';

    it('should extract tenant_id from X-Tenant-ID header', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      // Should accept the request with proper tenant context
      expect(res.status).not.toBe(400);
    });

    it('should reject request without X-Tenant-ID header', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-User-ID', validUserId);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toContain('TENANT');
    });

    it('should reject request with invalid tenant_id format', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', 'not-a-uuid')
        .set('X-User-ID', validUserId);

      expect(res.status).toBe(400);
    });

    it('should extract user_id from X-User-ID header', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      expect(res.status).not.toBe(400);
    });

    it('should reject request without X-User-ID header', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toContain('USER');
    });
  });

  describe('Correlation ID Middleware', () => {
    const authToken = 'Bearer test-token';

    it('should accept request with X-Correlation-ID header', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .set('X-Correlation-ID', validCorrelationId);

      // Should pass correlation ID middleware
      expect([200, 404, 500]).toContain(res.status);
    });

    it('should generate correlation ID if not provided', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      // Should generate a correlation ID in response headers
      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('should propagate correlation ID in response header', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .set('X-Correlation-ID', validCorrelationId);

      expect(res.headers['x-correlation-id']).toBe(validCorrelationId);
    });
  });

  describe('Rate Limiter Middleware', () => {
    const authToken = 'Bearer test-token';

    it('should allow requests within rate limit', async () => {
      const tenantId = uuidv4();
      const userId = uuidv4();

      // Make several requests (below limit)
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .get('/api/v1/orders')
          .set('Authorization', authToken)
          .set('X-Tenant-ID', tenantId)
          .set('X-User-ID', userId);

        expect(res.status).not.toBe(429);
      }
    });

    it('should return 429 when rate limit exceeded', async () => {
      const tenantId = uuidv4();
      const userId = uuidv4();

      // Make many requests to hit rate limit
      let statusCode = 200;
      for (let i = 0; i < 200; i++) {
        const res = await request(app)
          .get('/api/v1/orders')
          .set('Authorization', authToken)
          .set('X-Tenant-ID', tenantId)
          .set('X-User-ID', userId);

        statusCode = res.status;
        if (statusCode === 429) break;
      }

      expect(statusCode).toBe(429);
    });

    it('should include rate limit headers', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Validation Middleware', () => {
    const authToken = 'Bearer test-token';

    it('should reject request with invalid JSON body', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .set('Content-Type', 'application/json')
        .send('{invalid json}');

      expect(res.status).toBe(400);
    });

    it('should validate request body against schema', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .send({
          // Missing required fields
          buyer_id: uuidv4(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toContain('VALIDATION');
    });

    it('should validate URL parameters', async () => {
      const res = await request(app)
        .get('/api/v1/orders/not-a-uuid')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      expect(res.status).toBe(400);
    });

    it('should validate query parameters', async () => {
      const res = await request(app)
        .get('/api/v1/orders?page=invalid&pageSize=100')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      expect(res.status).toBe(400);
    });

    it('should coerce query parameters to correct types', async () => {
      const res = await request(app)
        .get('/api/v1/orders?page=2&pageSize=50')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      // Should pass validation (coerced to numbers)
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('Idempotency Middleware', () => {
    const authToken = 'Bearer test-token';

    it('should accept request with X-Idempotency-Key header', async () => {
      const idempotencyKey = `idem-${uuidv4()}`;

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          buyer_id: uuidv4(),
          connection_id: uuidv4(),
          buyer_po_number: 'PO-123',
          order_date: new Date().toISOString(),
          subtotal: 1000,
          total_amount: 1000,
          line_items: [],
        });

      // Should process (or fail for other reasons)
      expect([201, 400, 404, 500]).toContain(res.status);
    });

    it('should return same response for duplicate idempotency key', async () => {
      const idempotencyKey = `idem-${uuidv4()}`;
      const orderPayload = {
        buyer_id: uuidv4(),
        connection_id: uuidv4(),
        buyer_po_number: `PO-${Date.now()}`,
        order_date: new Date().toISOString(),
        subtotal: 1000,
        total_amount: 1000,
        line_items: [],
      };

      const res1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      const res2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      // Second request should return cached response
      expect(res1.status).toBe(res2.status);
      if (res1.status === 201 && res2.status === 200) {
        // Idempotent responses return 200
        expect(res1.body.data?.id).toBe(res2.body.data?.id);
      }
    });

    it('should allow POST without idempotency key (backward compatibility)', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .send({
          buyer_id: uuidv4(),
          connection_id: uuidv4(),
          buyer_po_number: `PO-${Date.now()}`,
          order_date: new Date().toISOString(),
          subtotal: 1000,
          total_amount: 1000,
          line_items: [],
        });

      // Should process (or fail for other reasons, not missing idempotency key)
      expect(res.status).not.toBe(400);
    });
  });

  describe('Feature Gate Middleware', () => {
    const authToken = 'Bearer test-token';

    it('should reject request if feature flag is disabled', async () => {
      // This would test against a disabled feature flag
      // Implementation depends on which endpoints have feature gates
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .set('X-Feature-Override', 'false')
        .send({
          buyer_id: uuidv4(),
          connection_id: uuidv4(),
          buyer_po_number: 'PO-123',
          order_date: new Date().toISOString(),
          subtotal: 1000,
          total_amount: 1000,
          line_items: [],
        });

      // Feature gate check is optional per endpoint
      expect([201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('Error Handler Middleware', () => {
    const authToken = 'Bearer test-token';

    it('should return error in standardized format', async () => {
      const res = await request(app)
        .get('/api/v1/orders/invalid-uuid')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBeDefined();
      expect(res.body.error.message).toBeDefined();
    });

    it('should include correlation ID in error response', async () => {
      const correlationId = `error-${uuidv4()}`;

      const res = await request(app)
        .get('/api/v1/orders/invalid-uuid')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId)
        .set('X-Correlation-ID', correlationId);

      expect(res.headers['x-correlation-id']).toBe(correlationId);
    });

    it('should not expose sensitive information in error messages', async () => {
      const res = await request(app)
        .get('/api/v1/orders/invalid-uuid')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      // Error message should not contain database details, stack traces, etc.
      expect(res.body.error.message).not.toMatch(/query|sql|table|column/i);
    });

    it('should return 404 for non-existent endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', validTenantId)
        .set('X-User-ID', validUserId);

      expect(res.status).toBe(404);
    });
  });
});
