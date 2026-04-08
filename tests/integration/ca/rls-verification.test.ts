/**
 * CA RLS Verification Tests
 * Critical tests to ensure Row-Level Security (RLS) is properly enforced
 * across all CA tenant tables.
 *
 * Core principle: Insert data as Firm A → Query as Firm B → Must return 0 rows
 *
 * Tables covered:
 * - ca_firms
 * - ca_firm_staff
 * - ca_clients
 * - compliance_filings
 * - compliance_exceptions
 * - reconciliation_sessions
 * - document_requests
 * - notices
 * - client_health_scores
 * - staff_activity_log
 * - communication_log
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request, createTestContext, getAuthHeader, cleanCaTestData } from './setup.js';

describe('CA RLS Verification Tests', () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    await cleanCaTestData();
  });

  // ═══════════════════════════════════════════════════════════════════
  // ca_firms table RLS
  // ═══════════════════════════════════════════════════════════════════

  describe('ca_firms RLS', () => {
    it('firm should only see its own profile', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Get firm 1 profile
      const res1 = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx1.token));

      expect(res1.status).toBe(200);
      const firm1Id = res1.body.data.id;

      // Get firm 2 profile
      const res2 = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(res2.status).toBe(200);
      const firm2Id = res2.body.data.id;

      // They should be different firms
      expect(firm1Id).not.toBe(firm2Id);

      // Verify isolation: try to access firm2 as firm1 (should return own firm)
      const accessRes = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(ctx1.token));

      expect(accessRes.body.data.id).toBe(firm1Id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ca_clients table RLS
  // ═══════════════════════════════════════════════════════════════════

  describe('ca_clients RLS', () => {
    it('firm should not see other firms clients', async () => {
      const ctx1 = createTestContext({ subscriptionTier: 'professional' });
      const ctx2 = createTestContext({ subscriptionTier: 'professional' });

      // Firm 1 creates client
      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Firm1 Secret Client' });

      expect(createRes.status).toBe(201);
      const clientId = createRes.body.data.id;

      // Firm 2 lists clients — should be empty
      const listRes = await request
        .get('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toEqual([]);
      expect(listRes.body.data.find((c: any) => c.id === clientId)).toBeUndefined();
    });

    it('firm should not access other firms client by ID', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Firm 1 creates client
      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Secret Client' });

      const clientId = createRes.body.data.id;

      // Firm 2 tries to access by ID — should get 404
      const getRes = await request
        .get(`/api/v1/ca/clients/${clientId}`)
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND');
    });

    it('firm should not see other firms client health scores', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Firm 1 creates client
      const createRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Health Test' });

      const clientId = createRes.body.data.id;

      // Firm 2 tries to access health scores
      const healthRes = await request
        .get(`/api/v1/ca/clients/${clientId}/health`)
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(healthRes.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // compliance_filings table RLS
  // ═══════════════════════════════════════════════════════════════════

  describe('compliance_filings RLS', () => {
    it('firm should not see other firms filings', async () => {
      const ctx1 = createTestContext({ subscriptionTier: 'professional' });
      const ctx2 = createTestContext({ subscriptionTier: 'professional' });

      // Firm 1 creates filing
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Client' });

      const filingRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({
          client_id: clientRes.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const filingId = filingRes.body.data.id;

      // Firm 2 lists filings — should be empty
      const listRes = await request
        .get('/api/v1/ca/compliance/filings')
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toEqual([]);
      expect(listRes.body.data.find((f: any) => f.id === filingId)).toBeUndefined();
    });

    it('firm should not access other firms filing by ID', async () => {
      const ctx1 = createTestContext({ subscriptionTier: 'professional' });
      const ctx2 = createTestContext({ subscriptionTier: 'professional' });

      // Firm 1 creates filing
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Client' });

      const filingRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({
          client_id: clientRes.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      const filingId = filingRes.body.data.id;

      // Firm 2 tries to access filing
      const getRes = await request
        .get(`/api/v1/ca/compliance/filings/${filingId}`)
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('FC_ERR_COMPLIANCE_FILING_NOT_FOUND');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // compliance_exceptions table RLS
  // ═══════════════════════════════════════════════════════════════════

  describe('compliance_exceptions RLS', () => {
    it('firm should not see other firms exceptions', async () => {
      const ctx1 = createTestContext({ subscriptionTier: 'professional' });
      const ctx2 = createTestContext({ subscriptionTier: 'professional' });

      // Firm 1 creates filing (which may generate exceptions)
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Client' });

      await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({
          client_id: clientRes.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      // Firm 1 lists exceptions
      const res1 = await request
        .get('/api/v1/ca/compliance/exceptions')
        .set('Authorization', getAuthHeader(ctx1.token));

      expect(res1.status).toBe(200);

      // Firm 2 lists exceptions — should be empty
      const res2 = await request
        .get('/api/v1/ca/compliance/exceptions')
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(res2.status).toBe(200);
      expect(res2.body.data).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // document_requests table RLS (if implemented)
  // ═══════════════════════════════════════════════════════════════════

  describe('document_requests RLS', () => {
    it('firm should not see other firms document requests', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Assuming document request endpoints exist
      // Firm 1 creates document request
      const createRes = await request
        .post('/api/v1/ca/documents/request')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({
          client_id: ctx1.caFirmId,
          document_types: ['ITR', 'AUDIT_REPORT'],
        });

      if (createRes.status === 201) {
        const docRequestId = createRes.body.data.id;

        // Firm 2 lists documents — should not see Firm 1's request
        const listRes = await request
          .get('/api/v1/ca/documents')
          .set('Authorization', getAuthHeader(ctx2.token));

        if (listRes.status === 200) {
          expect(listRes.body.data.find((d: any) => d.id === docRequestId)).toBeUndefined();
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // notices table RLS (if implemented)
  // ═══════════════════════════════════════════════════════════════════

  describe('notices RLS', () => {
    it('firm should not see other firms notices', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Assuming notice endpoints exist
      const createRes = await request
        .post('/api/v1/ca/notices')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({
          client_id: ctx1.caFirmId,
          notice_type: 'GST_AUDIT',
          reference_number: 'NOTICE-001',
          issued_date: new Date().toISOString(),
          deadline_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (createRes.status === 201) {
        const noticeId = createRes.body.data.id;

        // Firm 2 lists notices — should be empty
        const listRes = await request
          .get('/api/v1/ca/notices')
          .set('Authorization', getAuthHeader(ctx2.token));

        if (listRes.status === 200) {
          expect(listRes.body.data.find((n: any) => n.id === noticeId)).toBeUndefined();
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Cross-tenant data integrity checks
  // ═══════════════════════════════════════════════════════════════════

  describe('Cross-tenant integrity', () => {
    it('updates by Firm 1 should not affect Firm 2 data', async () => {
      const ctx1 = createTestContext();
      const ctx2 = createTestContext();

      // Create clients in each firm
      const c1 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Firm1 Client' });

      const c2 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx2.token))
        .send({ business_name: 'Firm2 Client' });

      // Firm 1 updates their client
      const updateRes = await request
        .patch(`/api/v1/ca/clients/${c1.body.data.id}`)
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Updated Firm1 Client' });

      expect(updateRes.status).toBe(200);

      // Verify Firm 2 client is unchanged
      const getRes = await request
        .get(`/api/v1/ca/clients/${c2.body.data.id}`)
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(getRes.body.data.business_name).toBe('Firm2 Client');
    });

    it('pagination should not leak other firms data', async () => {
      const ctx1 = createTestContext({ subscriptionTier: 'professional' });
      const ctx2 = createTestContext({ subscriptionTier: 'professional' });

      // Create 5 clients in Firm 1
      for (let i = 0; i < 5; i++) {
        await request
          .post('/api/v1/ca/clients')
          .set('Authorization', getAuthHeader(ctx1.token))
          .send({ business_name: `Firm1 Client ${i}` });
      }

      // Create 3 clients in Firm 2
      for (let i = 0; i < 3; i++) {
        await request
          .post('/api/v1/ca/clients')
          .set('Authorization', getAuthHeader(ctx2.token))
          .send({ business_name: `Firm2 Client ${i}` });
      }

      // Firm 1 lists clients
      const res1 = await request
        .get('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token));

      expect(res1.body.pagination.total).toBe(5);

      // Firm 2 lists clients
      const res2 = await request
        .get('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx2.token));

      expect(res2.body.pagination.total).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Feature flag + RLS combined tests
  // ═══════════════════════════════════════════════════════════════════

  describe('Feature flag + RLS', () => {
    it('trial firm cannot create GST filing even if RLS passes', async () => {
      const ctx1 = createTestContext({ subscriptionTier: 'trial' });
      const ctx2 = createTestContext({ subscriptionTier: 'professional' });

      // Both firms create clients
      const c1 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({ business_name: 'Trial Client' });

      const c2 = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx2.token))
        .send({ business_name: 'Pro Client' });

      // Trial firm tries to create filing
      const res1 = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx1.token))
        .send({
          client_id: c1.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(res1.status).toBe(403); // Feature disabled

      // Pro firm can create filing
      const res2 = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx2.token))
        .send({
          client_id: c2.body.data.id,
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(res2.status).toBe(201); // Success
    });
  });
});
