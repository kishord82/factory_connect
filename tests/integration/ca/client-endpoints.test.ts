/**
 * CA2: Client Endpoints Integration Tests
 * Tests for client CRUD, listing, filtering, health scores, and bridge linking
 *
 * Coverage:
 * - POST /api/v1/ca/clients — Create client
 * - GET /api/v1/ca/clients — List with pagination and filters
 * - GET /api/v1/ca/clients/:id — Get client detail
 * - PATCH /api/v1/ca/clients/:id — Update client
 * - GET /api/v1/ca/clients/:id/health — Health score history
 * - POST /api/v1/ca/clients/:id/bridge — Link bridge agent
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request, createTestContext, getAuthHeader, cleanCaTestData } from './setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('CA Client Endpoints', () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    await cleanCaTestData();
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/ca/clients — Create client
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /api/v1/ca/clients', () => {
    it('should create client with all fields', async () => {
      const ctx = createTestContext();
      const clientData = {
        business_name: 'TechStart Industries',
        gstin: '27AABCT0001A1Z0',
        pan: 'AAAPA0001A',
        phone: '+91-99999-00000',
        email: 'accounts@techstart.example.com',
        address: '456 Tech Park',
        city: 'Hyderabad',
        state: 'TS',
        postal_code: '500032',
        contact_person: 'Rajesh Kumar',
        tally_company_name: 'TechStart Industries',
        assigned_staff_id: uuidv4(),
      };

      const res = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(clientData);

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject(clientData);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.tally_status).toBe('pending');
      expect(res.body.data.created_at).toBeDefined();
    });

    it('should create client with minimal fields', async () => {
      const ctx = createTestContext();
      const clientData = {
        business_name: 'Quick Business',
      };

      const res = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(clientData);

      expect(res.status).toBe(201);
      expect(res.body.data.business_name).toBe('Quick Business');
      expect(res.body.data.id).toBeDefined();
    });

    it('should reject missing business_name', async () => {
      const ctx = createTestContext();
      const clientData = {
        gstin: '27AABCT0001A1Z0',
      };

      const res = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(clientData);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FC_ERR_VALIDATION_FAILED');
    });

    it('should reject invalid phone format', async () => {
      const ctx = createTestContext();
      const clientData = {
        business_name: 'Test Biz',
        phone: 'not-a-phone',
      };

      const res = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(clientData);

      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const ctx = createTestContext();
      const clientData = {
        business_name: 'Test Biz',
        email: 'not-an-email',
      };

      const res = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(clientData);

      expect(res.status).toBe(400);
    });

    it('should reject client limit exceeded for trial tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      // Trial tier allows 1 client
      // Create first client
      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 1' });

      // Try to create second
      const res = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 2' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FC_ERR_COMPLIANCE_LIMIT_EXCEEDED');
      expect(res.body.error.details).toHaveProperty('limit');
      expect(res.body.error.details).toHaveProperty('current_count');
    });

    it('should allow multiple clients for starter tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'starter' });
      // Starter allows 10 clients

      const res1 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 1' });

      expect(res1.status).toBe(201);

      const res2 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 2' });

      expect(res2.status).toBe(201);
    });

    it('should require authentication', async () => {
      const clientData = {
        business_name: 'Test Client',
      };

      const res = await request
        .post('/api/v1/ca/clients')
        .send(clientData);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('FC_ERR_AUTH_TOKEN_MISSING');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/clients — List with pagination and filters
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/clients', () => {
    it('should return paginated list of clients', async () => {
      const ctx = createTestContext();

      // Create 3 clients
      for (let i = 1; i <= 3; i++) {
        await request
          .post('/api/v1/ca/clients')
          .set('Authorization', getAuthHeader(ctx.token))
          .send({ business_name: `Client ${i}` });
      }

      const res = await request
        .get('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
    });

    it('should support pagination', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create 25 clients
      for (let i = 1; i <= 25; i++) {
        await request
          .post('/api/v1/ca/clients')
          .set('Authorization', getAuthHeader(ctx.token))
          .send({ business_name: `Client ${i}` });
      }

      const res = await request
        .get('/api/v1/ca/clients?limit=10&page=1')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(10);
      expect(res.body.pagination.total).toBe(25);
      expect(res.body.pagination.page).toBe(1);

      const res2 = await request
        .get('/api/v1/ca/clients?limit=10&page=2')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res2.status).toBe(200);
      expect(res2.body.data.length).toBe(10);
      expect(res2.body.pagination.page).toBe(2);
    });

    it('should filter by tally_status', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create clients with different statuses
      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Connected Client', tally_status: 'connected' });

      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Pending Client', tally_status: 'pending' });

      const res = await request
        .get('/api/v1/ca/clients?tally_status=connected')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.every((c: any) => c.tally_status === 'connected')).toBe(true);
    });

    it('should filter by assigned_staff_id', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });
      const staffId = uuidv4();

      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 1', assigned_staff_id: staffId });

      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 2', assigned_staff_id: uuidv4() });

      const res = await request
        .get(`/api/v1/ca/clients?assigned_staff_id=${staffId}`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.every((c: any) => c.assigned_staff_id === staffId)).toBe(true);
    });

    it('should search by business_name', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'TechCorp Industries' });

      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'TechStart Solutions' });

      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'OtherBiz Ltd' });

      const res = await request
        .get('/api/v1/ca/clients?search=Tech')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((c: any) => c.business_name.includes('Tech'))).toBe(true);
    });

    it('should return empty list for new firm', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should not return clients from other firms (RLS)', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Create client for firm 1
      await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Firm 1 Client' });

      // Query as firm 2
      const res = await request
        .get('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should require authentication', async () => {
      const res = await request
        .get('/api/v1/ca/clients');

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/clients/:id — Get client detail
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/clients/:id', () => {
    it('should return client detail', async () => {
      const ctx = createTestContext();
      const clientData = {
        business_name: 'Detail Test Client',
        gstin: '27AABCT0001A1Z0',
      };

      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(clientData);

      const clientId = createRes.body.data.id;

      const res = await request
        .get(`/api/v1/ca/clients/${clientId}`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject(clientData);
      expect(res.body.data.id).toBe(clientId);
    });

    it('should return 404 for non-existent client', async () => {
      const ctx = createTestContext();
      const fakeId = uuidv4();

      const res = await request
        .get(`/api/v1/ca/clients/${fakeId}`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND');
    });

    it('should enforce RLS (not return other firm client)', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Create client for firm 1
      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Firm 1 Client' });

      const clientId = createRes.body.data.id;

      // Try to access as firm 2
      const res = await request
        .get(`/api/v1/ca/clients/${clientId}`)
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(res.status).toBe(404);
    });

    it('should require authentication', async () => {
      const fakeId = uuidv4();

      const res = await request
        .get(`/api/v1/ca/clients/${fakeId}`);

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/ca/clients/:id — Update client
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /api/v1/ca/clients/:id', () => {
    it('should update client fields', async () => {
      const ctx = createTestContext();

      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Original Name' });

      const clientId = createRes.body.data.id;

      const res = await request
        .patch(`/api/v1/ca/clients/${clientId}`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.business_name).toBe('Updated Name');
      expect(res.body.data.updated_at).toBeDefined();
    });

    it('should reject invalid update data', async () => {
      const ctx = createTestContext();

      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Test' });

      const clientId = createRes.body.data.id;

      const res = await request
        .patch(`/api/v1/ca/clients/${clientId}`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent client', async () => {
      const ctx = createTestContext();
      const fakeId = uuidv4();

      const res = await request
        .patch(`/api/v1/ca/clients/${fakeId}`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'New Name' });

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/clients/:id/health — Health score history
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/clients/:id/health', () => {
    it('should return health score history', async () => {
      const ctx = createTestContext();

      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Health Test' });

      const clientId = createRes.body.data.id;

      const res = await request
        .get(`/api/v1/ca/clients/${clientId}/health`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('timestamp');
      expect(res.body.data[0]).toHaveProperty('health_score');
    });

    it('should return 404 for non-existent client', async () => {
      const ctx = createTestContext();
      const fakeId = uuidv4();

      const res = await request
        .get(`/api/v1/ca/clients/${fakeId}/health`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/ca/clients/:id/bridge — Link bridge agent
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /api/v1/ca/clients/:id/bridge', () => {
    it('should link bridge agent to client', async () => {
      const ctx = createTestContext();

      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Bridge Test' });

      const clientId = createRes.body.data.id;

      const res = await request
        .post(`/api/v1/ca/clients/${clientId}/bridge`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ bridge_agent_id: uuidv4() });

      expect(res.status).toBe(200);
      expect(res.body.data.bridge_agent_id).toBeDefined();
    });

    it('should return 404 for non-existent client', async () => {
      const ctx = createTestContext();
      const fakeId = uuidv4();

      const res = await request
        .post(`/api/v1/ca/clients/${fakeId}/bridge`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ bridge_agent_id: uuidv4() });

      expect(res.status).toBe(404);
    });
  });
});
