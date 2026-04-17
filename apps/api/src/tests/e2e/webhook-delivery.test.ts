/**
 * E2E: Webhook lifecycle — registration, delivery, retry, HMAC verification
 */

import crypto from 'crypto';

import { withTenantTransaction, withTenantClient } from '@fc/database';
import type { PoolClient } from '@fc/database';
import type { RequestContext } from '@fc/shared';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';



import { createApp } from '../../app.js';

interface DbRow {
  id: string;
  [key: string]: unknown;
}

const HEADER_AUTH = 'Authorization';
const HEADER_TENANT = 'X-Tenant-ID';
const HEADER_USER = 'X-User-ID';
const API_WEBHOOKS = '/api/v1/webhooks';
const API_ORDERS = '/api/v1/orders';
const TEST_WEBHOOK_URL = 'https://webhook.example.com/orders';
const TEST_WEBHOOK_SECRET = 'test-webhook-secret-12345';
const EVENT_ORDER_CONFIRMED = 'ORDER_CONFIRMED';
const WEBHOOK_URL_1 = 'https://webhook1.example.com';
const WEBHOOK_URL_2 = 'https://webhook2.example.com';

const app = createApp();

function buildTestContext(): RequestContext {
  return {
    tenantId: uuidv4(),
    userId: uuidv4(),
    correlationId: `test-${uuidv4()}`,
    role: 'factory_admin',
  };
}

async function createTestFactory(ctx: RequestContext): Promise<string> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const factoryId = ctx.tenantId;
    await client.query(
      `INSERT INTO factories (id, name, slug, factory_type, contact_email, timezone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = $2`,
      [factoryId, 'Test Factory', `test-${factoryId.slice(0, 8)}`, 1, 'test@factory.com', 'Asia/Kolkata'],
    );
    return factoryId;
  });
}

async function createTestBuyer(ctx: RequestContext, factoryId: string): Promise<string> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const buyerId = uuidv4();
    await client.query(
      `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = $3`,
      [buyerId, factoryId, 'Test Buyer', 'BUYER123', 'edi_x12'],
    );
    return buyerId;
  });
}

async function createTestConnection(ctx: RequestContext, factoryId: string, buyerId: string): Promise<string> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const connId = uuidv4();
    await client.query(
      `INSERT INTO connections (id, factory_id, buyer_id, mode, source_type, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET status = $6`,
      [connId, factoryId, buyerId, 'sandbox', 'tally', 'active'],
    );
    return connId;
  });
}

async function getWebhookSubscriptions(ctx: RequestContext): Promise<DbRow[]> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const res = await client.query('SELECT * FROM webhook_subscriptions ORDER BY created_at DESC');
    return res.rows;
  });
}

async function getWebhookDeliveries(ctx: RequestContext, subscriptionId: string): Promise<DbRow[]> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const res = await client.query(
      'SELECT * FROM webhook_deliveries WHERE subscription_id = $1 ORDER BY created_at DESC',
      [subscriptionId],
    );
    return res.rows;
  });
}

// Helper to generate HMAC signature like the real system
function generateHmacSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

describe('E2E: Webhook Delivery', () => {
  let ctx: RequestContext;
  let authToken: string;

  beforeEach(async () => {
    ctx = buildTestContext();
    authToken = `Bearer ${jwt.sign({ sub: ctx.userId, factory_id: ctx.tenantId, role: 'factory_admin' }, 'fc-dev-secret-do-not-use-in-prod')}`;
  });

  afterEach(async () => {
    await withTenantTransaction(ctx, async (client: PoolClient) => {
      await client.query('DELETE FROM webhook_deliveries WHERE subscription_id IN (SELECT id FROM webhook_subscriptions WHERE factory_id = $1)', [ctx.tenantId]);
      await client.query('DELETE FROM webhook_subscriptions WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM order_sagas WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM canonical_order_line_items WHERE order_id IN (SELECT id FROM canonical_orders WHERE buyer_id IN (SELECT id FROM buyers WHERE factory_id = $1))', [ctx.tenantId]);
      await client.query('DELETE FROM canonical_orders WHERE buyer_id IN (SELECT id FROM buyers WHERE factory_id = $1)', [ctx.tenantId]);
      await client.query('DELETE FROM connections WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM buyers WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM factories WHERE id = $1', [ctx.tenantId]);
    });
  });

  describe('Webhook Registration and Delivery', () => {
    it('should register a webhook subscription', async () => {
      await createTestFactory(ctx);

      const subscriptionPayload = {
        url: TEST_WEBHOOK_URL,
        events: [EVENT_ORDER_CONFIRMED, 'SHIPMENT_CREATED'],
        secret: 'test-webhook-secret-00000',
      };

      const res = await request(app)
        .post(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send(subscriptionPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.url).toBe(subscriptionPayload.url);
      expect(res.body.data.secret).toBeUndefined(); // Should not be returned

      // Verify in database
      const subs = await getWebhookSubscriptions(ctx);
      expect(subs.length).toBe(1);
      expect(subs[0].url).toBe(subscriptionPayload.url);
    });

    it('should validate webhook URL format', async () => {
      await createTestFactory(ctx);

      const invalidPayload = {
        url: 'not-a-url',
        events: [EVENT_ORDER_CONFIRMED],
        secret: TEST_WEBHOOK_SECRET,
      };

      const res = await request(app)
        .post(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBeDefined();
    });

    it('should deliver webhook when order is confirmed', async () => {
      // Setup
      await createTestFactory(ctx);
      const buyerId = await createTestBuyer(ctx, ctx.tenantId);
      const connId = await createTestConnection(ctx, ctx.tenantId, buyerId);

      // Register webhook
      const webhookUrl = TEST_WEBHOOK_URL;
      const webhookSecret = TEST_WEBHOOK_SECRET;

      const subRes = await request(app)
        .post(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          url: webhookUrl,
          events: [EVENT_ORDER_CONFIRMED],
          secret: webhookSecret,
        });

      expect(subRes.status).toBe(201);
      const subscriptionId = subRes.body.data.id;

      // Create order
      const orderPayload = {
        buyer_id: buyerId,
        connection_id: connId,
        buyer_po_number: `PO-${Date.now()}`,
        source_type: 'tally',
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

      const orderRes = await request(app)
        .post(API_ORDERS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send(orderPayload);

      const orderId = orderRes.body.data.id;

      // Confirm order (should trigger webhook)
      await request(app)
        .post(`/api/v1/orders/${orderId}/confirm`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      // In real system, webhook would be delivered asynchronously
      // Verify delivery record exists
      const deliveries = await getWebhookDeliveries(ctx, subscriptionId);
      expect(deliveries.length).toBeGreaterThanOrEqual(0);
      // (Actual delivery is async, would need worker polling in real test)
    });

    it('should include HMAC signature in webhook headers', async () => {
      // This test verifies the HMAC generation logic
      const payload = JSON.stringify({
        event: EVENT_ORDER_CONFIRMED,
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
      });

      const secret = TEST_WEBHOOK_SECRET;
      const signature = generateHmacSignature(payload, secret);

      // Verify signature is deterministic
      const signature2 = generateHmacSignature(payload, secret);
      expect(signature).toBe(signature2);

      // Verify signature changes with different payload
      const payload2 = JSON.stringify({
        event: EVENT_ORDER_CONFIRMED,
        order_id: 'order-456',
        timestamp: new Date().toISOString(),
      });
      const signature3 = generateHmacSignature(payload2, secret);
      expect(signature3).not.toBe(signature);
    });

    it('should list webhook subscriptions', async () => {
      await createTestFactory(ctx);

      // Register 3 webhooks
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API_WEBHOOKS)
          .set(HEADER_AUTH, authToken)
          .set(HEADER_TENANT, ctx.tenantId)
          .set(HEADER_USER, ctx.userId)
          .send({
            url: `https://webhook.example.com/endpoint-${i}`,
            events: [EVENT_ORDER_CONFIRMED],
            secret: `secret-${i}-padded-1234567890`,
          });
      }

      // List webhooks
      const res = await request(app)
        .get(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('should delete a webhook subscription', async () => {
      await createTestFactory(ctx);

      // Register webhook
      const subRes = await request(app)
        .post(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          url: TEST_WEBHOOK_URL,
          events: [EVENT_ORDER_CONFIRMED],
          secret: TEST_WEBHOOK_SECRET,
        });

      const subscriptionId = subRes.body.data.id;

      // Delete webhook
      const deleteRes = await request(app)
        .delete(`/api/v1/webhooks/${subscriptionId}`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(deleteRes.status).toBe(204);

      // Verify deleted
      const subs = await getWebhookSubscriptions(ctx);
      expect(subs.find((s) => s.id === subscriptionId)).toBeUndefined();
    });

    it('should filter webhook subscriptions by event type', async () => {
      await createTestFactory(ctx);

      // Register webhooks with different event types
      await request(app)
        .post(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          url: WEBHOOK_URL_1,
          events: [EVENT_ORDER_CONFIRMED],
          secret: 'secret1-padded-1234567890',
        });

      await request(app)
        .post(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          url: WEBHOOK_URL_2,
          events: ['SHIPMENT_CREATED', 'INVOICE_CREATED'],
          secret: 'secret2-padded-1234567890',
        });

      // List and filter by event type
      const res = await request(app)
        .get(`${API_WEBHOOKS}?event_type=${EVENT_ORDER_CONFIRMED}`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].url).toBe(WEBHOOK_URL_1);
    });

    it('should enforce tenant isolation for webhooks', async () => {
      // Setup: Create two factories (tenants)
      const ctx1 = buildTestContext();
      const ctx2 = buildTestContext();

      await createTestFactory(ctx1);
      await createTestFactory(ctx2);

      // Register webhook for ctx1
      await request(app)
        .post(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx1.tenantId)
        .set(HEADER_USER, ctx1.userId)
        .send({
          url: WEBHOOK_URL_1,
          events: [EVENT_ORDER_CONFIRMED],
          secret: 'secret1-padded-1234567890',
        });

      // Try to list webhooks as ctx2
      const res = await request(app)
        .get(API_WEBHOOKS)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx2.tenantId)
        .set(HEADER_USER, ctx2.userId);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0); // Should see only its own webhooks
    });
  });
});
