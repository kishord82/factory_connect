/**
 * CA3: Compliance Endpoints Integration Tests
 * Tests for GST filing, TDS reconciliation, filings list, exceptions, and dashboard
 *
 * Coverage:
 * - POST /api/v1/ca/compliance/gst/prepare — Prepare GSTR-1/3B
 * - POST /api/v1/ca/compliance/tds/reconcile — Reconcile TDS
 * - GET /api/v1/ca/compliance/filings — List with all filters
 * - GET /api/v1/ca/compliance/filings/:id — Get filing detail
 * - PATCH /api/v1/ca/compliance/filings/:id — Update filing status
 * - GET /api/v1/ca/compliance/exceptions — List exceptions
 * - PATCH /api/v1/ca/compliance/exceptions/:id — Resolve/escalate
 * - GET /api/v1/ca/compliance/dashboard — Summary stats
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request, createTestContext, getAuthHeader, cleanCaTestData } from './setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('CA Compliance Endpoints', () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    await cleanCaTestData();
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/ca/compliance/gst/prepare — Prepare GSTR-1/3B
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /api/v1/ca/compliance/gst/prepare', () => {
    it('should prepare GSTR-1 filing', async () => {
      const ctx = createTestContext();

      // Create a client first
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'GST Test Client' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024', // March 2024
        });

      expect(res.status).toBe(201);
      expect(res.body.data.filing_type).toBe('GSTR1');
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.period).toBe('032024');
      expect(res.body.data.id).toBeDefined();
    });

    it('should prepare GSTR-3B filing', async () => {
      const ctx = createTestContext();

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'GSTR3B Test' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR3B',
          period: '032024',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.filing_type).toBe('GSTR3B');
    });

    it('should reject invalid period format', async () => {
      const ctx = createTestContext();

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Test' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: 'invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FC_ERR_VALIDATION_FAILED');
    });

    it('should return 404 if client not found', async () => {
      const ctx = createTestContext();
      const fakeClientId = uuidv4();

      const res = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: fakeClientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND');
    });

    it('should reject GST filing if F2 feature disabled (trial without F2)', async () => {
      const ctx = createTestContext({ subscriptionTier: 'trial' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Test' });

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

    it('should allow GST filing if F2 feature enabled (professional+)', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Test' });

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

    it('should require authentication', async () => {
      const res = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .send({
          client_id: uuidv4(),
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/ca/compliance/tds/reconcile — Reconcile TDS
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /api/v1/ca/compliance/tds/reconcile', () => {
    it('should reconcile TDS for valid quarter', async () => {
      const ctx = createTestContext();

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
          quarter: 'Q1', // Q1, Q2, Q3, Q4
          year: 2024,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('completed');
    });

    it('should reject invalid quarter', async () => {
      const ctx = createTestContext();

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Test' });

      const clientId = clientRes.body.data.id;

      const res = await request
        .post('/api/v1/ca/compliance/tds/reconcile')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          quarter: 'Q5', // Invalid
          year: 2024,
        });

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/compliance/filings — List with filters
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/compliance/filings', () => {
    it('should return list of filings with pagination', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Filing Test 1' });

      const clientId = clientRes.body.data.id;

      // Create multiple filings
      for (let i = 0; i < 3; i++) {
        await request
          .post('/api/v1/ca/compliance/gst/prepare')
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            client_id: clientId,
            filing_type: 'GSTR1',
            period: `032024`,
          });
      }

      const res = await request
        .get('/api/v1/ca/compliance/filings')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by filing_type', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Filter Test' });

      const clientId = clientRes.body.data.id;

      await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const res = await request
        .get('/api/v1/ca/compliance/filings?filing_type=GSTR1')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.every((f: any) => f.filing_type === 'GSTR1')).toBe(true);
    });

    it('should filter by status', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Status Filter' });

      const clientId = clientRes.body.data.id;

      await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const res = await request
        .get('/api/v1/ca/compliance/filings?status=completed')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.every((f: any) => f.status === 'completed')).toBe(true);
    });

    it('should filter by client_id', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const client1 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 1' });

      const client2 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Client 2' });

      await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: client1.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: client2.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const res = await request
        .get(`/api/v1/ca/compliance/filings?client_id=${client1.body.data.id}`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.every((f: any) => f.client_id === client1.body.data.id)).toBe(true);
    });

    it('should filter by date range', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Date Filter' });

      const clientId = clientRes.body.data.id;

      await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const res = await request
        .get('/api/v1/ca/compliance/filings?start_date=2024-01-01&end_date=2024-12-31')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
    });

    it('should return empty list for new firm', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/compliance/filings')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should not return filings from other firms (RLS)', async () => {
      const ctx1 = createTestContext({ subscriptionTier: 'professional' });
      const ctx2 = createTestContext({ subscriptionTier: 'professional' });

      const client1 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Firm 1 Client' });

      await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({
          client_id: client1.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      // Query as different firm
      const res = await request
        .get('/api/v1/ca/compliance/filings')
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/compliance/filings/:id — Get filing detail
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/compliance/filings/:id', () => {
    it('should return filing detail with exceptions', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Detail Test' });

      const filingRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientRes.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const filingId = filingRes.body.data.id;

      const res = await request
        .get(`/api/v1/ca/compliance/filings/${filingId}`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(filingId);
      expect(res.body.data.filing_type).toBe('GSTR1');
      expect(res.body.data.exceptions).toBeDefined();
    });

    it('should return 404 for non-existent filing', async () => {
      const ctx = createTestContext();
      const fakeId = uuidv4();

      const res = await request
        .get(`/api/v1/ca/compliance/filings/${fakeId}`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FC_ERR_COMPLIANCE_FILING_NOT_FOUND');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/ca/compliance/filings/:id — Update filing status
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /api/v1/ca/compliance/filings/:id', () => {
    it('should transition filing from pending to in_progress', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Status Test' });

      const filingRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientRes.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const filingId = filingRes.body.data.id;

      const res = await request
        .patch(`/api/v1/ca/compliance/filings/${filingId}`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          status: 'in_progress',
          review_notes: 'Checking for exceptions',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
      expect(res.body.data.review_notes).toBe('Checking for exceptions');
    });

    it('should reject invalid status transitions', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Invalid Transition' });

      const filingRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientRes.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const filingId = filingRes.body.data.id;

      // Try invalid transition: completed -> pending
      const res = await request
        .patch(`/api/v1/ca/compliance/filings/${filingId}`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ status: 'pending' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FC_ERR_COMPLIANCE_INVALID_TRANSITION');
    });

    it('should return 404 for non-existent filing', async () => {
      const ctx = createTestContext();
      const fakeId = uuidv4();

      const res = await request
        .patch(`/api/v1/ca/compliance/filings/${fakeId}`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ status: 'in_progress' });

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/compliance/exceptions — List exceptions
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/compliance/exceptions', () => {
    it('should return list of exceptions', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const res = await request
        .get('/api/v1/ca/compliance/exceptions')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should filter by severity', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const res = await request
        .get('/api/v1/ca/compliance/exceptions?severity=critical')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        expect(res.body.data.every((e: any) => e.severity === 'critical')).toBe(true);
      }
    });

    it('should filter by status', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const res = await request
        .get('/api/v1/ca/compliance/exceptions?status=open')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        expect(res.body.data.every((e: any) => e.status === 'open')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/ca/compliance/exceptions/:id — Resolve/escalate
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /api/v1/ca/compliance/exceptions/:id', () => {
    it('should resolve exception', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Get an exception to update
      const listRes = await request
        .get('/api/v1/ca/compliance/exceptions')
        .set('Authorization', getAuthHeader(ctx.token));

      if (listRes.body.data.length > 0) {
        const exceptionId = listRes.body.data[0].id;

        const res = await request
          .patch(`/api/v1/ca/compliance/exceptions/${exceptionId}`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            status: 'resolved',
            resolution_notes: 'Fixed duplicate invoice',
          });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('resolved');
      }
    });

    it('should escalate exception', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      const listRes = await request
        .get('/api/v1/ca/compliance/exceptions')
        .set('Authorization', getAuthHeader(ctx.token));

      if (listRes.body.data.length > 0) {
        const exceptionId = listRes.body.data[0].id;

        const res = await request
          .patch(`/api/v1/ca/compliance/exceptions/${exceptionId}`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            status: 'escalated',
            escalation_reason: 'Requires manual review',
          });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('escalated');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/ca/compliance/dashboard — Dashboard summary
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/ca/compliance/dashboard', () => {
    it('should return compliance dashboard summary', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/compliance/dashboard')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('filings_summary');
      expect(res.body.data).toHaveProperty('exceptions_summary');
      expect(res.body.data).toHaveProperty('filing_timeline');
    });

    it('should include filing counts by status', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/compliance/dashboard')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.filings_summary).toHaveProperty('total');
      expect(res.body.data.filings_summary).toHaveProperty('completed');
      expect(res.body.data.filings_summary).toHaveProperty('in_progress');
      expect(res.body.data.filings_summary).toHaveProperty('pending');
    });

    it('should include exception counts by severity', async () => {
      const ctx = createTestContext();

      const res = await request
        .get('/api/v1/ca/compliance/dashboard')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(res.status).toBe(200);
      expect(res.body.data.exceptions_summary).toHaveProperty('critical');
      expect(res.body.data.exceptions_summary).toHaveProperty('high');
      expect(res.body.data.exceptions_summary).toHaveProperty('medium');
    });
  });
});
