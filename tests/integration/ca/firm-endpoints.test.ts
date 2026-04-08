/**
 * CA1: Firm Endpoints Integration Tests
 * Tests for POST/PATCH firm, GET firm profile, subscription endpoints
 *
 * Coverage:
 * - POST /api/v1/ca/firms — Create firm
 * - GET /api/v1/ca/firms/me — Get own firm profile
 * - PATCH /api/v1/ca/firms/me — Update settings
 * - GET /api/v1/ca/firms/me/subscription — Get subscription
 * - GET /api/v1/ca/firms/me/dashboard — Dashboard data
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request, generateCaToken, createTestContext, getAuthHeader, cleanCaTestData } from './setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('CA Firm Endpoints', () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    await cleanCaTestData();
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/ca/firms — Create firm (onboarding)
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /api/v1/ca/firms', () => {
    it('should create CA firm with all required fields', async () => {
      const ctx = createTestContext();
      const firmData = {
        firm_name: 'Sharma & Associates',
        gst_number: '18AABCT0001A1Z0',
        pan_number: 'AAAPF0001A',
        firm_type: 'pvt_ltd',
        phone_number: '+91-40-1234-5678',
        email: 'info@sharma.example.com',
        address: '123 Main Street',
        city: 'Hyderabad',
        state: 'TS',
        postal_code: '500001',
      };

      const res = await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(firmData);

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject(firmData);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.created_at).toBeDefined();
    });

    it('should create firm with minimal fields', async () => {
      const ctx = createTestContext();
      const firmData = {
        firm_name: 'Quick CA',
      };

      const res = await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(firmData);

      expect(res.status).toBe(201);
      expect(res.body.data.firm_name).toBe('Quick CA');
      expect(res.body.data.id).toBeDefined();
    });

    it('should reject missing firm_name', async () => {
      const ctx = createTestContext();
      const firmData = {
        gst_number: '18AABCT0001A1Z0',
      };

      const res = await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(firmData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FC_ERR_VALIDATION_FAILED');
    });

    it('should reject invalid GSTIN format', async () => {
      const ctx = createTestContext();
      const firmData = {
        firm_name: 'Test Firm',
        gst_number: 'INVALID_GSTIN',
      };

      const res = await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(firmData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid firm_type', async () => {
      const ctx = createTestContext();
      const firmData = {
        firm_name: 'Test Firm',
        firm_type: 'invalid_type',
      };

      const res = await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(firmData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const ctx = createTestContext();
      const firmData = {
        firm_name: 'Test Firm',
        email: 'not-an-email',
      };

      const res = await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(firmData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject duplicate GST number', async () => {
      const ctx = createTestContext();
      const gstNumber = '18AABCT0001A1Z0';
      const firmData = {
        firm_name: 'Firm 1',
        gst_number: gstNumber,
      };

      // Create first firm
      await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(firmData);

      // Attempt to create duplicate
      const ctx2 = createTestContext();
      const res = await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx2.token))
        .send(firmData);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('FC_ERR_COMPLIANCE_DUPLICATE_REGISTRATION');
    });

    it('should reject duplicate registration number', async () => {
      const ctx = createTestContext();
      const firmData = {
        firm_name: 'Test Firm',
        pan_number: 'AAAPF0001A',
      };

      // Create first
      await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(firmData);

      // Attempt duplicate
      const ctx2 = createTestContext();
      const res = await request
        .post('/api/v1/ca/firms')
        .set('Authorization', getAuthHeader(ctx2.token))
        .send(firmData);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('FC_ERR_COMPLIANCE_DUPLICATE_REGISTRATION');
    });

    it('should require authentication', async () => {
      const firmData = {
        firm_name: 'Test Firm',
      };

      const res = await request
        .post('/api/v1/ca/firms')
        .send(firmData);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('FC_ERR_AUTH_TOKEN_MISSING');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/firms/me — Get current firm profile
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/firms/me', () => {
    it('should return current firm profile', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.firm_name).toBeDefined();
      expect(res.body.data.subscription_tier).toBe(ctx.subscriptionTier);
    });

    it('should return subscription tier in profile', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const res = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.subscription_tier).toBe('professional');
    });

    it('should include all firm fields', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      const { data } = res.body;
      expect(data.id).toBeDefined();
      expect(data.firm_name).toBeDefined();
      expect(data.gst_number).toBeDefined();
      expect(data.pan_number).toBeDefined();
      expect(data.phone_number).toBeDefined();
      expect(data.email).toBeDefined();
      expect(data.address).toBeDefined();
      expect(data.city).toBeDefined();
      expect(data.state).toBeDefined();
      expect(data.postal_code).toBeDefined();
      expect(data.subscription_tier).toBeDefined();
      expect(data.created_at).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request
        .get('/api/v1/ca/firms/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('FC_ERR_AUTH_TOKEN_MISSING');
    });

    it('should not return other firms profile (RLS)', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Get firm 1's profile
      const res1 = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx1.token));

      const firmId1 = res1.body.data.id;

      // Get firm 2's profile
      const res2 = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx2.token));

      const firmId2 = res2.body.data.id;

      // They should be different
      expect(firmId1).not.toBe(firmId2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/ca/firms/me — Update firm settings
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /api/v1/ca/firms/me', () => {
    it('should update firm settings', async () => {
      const ctx = createTestContext();
      const updates = {
        firm_name: 'Updated Firm Name',
        phone_number: '+91-40-9999-8888',
      };

      const res = await request
        .patch('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.data.firm_name).toBe('Updated Firm Name');
      expect(res.body.data.phone_number).toBe('+91-40-9999-8888');
      expect(res.body.data.updated_at).toBeDefined();
    });

    it('should update single field', async () => {
      const ctx = createTestContext();
      const updates = {
        city: 'Bangalore',
      };

      const res = await request
        .patch('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.data.city).toBe('Bangalore');
    });

    it('should reject invalid GSTIN in update', async () => {
      const ctx = createTestContext();
      const updates = {
        gst_number: 'INVALID',
      };

      const res = await request
        .patch('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(updates);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid firm_type in update', async () => {
      const ctx = createTestContext();
      const updates = {
        firm_type: 'invalid_type',
      };

      const res = await request
        .patch('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(updates);

      expect(res.status).toBe(400);
    });

    it('should reject invalid email in update', async () => {
      const ctx = createTestContext();
      const updates = {
        email: 'not-an-email',
      };

      const res = await request
        .patch('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token))
        .send(updates);

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const updates = {
        firm_name: 'New Name',
      };

      const res = await request
        .patch('/api/v1/ca/firms/me')
        .send(updates);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('FC_ERR_AUTH_TOKEN_MISSING');
    });

    it('should accept empty update body', async () => {
      const ctx = createTestContext();

      const res = await request
        .patch('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({});

      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/firms/me/subscription — Get subscription details
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/firms/me/subscription', () => {
    it('should return subscription details for trial tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      const res = await request
        .get('/api/v1/ca/firms/me/subscription')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.subscription_tier).toBe('trial');
      expect(res.body.data.features).toBeDefined();
      expect(res.body.data.client_limit).toBe(1);
      expect(res.body.data.staff_limit).toBe(1);
    });

    it('should return subscription details for starter tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'starter' });

      const res = await request
        .get('/api/v1/ca/firms/me/subscription')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.subscription_tier).toBe('starter');
      expect(res.body.data.client_limit).toBe(10);
      expect(res.body.data.staff_limit).toBe(5);
    });

    it('should return subscription details for professional tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const res = await request
        .get('/api/v1/ca/firms/me/subscription')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.subscription_tier).toBe('professional');
      expect(res.body.data.client_limit).toBe(100);
    });

    it('should return subscription details for enterprise tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'enterprise' });

      const res = await request
        .get('/api/v1/ca/firms/me/subscription')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.subscription_tier).toBe('enterprise');
      expect(res.body.data.client_limit).toBeGreaterThan(100);
    });

    it('should require authentication', async () => {
      const res = await request
        .get('/api/v1/ca/firms/me/subscription');

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/firms/me/dashboard — Dashboard data
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/firms/me/dashboard', () => {
    it('should return dashboard summary', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/firms/me/dashboard')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('total_clients');
      expect(res.body.data).toHaveProperty('total_filings');
      expect(res.body.data).toHaveProperty('pending_filings');
      expect(res.body.data).toHaveProperty('completed_filings');
      expect(res.body.data).toHaveProperty('open_exceptions');
      expect(res.body.data).toHaveProperty('critical_exceptions');
    });

    it('should include activity metrics', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/firms/me/dashboard')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('last_login');
      expect(res.body.data).toHaveProperty('staff_online');
      expect(res.body.data).toHaveProperty('recent_activity');
    });

    it('should return empty dashboard for new firm', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/firms/me/dashboard')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.total_clients).toBe(0);
      expect(res.body.data.total_filings).toBe(0);
    });

    it('should require authentication', async () => {
      const res = await request
        .get('/api/v1/ca/firms/me/dashboard');

      expect(res.status).toBe(401);
    });
  });
});
