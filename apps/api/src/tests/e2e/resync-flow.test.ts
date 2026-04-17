/**
 * E2E: Resync flow — request, validate, approve, queue, execute, complete
 */

import { withTenantTransaction, withTenantClient, getPool } from '@fc/database';
import type { RequestContext } from '@fc/shared';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const HEADER_AUTH = 'Authorization';
const HEADER_TENANT = 'X-Tenant-ID';
const HEADER_USER = 'X-User-ID';
const API_RESYNC = '/api/v1/resync';

interface DbRow {
  [key: string]: unknown;
}
const TEST_DATE_FROM = '2024-01-01';
const TEST_DATE_TO = '2024-01-31';
const TEST_REASON = 'Manual reconciliation';

import { createApp } from '../../app.js';


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
  return withTenantTransaction(ctx, async (client) => {
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

async function createTestConnection(ctx: RequestContext, factoryId: string): Promise<string> {
  return withTenantTransaction(ctx, async (client) => {
    const connId = uuidv4();
    await client.query(
      `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = $3`,
      [uuidv4(), factoryId, 'Test Buyer', 'BUYER123', 'edi_x12'],
    );
    const buyerRes = await client.query(
      'SELECT id FROM buyers WHERE factory_id = $1 LIMIT 1',
      [factoryId],
    );
    const buyerId = buyerRes.rows[0].id;

    await client.query(
      `INSERT INTO connections (id, factory_id, buyer_id, mode, source_type, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET status = $6`,
      [connId, factoryId, buyerId, 'sandbox', 'tally', 'active'],
    );
    return connId;
  });
}

async function getResyncStatus(ctx: RequestContext, resyncId: string): Promise<DbRow> {
  return withTenantClient(ctx, async (client) => {
    const res = await client.query(
      'SELECT * FROM resync_requests WHERE id = $1',
      [resyncId],
    );
    return res.rows[0];
  });
}


describe('E2E: Resync Flow', () => {
  let ctx: RequestContext;
  let authToken: string;

  beforeEach(async () => {
    ctx = buildTestContext();
    authToken = 'Bearer test-token';
  });

  afterEach(async () => {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM resync_items WHERE resync_request_id IN (SELECT id FROM resync_requests WHERE factory_id = $1)', [ctx.tenantId]);
      await client.query('DELETE FROM resync_requests WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM canonical_order_line_items WHERE order_id IN (SELECT id FROM canonical_orders WHERE buyer_id IN (SELECT id FROM buyers WHERE factory_id = $1))', [ctx.tenantId]);
      await client.query('DELETE FROM canonical_orders WHERE buyer_id IN (SELECT id FROM buyers WHERE factory_id = $1)', [ctx.tenantId]);
      await client.query('DELETE FROM connections WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM buyers WHERE factory_id = $1', [ctx.tenantId]);
      await client.query('DELETE FROM factories WHERE id = $1', [ctx.tenantId]);
    } finally {
      client.release();
    }
  });

  describe('Resync Lifecycle', () => {
    it('should create a resync request in REQUESTED state', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      const resyncPayload = {
        connection_id: connId,
        date_from: TEST_DATE_FROM,
        date_to: TEST_DATE_TO,
        reason: TEST_REASON,
      };

      const res = await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send(resyncPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('REQUESTED');

      // Verify in database
      const resyncId = res.body.data.id;
      const resync = await getResyncStatus(ctx, resyncId);
      expect(resync.status).toBe('REQUESTED');
      expect(resync.connection_id).toBe(connId);
    });

    it('should validate resync request and move to VALIDATED', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      // Create resync
      const createRes = await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          connection_id: connId,
          date_from: TEST_DATE_FROM,
          date_to: TEST_DATE_TO,
          reason: TEST_REASON,
        });

      const resyncId = createRes.body.data.id;

      // Validate resync
      const validateRes = await request(app)
        .post(`/api/v1/resync/${resyncId}/validate`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(validateRes.status).toBe(200);
      expect(validateRes.body.data.status).toBe('VALIDATED');

      // Verify status in database
      const resync = await getResyncStatus(ctx, resyncId);
      expect(resync.status).toBe('VALIDATED');
    });

    it('should approve resync and move to APPROVED', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      // Create and validate resync
      const createRes = await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          connection_id: connId,
          date_from: TEST_DATE_FROM,
          date_to: TEST_DATE_TO,
          reason: TEST_REASON,
        });

      const resyncId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/resync/${resyncId}/validate`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      // Approve resync
      const approveRes = await request(app)
        .post(`/api/v1/resync/${resyncId}/approve`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APPROVED');

      const resync = await getResyncStatus(ctx, resyncId);
      expect(resync.status).toBe('APPROVED');
    });

    it('should queue resync for processing', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      const createRes = await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          connection_id: connId,
          date_from: TEST_DATE_FROM,
          date_to: TEST_DATE_TO,
          reason: TEST_REASON,
        });

      const resyncId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/resync/${resyncId}/validate`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      await request(app)
        .post(`/api/v1/resync/${resyncId}/approve`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      // Queue resync
      const queueRes = await request(app)
        .post(`/api/v1/resync/${resyncId}/queue`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(queueRes.status).toBe(200);
      expect(queueRes.body.data.status).toBe('QUEUED');

      const resync = await getResyncStatus(ctx, resyncId);
      expect(resync.status).toBe('QUEUED');
    });

    it('should start and complete resync processing', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      const createRes = await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          connection_id: connId,
          date_from: TEST_DATE_FROM,
          date_to: TEST_DATE_TO,
          reason: TEST_REASON,
        });

      const resyncId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/resync/${resyncId}/validate`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      await request(app)
        .post(`/api/v1/resync/${resyncId}/approve`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      await request(app)
        .post(`/api/v1/resync/${resyncId}/queue`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      // Start processing
      const startRes = await request(app)
        .post(`/api/v1/resync/${resyncId}/start`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(startRes.status).toBe(200);
      expect(startRes.body.data.status).toBe('IN_PROGRESS');

      // Complete processing
      const completeRes = await request(app)
        .post(`/api/v1/resync/${resyncId}/complete`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('COMPLETED');

      const resync = await getResyncStatus(ctx, resyncId);
      expect(resync.status).toBe('COMPLETED');
    });

    it('should reject resync request', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      const createRes = await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          connection_id: connId,
          date_from: TEST_DATE_FROM,
          date_to: TEST_DATE_TO,
          reason: TEST_REASON,
        });

      const resyncId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/resync/${resyncId}/validate`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      // Reject resync
      const rejectRes = await request(app)
        .post(`/api/v1/resync/${resyncId}/reject`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({ reason: 'Invalid date range' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('REJECTED');

      const resync = await getResyncStatus(ctx, resyncId);
      expect(resync.status).toBe('REJECTED');
    });

    it('should handle partial failure during resync', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      const createRes = await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          connection_id: connId,
          date_from: TEST_DATE_FROM,
          date_to: TEST_DATE_TO,
          reason: TEST_REASON,
        });

      const resyncId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/resync/${resyncId}/validate`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      await request(app)
        .post(`/api/v1/resync/${resyncId}/approve`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      await request(app)
        .post(`/api/v1/resync/${resyncId}/queue`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      await request(app)
        .post(`/api/v1/resync/${resyncId}/start`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      // Mark as partial failure
      const failRes = await request(app)
        .post(`/api/v1/resync/${resyncId}/partial-fail`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({ failed_items: ['item-1', 'item-2'] });

      expect(failRes.status).toBe(200);
      expect(failRes.body.data.status).toBe('PARTIAL_FAIL');

      const resync = await getResyncStatus(ctx, resyncId);
      expect(resync.status).toBe('PARTIAL_FAIL');
    });

    it('should list resync requests with filtering', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      // Create 3 resync requests with different statuses
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API_RESYNC)
          .set(HEADER_AUTH, authToken)
          .set(HEADER_TENANT, ctx.tenantId)
          .set(HEADER_USER, ctx.userId)
          .send({
            connection_id: connId,
            date_from: `2024-0${i + 1}-01`,
            date_to: `2024-0${i + 1}-28`,
            reason: `Resync ${i + 1}`,
          });
      }

      // List all resync requests
      const listRes = await request(app)
        .get(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(3);
    });

    it('should filter resync requests by status', async () => {
      await createTestFactory(ctx);
      const connId = await createTestConnection(ctx, ctx.tenantId);

      // Create two resync requests
      const res1 = await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          connection_id: connId,
          date_from: TEST_DATE_FROM,
          date_to: TEST_DATE_TO,
          reason: 'Resync 1',
        });

      await request(app)
        .post(API_RESYNC)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId)
        .send({
          connection_id: connId,
          date_from: '2024-02-01',
          date_to: '2024-02-29',
          reason: 'Resync 2',
        });

      // Validate only the first one
      const resyncId1 = res1.body.data.id;
      await request(app)
        .post(`/api/v1/resync/${resyncId1}/validate`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      // Filter by status
      const listRes = await request(app)
        .get(`${API_RESYNC}?status=VALIDATED`)
        .set(HEADER_AUTH, authToken)
        .set(HEADER_TENANT, ctx.tenantId)
        .set(HEADER_USER, ctx.userId);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].id).toBe(resyncId1);
    });
  });
});
