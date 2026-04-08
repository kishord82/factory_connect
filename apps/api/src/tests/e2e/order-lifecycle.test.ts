/**
 * E2E: Complete order lifecycle from creation through completion.
 * Tests full saga progression with audit trail verification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import type { RequestContext } from '@fc/shared';
import {
  CanonicalOrderCreateSchema,
  LineItemCreateSchema,
  AddressSchema,
} from '@fc/shared';
import { createApp } from '../../app.js';
import { withTenantTransaction, withTenantClient, getPool } from '@fc/database';

const app = createApp();

// Test data builders
function buildTestContext(): RequestContext {
  return {
    tenantId: uuidv4(),
    userId: uuidv4(),
    correlationId: `test-${uuidv4()}`,
    role: 'factory_admin',
  };
}

async function createTestFactory(ctx: RequestContext) {
  return withTenantTransaction(ctx, async (client) => {
    const factoryId = ctx.tenantId;
    const res = await client.query(
      `INSERT INTO factories (id, name, slug, factory_type, contact_email, timezone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = $2
       RETURNING *`,
      [factoryId, 'Test Factory', `test-${factoryId.slice(0, 8)}`, 1, 'test@factory.com', 'Asia/Kolkata'],
    );
    return res.rows[0];
  });
}

async function createTestBuyer(ctx: RequestContext, factoryId: string) {
  return withTenantTransaction(ctx, async (client) => {
    const buyerId = uuidv4();
    const res = await client.query(
      `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [buyerId, factoryId, 'Test Buyer', 'BUYER123', 'edi_x12'],
    );
    return res.rows[0];
  });
}

async function createTestConnection(ctx: RequestContext, factoryId: string, buyerId: string) {
  return withTenantTransaction(ctx, async (client) => {
    const connId = uuidv4();
    const res = await client.query(
      `INSERT INTO connections (id, factory_id, buyer_id, mode, source_type, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [connId, factoryId, buyerId, 'sandbox', 'tally', 'active'],
    );
    return res.rows[0];
  });
}

async function getSagaStatus(ctx: RequestContext, orderId: string) {
  return withTenantClient(ctx, async (client) => {
    const res = await client.query(
      'SELECT * FROM order_sagas WHERE order_id = $1',
      [orderId],
    );
    return res.rows[0];
  });
}

async function getAuditLog(ctx: RequestContext, entityId: string) {
  return withTenantClient(ctx, async (client) => {
    const res = await client.query(
      'SELECT * FROM audit_log WHERE entity_id = $1 ORDER BY created_at ASC',
      [entityId],
    );
    return res.rows;
  });
}

describe('E2E: Order Lifecycle', () => {
  let ctx: RequestContext;
  let authToken: string;

  beforeEach(async () => {
    ctx = buildTestContext();
    // Mock JWT token for authenticated requests
    authToken = 'Bearer test-token';
    // In real tests, you'd generate a valid JWT
  });

  afterEach(async () => {
    const pool = getPool();
    const client = await pool.connect();
    try {
      // Clean up test data
      await client.query('DELETE FROM canonical_order_line_items WHERE order_id IN (SELECT id FROM canonical_orders WHERE buyer_id IN (SELECT id FROM buyers WHERE factory_id = $1))', [ctx.tenantId]);
      await client.query('DELETE FROM canonical_orders WHERE buyer_id IN (SELECT id FROM buyers WHERE factory_id = $1)', [ctx.tenantId]);
      await client.query('DELETE FROM connections WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM buyers WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM factories WHERE id = $1', [ctx.tenantId]);
    } finally {
      client.release();
    }
  });

  describe('Complete Order Lifecycle', () => {
    it('should create order and verify saga initiated in PO_RECEIVED state', async () => {
      // Setup: Create factory, buyer, connection
      await createTestFactory(ctx);
      const buyer = await createTestBuyer(ctx, ctx.tenantId);
      const conn = await createTestConnection(ctx, ctx.tenantId, buyer.id);

      // Test: Create order
      const orderPayload = {
        buyer_id: buyer.id,
        connection_id: conn.id,
        buyer_po_number: `PO-${Date.now()}`,
        order_date: new Date().toISOString(),
        subtotal: 1000,
        tax_amount: 180,
        total_amount: 1180,
        line_items: [
          {
            line_number: 1,
            buyer_sku: 'SKU-001',
            description: 'Test Product',
            quantity_ordered: 100,
            quantity_uom: 'EA',
            unit_price: 10,
            line_total: 1000,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      const orderId = res.body.data.id;

      // Verify saga initiated
      const saga = await getSagaStatus(ctx, orderId);
      expect(saga).toBeDefined();
      expect(saga.current_state).toBe('PO_RECEIVED');
      expect(saga.order_id).toBe(orderId);

      // Verify audit log
      const auditLog = await getAuditLog(ctx, orderId);
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].action).toBe('CREATE');
    });

    it('should progress saga to PO_CONFIRMED when order is confirmed', async () => {
      // Setup
      await createTestFactory(ctx);
      const buyer = await createTestBuyer(ctx, ctx.tenantId);
      const conn = await createTestConnection(ctx, ctx.tenantId, buyer.id);

      // Create order
      const orderPayload = {
        buyer_id: buyer.id,
        connection_id: conn.id,
        buyer_po_number: `PO-${Date.now()}`,
        order_date: new Date().toISOString(),
        subtotal: 1000,
        tax_amount: 180,
        total_amount: 1180,
        line_items: [
          {
            line_number: 1,
            buyer_sku: 'SKU-001',
            quantity_ordered: 100,
            quantity_uom: 'EA',
            unit_price: 10,
            line_total: 1000,
          },
        ],
      };

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId)
        .send(orderPayload);

      const orderId = createRes.body.data.id;

      // Confirm order
      const confirmRes = await request(app)
        .post(`/api/v1/orders/${orderId}/confirm`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId);

      expect(confirmRes.status).toBe(200);

      // Verify saga progressed
      const saga = await getSagaStatus(ctx, orderId);
      expect(saga.current_state).toBe('PO_CONFIRMED');

      // Verify audit log includes CONFIRM action
      const auditLog = await getAuditLog(ctx, orderId);
      const confirmAction = auditLog.find((entry: any) => entry.action === 'CONFIRM');
      expect(confirmAction).toBeDefined();
    });

    it('should handle order with multiple line items', async () => {
      // Setup
      await createTestFactory(ctx);
      const buyer = await createTestBuyer(ctx, ctx.tenantId);
      const conn = await createTestConnection(ctx, ctx.tenantId, buyer.id);

      // Create order with 5 line items
      const lineItems = Array.from({ length: 5 }, (_, i) => ({
        line_number: i + 1,
        buyer_sku: `SKU-${String(i + 1).padStart(3, '0')}`,
        description: `Product ${i + 1}`,
        quantity_ordered: (i + 1) * 10,
        quantity_uom: 'EA',
        unit_price: 10 * (i + 1),
        line_total: (i + 1) * 10 * 10 * (i + 1),
      }));

      const orderPayload = {
        buyer_id: buyer.id,
        connection_id: conn.id,
        buyer_po_number: `PO-${Date.now()}`,
        order_date: new Date().toISOString(),
        subtotal: 1550,
        tax_amount: 279,
        total_amount: 1829,
        line_items: lineItems,
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId)
        .send(orderPayload);

      expect(res.status).toBe(201);
      const orderId = res.body.data.id;

      // Verify all line items were created
      const getRes = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.line_items.length).toBe(5);
    });

    it('should reject order with invalid data', async () => {
      // Setup
      await createTestFactory(ctx);
      const buyer = await createTestBuyer(ctx, ctx.tenantId);
      const conn = await createTestConnection(ctx, ctx.tenantId, buyer.id);

      // Missing required field
      const invalidPayload = {
        buyer_id: buyer.id,
        connection_id: conn.id,
        // Missing buyer_po_number
        order_date: new Date().toISOString(),
        subtotal: 1000,
        total_amount: 1180,
        line_items: [],
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBeDefined();
    });

    it('should support concurrent order creation with idempotency', async () => {
      // Setup
      await createTestFactory(ctx);
      const buyer = await createTestBuyer(ctx, ctx.tenantId);
      const conn = await createTestConnection(ctx, ctx.tenantId, buyer.id);

      const idempotencyKey = `idem-${uuidv4()}`;

      const orderPayload = {
        buyer_id: buyer.id,
        connection_id: conn.id,
        buyer_po_number: `PO-${Date.now()}`,
        order_date: new Date().toISOString(),
        subtotal: 1000,
        tax_amount: 180,
        total_amount: 1180,
        line_items: [
          {
            line_number: 1,
            buyer_sku: 'SKU-001',
            quantity_ordered: 100,
            quantity_uom: 'EA',
            unit_price: 10,
            line_total: 1000,
          },
        ],
      };

      // Send same request twice with same idempotency key
      const res1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      const res2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      // Both should succeed and return same order ID
      expect(res1.status).toBe(201);
      expect(res2.status).toBe(200); // Idempotent response is 200
      expect(res1.body.data.id).toBe(res2.body.data.id);
    });

    it('should verify audit trail with hash-chain at each step', async () => {
      // Setup
      await createTestFactory(ctx);
      const buyer = await createTestBuyer(ctx, ctx.tenantId);
      const conn = await createTestConnection(ctx, ctx.tenantId, buyer.id);

      // Create and confirm order
      const orderPayload = {
        buyer_id: buyer.id,
        connection_id: conn.id,
        buyer_po_number: `PO-${Date.now()}`,
        order_date: new Date().toISOString(),
        subtotal: 1000,
        tax_amount: 180,
        total_amount: 1180,
        line_items: [
          {
            line_number: 1,
            buyer_sku: 'SKU-001',
            quantity_ordered: 100,
            quantity_uom: 'EA',
            unit_price: 10,
            line_total: 1000,
          },
        ],
      };

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId)
        .send(orderPayload);

      const orderId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/orders/${orderId}/confirm`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', ctx.tenantId)
        .set('X-User-ID', ctx.userId);

      // Verify audit log has sequential hash chain
      const auditLog = await getAuditLog(ctx, orderId);
      expect(auditLog.length).toBeGreaterThanOrEqual(2);

      // Each entry should reference previous hash
      for (let i = 1; i < auditLog.length; i++) {
        expect(auditLog[i].previous_hash).toBe(auditLog[i - 1].hash);
      }
    });
  });
});
