/**
 * CA Subscription & Feature Gate Integration Tests
 * Tests for subscription tiers, feature availability, and access control
 *
 * Coverage:
 * - GET /api/v1/ca/subscription/tiers — List all tiers
 * - GET /api/v1/ca/subscription/features — Features for current tier
 * - POST /api/v1/ca/subscription/upgrade — Request upgrade
 * - Feature gate enforcement across all endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request, createTestContext, getAuthHeader, cleanCaTestData } from './setup.js';

describe('CA Subscription & Feature Gates', () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    await cleanCaTestData();
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/subscription/tiers — List all tiers
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/subscription/tiers', () => {
    it('should return all subscription tiers', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/subscription/tiers')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should include trial tier', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/subscription/tiers')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      const trialTier = res.body.data.find((t: any) => t.name === 'trial');
      expect(trialTier).toBeDefined();
      expect(trialTier.price).toBe(0);
      expect(trialTier.client_limit).toBe(1);
    });

    it('should include starter tier', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/subscription/tiers')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      const starterTier = res.body.data.find((t: any) => t.name === 'starter');
      expect(starterTier).toBeDefined();
      expect(starterTier.client_limit).toBe(10);
    });

    it('should include professional tier', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/subscription/tiers')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      const proTier = res.body.data.find((t: any) => t.name === 'professional');
      expect(proTier).toBeDefined();
      expect(proTier.client_limit).toBe(100);
    });

    it('should include enterprise tier', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/subscription/tiers')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      const enterpriseTier = res.body.data.find((t: any) => t.name === 'enterprise');
      expect(enterpriseTier).toBeDefined();
      expect(enterpriseTier.client_limit).toBeGreaterThan(100);
    });

    it('should require authentication', async () => {
      const res = await request
        .get('/api/v1/ca/subscription/tiers');

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/subscription/features — List features for tier
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/subscription/features', () => {
    it('should return features for trial tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      const res = await request
        .get('/api/v1/ca/subscription/features')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      // Trial should have F1 (Bridge)
      expect(res.body.data.some((f: any) => f.code === 'F1')).toBe(true);
      // Trial should NOT have F2 (GST)
      expect(res.body.data.some((f: any) => f.code === 'F2')).toBe(false);
    });

    it('should return features for starter tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'starter' });

      const res = await request
        .get('/api/v1/ca/subscription/features')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      // Starter should have F1, F2
      expect(res.body.data.some((f: any) => f.code === 'F1')).toBe(true);
      expect(res.body.data.some((f: any) => f.code === 'F2')).toBe(true);
      // Should NOT have F3+ (TDS, etc)
      expect(res.body.data.some((f: any) => f.code === 'F3')).toBe(false);
    });

    it('should return features for professional tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const res = await request
        .get('/api/v1/ca/subscription/features')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      // Professional should have F1-F6+
      expect(res.body.data.some((f: any) => f.code === 'F1')).toBe(true);
      expect(res.body.data.some((f: any) => f.code === 'F2')).toBe(true);
      expect(res.body.data.some((f: any) => f.code === 'F3')).toBe(true);
      expect(res.body.data.some((f: any) => f.code === 'F6')).toBe(true);
    });

    it('should return all features for enterprise tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'enterprise' });

      const res = await request
        .get('/api/v1/ca/subscription/features')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      // Enterprise should have all features F1-F14+
      expect(res.body.data.length).toBeGreaterThan(10);
    });

    it('should require authentication', async () => {
      const res = await request
        .get('/api/v1/ca/subscription/features');

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/ca/subscription/upgrade — Request upgrade
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /api/v1/ca/subscription/upgrade', () => {
    it('should request upgrade from trial to starter', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      const res = await request
        .post('/api/v1/ca/subscription/upgrade')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ target_tier: 'starter' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.target_tier).toBe('starter');
    });

    it('should request upgrade from starter to professional', async () => {
      const ctx = createTestContext({ subscriptionTier: 'starter' });

      const res = await request
        .post('/api/v1/ca/subscription/upgrade')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ target_tier: 'professional' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending');
    });

    it('should reject downgrade request', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const res = await request
        .post('/api/v1/ca/subscription/upgrade')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ target_tier: 'starter' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FC_ERR_VALIDATION_FAILED');
    });

    it('should reject invalid target tier', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      const res = await request
        .post('/api/v1/ca/subscription/upgrade')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ target_tier: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE GATE ENFORCEMENT TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe('Feature Gate: F1 (Bridge) — Trial+', () => {
    it('trial can create clients (F1)', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      const res = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Test Client' });

      expect(res.status).toBe(201);
    });

    it('trial can link bridge agent (F1)', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Bridge Test' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post(`/api/v1/ca/clients/${clientId}/bridge`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ bridge_agent_id: '123' });

      expect(res.status).toBe(200);
    });
  });

  describe('Feature Gate: F2 (GST Filing) — Starter+', () => {
    it('trial cannot prepare GST filing (F2)', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'GST Test' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FC_ERR_FEATURE_DISABLED');
    });

    it('starter can prepare GST filing (F2)', async () => {
      const ctx = createTestContext({ subscriptionTier: 'starter' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'GST Test' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('Feature Gate: F3 (TDS) — Professional+', () => {
    it('starter cannot reconcile TDS (F3)', async () => {
      const ctx = createTestContext({ subscriptionTier: 'starter' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'TDS Test' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post('/api/v1/ca/compliance/tds/reconcile')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          quarter: 'Q1',
          year: 2024,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FC_ERR_FEATURE_DISABLED');
    });

    it('professional can reconcile TDS (F3)', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'TDS Test' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post('/api/v1/ca/compliance/tds/reconcile')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          quarter: 'Q1',
          year: 2024,
        });

      expect(res.status).toBe(201);
    });
  });

  describe('Feature Gate: Client Limits', () => {
    it('trial can have 1 client', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      // Create first client
      const res1 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 1' });

      expect(res1.status).toBe(201);

      // Try to create second
      const res2 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 2' });

      expect(res2.status).toBe(403);
      expect(res2.body.error.code).toBe('FC_ERR_COMPLIANCE_LIMIT_EXCEEDED');
    });

    it('starter can have 10 clients', async () => {
      const ctx = createTestContext({ subscriptionTier: 'starter' });

      // Create 10 clients
      for (let i = 0; i < 10; i++) {
        const res = await request
          .post('/api/v1/ca/clients')
          .set('Authorization', getAuthHeader(ctx.token))
          .send({ business_name: `Client ${i}` });

        expect(res.status).toBe(201);
      }

      // Try 11th
      const resExtra = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 11' });

      expect(resExtra.status).toBe(403);
    });

    it('professional can have 100 clients', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create 100 clients (batch for performance)
      for (let i = 0; i < 10; i++) {
        const res = await request
          .post('/api/v1/ca/clients')
          .set('Authorization', getAuthHeader(ctx.token))
          .send({ business_name: `Client ${i}` });

        expect(res.status).toBe(201);
      }

      // Should still be able to create more up to 100
      const res = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Extra Client' });

      expect(res.status).toBe(201);
    });
  });

  describe('Feature Gate: Dashboard Access', () => {
    it('all tiers can access compliance dashboard', async () => {
      for (const tier of ['trial', 'starter', 'professional', 'enterprise'] as const) {
        const ctx = createTestContext({ subscriptionTier: tier });

        const res = await request
          .get('/api/v1/ca/compliance/dashboard')
          .set('Authorization', getAuthHeader(ctx.token));

        expect(res.status).toBe(200);
      }
    });

    it('all tiers can access firm dashboard', async () => {
      for (const tier of ['trial', 'starter', 'professional', 'enterprise'] as const) {
        const ctx = createTestContext({ subscriptionTier: tier });

        const res = await request
          .get('/api/v1/ca/firms/me/dashboard')
          .set('Authorization', getAuthHeader(ctx.token));

        expect(res.status).toBe(200);
      }
    });
  });

  describe('Feature Gate: Subscription Get', () => {
    it('all tiers can view own subscription details', async () => {
      for (const tier of ['trial', 'starter', 'professional', 'enterprise'] as const) {
        const ctx = createTestContext({ subscriptionTier: tier });

        const res = await request
          .get('/api/v1/ca/firms/me/subscription')
          .set('Authorization', getAuthHeader(ctx.token));

        expect(res.status).toBe(200);
        expect(res.body.data.subscription_tier).toBe(tier);
      }
    });
  });
});
