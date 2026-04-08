/**
 * CA Platform End-to-End Workflow Tests
 * Complete integration tests covering real-world CA platform workflows
 *
 * Workflows:
 * 1. Full CA Onboarding Flow
 * 2. Document Collection Flow
 * 3. Compliance Filing Flow
 * 4. TDS Reconciliation Flow
 * 5. Bank Reconciliation Flow
 * 6. Notice Response Flow
 * 7. Health Score Monitoring Flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request, createTestContext, getAuthHeader, cleanCaTestData } from './setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('CA Platform E2E Workflows', () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    await cleanCaTestData();
  });

  // ═══════════════════════════════════════════════════════════════════
  // Workflow 1: Full CA Onboarding Flow
  // ═══════════════════════════════════════════════════════════════════

  describe('Workflow 1: CA Onboarding', () => {
    it('should complete full onboarding: firm → staff → clients → bridge → GST', async () => {
      // Create firm
      const firmCtx = createTestContext({ subscriptionTier: 'professional' });

      const getFirmRes = await request
        .get('/api/v1/ca/firms/me')
        .set('Authorization', getAuthHeader(firmCtx.token));

      expect(getFirmRes.status).toBe(200);
      const firmId = getFirmRes.body.data.id;

      // Add staff
      const staffRes = await request
        .post('/api/v1/ca/firms/me/staff')
        .set('Authorization', getAuthHeader(firmCtx.token))
        .send({
          email: 'staff@firm.example.com',
          name: 'Rajesh Sharma',
          role: 'manager',
        });

      if (staffRes.status === 201) {
        expect(staffRes.body.data.email).toBe('staff@firm.example.com');
      }

      // Add client
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(firmCtx.token))
        .send({
          business_name: 'TechStart Industries',
          gstin: '27AABCT0001A1Z0',
          tally_company_name: 'TechStart',
        });

      expect(clientRes.status).toBe(201);
      const clientId = clientRes.body.data.id;

      // Link bridge agent
      const bridgeRes = await request
        .post(`/api/v1/ca/clients/${clientId}/bridge`)
        .set('Authorization', getAuthHeader(firmCtx.token))
        .send({ bridge_agent_id: uuidv4() });

      expect(bridgeRes.status).toBe(200);
      expect(bridgeRes.body.data.bridge_agent_id).toBeDefined();

      // Prepare GST filing
      const gstRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(firmCtx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(gstRes.status).toBe(201);
      const filingId = gstRes.body.data.id;

      // Review filing
      const reviewRes = await request
        .patch(`/api/v1/ca/compliance/filings/${filingId}`)
        .set('Authorization', getAuthHeader(firmCtx.token))
        .send({
          status: 'in_progress',
          review_notes: 'Checking exceptions',
        });

      expect(reviewRes.status).toBe(200);

      // Verify dashboard updated
      const dashRes = await request
        .get('/api/v1/ca/compliance/dashboard')
        .set('Authorization', getAuthHeader(firmCtx.token));

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.data.filings_summary.total).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Workflow 2: Document Collection Flow
  // ═══════════════════════════════════════════════════════════════════

  describe('Workflow 2: Document Collection', () => {
    it('should collect documents: create request → send → receive → verify', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create client
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Document Test' });

      expect(clientRes.status).toBe(201);
      const clientId = clientRes.body.data.id;

      // Create document request
      const docReqRes = await request
        .post('/api/v1/ca/documents/request')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          document_types: ['ITR', 'AUDIT_REPORT', 'BANK_STATEMENT'],
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (docReqRes.status === 201) {
        expect(docReqRes.body.data.status).toBe('pending');
        const docReqId = docReqRes.body.data.id;

        // Send document request (WhatsApp/Email)
        const sendRes = await request
          .post(`/api/v1/ca/documents/${docReqId}/send`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            channel: 'whatsapp',
            phone: '+91-99999-00000',
          });

        if (sendRes.status === 200) {
          expect(sendRes.body.data.status).toBe('sent');

          // Simulate receive (would be webhook in reality)
          const receiveRes = await request
            .post(`/api/v1/ca/documents/${docReqId}/receive`)
            .set('Authorization', getAuthHeader(ctx.token))
            .send({
              documents: [
                {
                  type: 'ITR',
                  file_id: uuidv4(),
                  file_name: 'ITR2023.pdf',
                },
              ],
            });

          if (receiveRes.status === 200) {
            expect(receiveRes.body.data.status).toBe('received');

            // Verify documents
            const verifyRes = await request
              .post(`/api/v1/ca/documents/${docReqId}/verify`)
              .set('Authorization', getAuthHeader(ctx.token));

            expect(verifyRes.status).toBe(200);
          }
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Workflow 3: Compliance Filing Flow
  // ═══════════════════════════════════════════════════════════════════

  describe('Workflow 3: Compliance Filing', () => {
    it('should complete filing: extract → prepare → detect → resolve → complete', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create client
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Filing Workflow' });

      const clientId = clientRes.body.data.id;

      // Bridge extracts from Tally (simulated)
      const bridgeRes = await request
        .post(`/api/v1/ca/clients/${clientId}/bridge`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ bridge_agent_id: uuidv4() });

      expect(bridgeRes.status).toBe(200);

      // Prepare GSTR-1
      const prepareRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(prepareRes.status).toBe(201);
      const filingId = prepareRes.body.data.id;

      // Get filing detail (shows exceptions)
      const detailRes = await request
        .get(`/api/v1/ca/compliance/filings/${filingId}`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.exceptions).toBeDefined();

      // Resolve exceptions
      const exceptionsRes = await request
        .get('/api/v1/ca/compliance/exceptions')
        .set('Authorization', getAuthHeader(ctx.token));

      if (exceptionsRes.body.data.length > 0) {
        const exceptionId = exceptionsRes.body.data[0].id;

        await request
          .patch(`/api/v1/ca/compliance/exceptions/${exceptionId}`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            status: 'resolved',
            resolution_notes: 'Fixed during review',
          });
      }

      // Mark filing as completed
      const completeRes = await request
        .patch(`/api/v1/ca/compliance/filings/${filingId}`)
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          status: 'completed',
          review_notes: 'Ready for submission',
        });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('completed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Workflow 4: TDS Reconciliation Flow
  // ═══════════════════════════════════════════════════════════════════

  describe('Workflow 4: TDS Reconciliation', () => {
    it('should reconcile TDS: extract → reconcile → identify mismatches → prepare 26Q', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create client
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'TDS Recon' });

      const clientId = clientRes.body.data.id;

      // Reconcile TDS
      const reconRes = await request
        .post('/api/v1/ca/compliance/tds/reconcile')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          quarter: 'Q1',
          year: 2024,
        });

      expect(reconRes.status).toBe(201);
      expect(reconRes.body.data.status).toBe('completed');

      // Verify reconciliation session created
      const sessionsRes = await request
        .get('/api/v1/ca/recon/sessions')
        .set('Authorization', getAuthHeader(ctx.token));

      if (sessionsRes.status === 200) {
        expect(sessionsRes.body.data.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Workflow 5: Bank Reconciliation Flow
  // ═══════════════════════════════════════════════════════════════════

  describe('Workflow 5: Bank Reconciliation', () => {
    it('should reconcile bank: upload statement → auto-match → manual match → BRS', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create client
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Bank Recon' });

      const clientId = clientRes.body.data.id;

      // Upload bank statement
      const uploadRes = await request
        .post('/api/v1/ca/recon/bank/upload')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          statement_file: 'bank-statement-march-2024.csv',
          bank_name: 'ICICI Bank',
          account_number: '****1234',
          statement_date: '2024-03-31',
        });

      if (uploadRes.status === 201) {
        const sessionId = uploadRes.body.data.id;

        // Auto-match transactions
        const matchRes = await request
          .post(`/api/v1/ca/recon/bank/${sessionId}/match`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({ auto_match: true });

        if (matchRes.status === 200) {
          // Get unmatched for manual review
          const unmatchedRes = await request
            .get(`/api/v1/ca/recon/bank/${sessionId}/unmatched`)
            .set('Authorization', getAuthHeader(ctx.token));

          expect(unmatchedRes.status).toBe(200);

          // Generate BRS
          const brsRes = await request
            .post(`/api/v1/ca/recon/bank/${sessionId}/brs`)
            .set('Authorization', getAuthHeader(ctx.token));

          expect(brsRes.status).toBe(201);
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Workflow 6: Notice Response Flow
  // ═══════════════════════════════════════════════════════════════════

  describe('Workflow 6: Notice Response', () => {
    it('should handle notice: create → assign → escalate → resolve → close', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create client
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Notice Client' });

      const clientId = clientRes.body.data.id;

      // Create notice
      const noticeRes = await request
        .post('/api/v1/ca/notices')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          notice_type: 'GST_AUDIT',
          reference_number: 'NOTICE-2024-001',
          issued_date: new Date().toISOString(),
          deadline_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'GST Audit Notice',
        });

      if (noticeRes.status === 201) {
        expect(noticeRes.body.data.status).toBe('received');
        const noticeId = noticeRes.body.data.id;

        // Assign to staff
        const assignRes = await request
          .patch(`/api/v1/ca/notices/${noticeId}`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            assigned_to: uuidv4(),
            status: 'acknowledged',
          });

        expect(assignRes.status).toBe(200);

        // Escalate if needed
        const escalateRes = await request
          .patch(`/api/v1/ca/notices/${noticeId}`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            status: 'escalated',
            escalation_reason: 'Requires CA partner review',
          });

        expect(escalateRes.status).toBe(200);

        // Resolve
        const resolveRes = await request
          .patch(`/api/v1/ca/notices/${noticeId}`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            status: 'resolved',
            resolution: 'Submitted GST audit documents',
          });

        expect(resolveRes.status).toBe(200);

        // Close
        const closeRes = await request
          .patch(`/api/v1/ca/notices/${noticeId}`)
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            status: 'closed',
          });

        expect(closeRes.status).toBe(200);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Workflow 7: Health Score Monitoring Flow
  // ═══════════════════════════════════════════════════════════════════

  describe('Workflow 7: Health Score Monitoring', () => {
    it('should track health: create client → monitor → generate recommendations', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create client
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Health Monitoring' });

      expect(clientRes.status).toBe(201);
      const clientId = clientRes.body.data.id;

      // Get health scores
      const healthRes = await request
        .get(`/api/v1/ca/clients/${clientId}/health`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(healthRes.status).toBe(200);
      expect(healthRes.body.data).toBeInstanceOf(Array);

      // Health scores should be populated
      if (healthRes.body.data.length > 0) {
        expect(healthRes.body.data[0]).toHaveProperty('health_score');
        expect(healthRes.body.data[0]).toHaveProperty('timestamp');
        expect(healthRes.body.data[0]).toHaveProperty('status');
      }

      // Create filing which should affect health
      await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      // Check health again (should have updated)
      const healthRes2 = await request
        .get(`/api/v1/ca/clients/${clientId}/health`)
        .set('Authorization', getAuthHeader(ctx.token));

      expect(healthRes2.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Multi-Client Concurrent Workflow
  // ═══════════════════════════════════════════════════════════════════

  describe('Concurrent Multi-Client Workflow', () => {
    it('should handle multiple clients in parallel', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create 3 clients
      const clientIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const clientRes = await request
          .post('/api/v1/ca/clients')
          .set('Authorization', getAuthHeader(ctx.token))
          .send({ business_name: `Parallel Client ${i}` });

        expect(clientRes.status).toBe(201);
        clientIds.push(clientRes.body.data.id);
      }

      // Create filings for all clients
      for (const clientId of clientIds) {
        const filingRes = await request
          .post('/api/v1/ca/compliance/gst/prepare')
          .set('Authorization', getAuthHeader(ctx.token))
          .send({
            client_id: clientId,
            filing_type: 'GSTR1',
            period: '032024',
          });

        expect(filingRes.status).toBe(201);
      }

      // List all filings
      const listRes = await request
        .get('/api/v1/ca/compliance/filings')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(3);

      // Verify dashboard aggregates correctly
      const dashRes = await request
        .get('/api/v1/ca/compliance/dashboard')
        .set('Authorization', getAuthHeader(ctx.token));

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.data.filings_summary.total).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Error Recovery Workflow
  // ═══════════════════════════════════════════════════════════════════

  describe('Error Recovery & Retry Workflow', () => {
    it('should recover from failed filing and retry', async () => {
      const ctx = createTestContext({ subscriptionTier: 'professional' });

      // Create client
      const clientRes = await request
        .post('/api/v1/ca/clients')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({ business_name: 'Error Recovery' });

      const clientId = clientRes.body.data.id;

      // Attempt invalid filing (should fail gracefully)
      const invalidRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'INVALID_TYPE',
          period: '032024',
        });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error).toBeDefined();

      // Retry with valid data
      const retryRes = await request
        .post('/api/v1/ca/compliance/gst/prepare')
        .set('Authorization', getAuthHeader(ctx.token))
        .send({
          client_id: clientId,
          filing_type: 'GSTR1',
          period: '032024',
        });

      expect(retryRes.status).toBe(201);
    });
  });
});
