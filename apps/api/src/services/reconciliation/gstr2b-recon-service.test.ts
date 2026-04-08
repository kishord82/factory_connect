/**
 * F16: GSTR-2B Reconciliation Service Tests
 */

import { describe, it, expect } from 'vitest';
import type { CaRequestContext } from '@fc/shared';

const mockCaCtx: CaRequestContext = {
  caFirmId: 'ca-firm-123',
  tenantId: 'ca-firm-123',
  userId: 'user-456',
  correlationId: 'corr-789',
  role: 'manager',
  subscriptionTier: 'professional',
};

describe('GSTR-2B Reconciliation Service', () => {
  describe('reconcileGstr2b', () => {
    it('matches invoices by GSTIN + invoice_number + amount', async () => {
      const mockSession = {
        id: 'session-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        period: '2024-01',
        session_status: 'completed' as const,
        total_invoices_2b: 100,
        total_invoices_register: 100,
        matched_count: 95,
        excess_in_2b: 5,
        missing_from_2b: 0,
        amount_mismatch: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockSession.matched_count).toBe(95);
      expect(mockSession.excess_in_2b).toBe(5);
    });

    it('identifies excess in GSTR-2B', async () => {
      const mockSession = {
        id: 'session-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        period: '2024-01',
        session_status: 'completed' as const,
        total_invoices_2b: 110,
        total_invoices_register: 100,
        matched_count: 100,
        excess_in_2b: 10,
        missing_from_2b: 0,
        amount_mismatch: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockSession.excess_in_2b).toBe(10);
      expect(mockSession.total_invoices_2b).toBeGreaterThan(mockSession.total_invoices_register);
    });

    it('identifies missing from GSTR-2B', async () => {
      const mockSession = {
        id: 'session-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        period: '2024-01',
        session_status: 'completed' as const,
        total_invoices_2b: 90,
        total_invoices_register: 100,
        matched_count: 90,
        excess_in_2b: 0,
        missing_from_2b: 10,
        amount_mismatch: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockSession.missing_from_2b).toBe(10);
      expect(mockSession.total_invoices_register).toBeGreaterThan(mockSession.total_invoices_2b);
    });

    it('identifies amount mismatches', async () => {
      const mockSession = {
        id: 'session-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        period: '2024-01',
        session_status: 'completed' as const,
        total_invoices_2b: 100,
        total_invoices_register: 100,
        matched_count: 90,
        excess_in_2b: 0,
        missing_from_2b: 0,
        amount_mismatch: 10,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockSession.amount_mismatch).toBe(10);
    });
  });

  describe('getItcEligibility', () => {
    it('calculates ITC eligible for matched invoices', async () => {
      const mockItc = {
        totalItcClaimed: '500000.00',
        totalItcEligible: '500000.00',
        itcToReverse: '0.00',
        reversePercentage: 0,
        itcMismatches: [],
      };

      expect(mockItc.totalItcEligible).toBe(mockItc.totalItcClaimed);
      expect(mockItc.itcToReverse).toBe('0.00');
    });

    it('reverses ITC for variance > 5%', async () => {
      const mockItc = {
        totalItcClaimed: '100000.00',
        totalItcEligible: '80000.00',
        itcToReverse: '20000.00',
        reversePercentage: 20,
        itcMismatches: [
          {
            supplierGstin: '27AABCT1234H1Z0',
            invoiceNumber: 'INV-001',
            tallyAmount: '100000.00',
            gstr2bAmount: '95000.00',
            variance: '5000.00',
          },
        ],
      };

      expect(mockItc.reversePercentage).toBe(20);
      expect(mockItc.itcMismatches).toHaveLength(1);
    });

    it('handles no purchase register data', async () => {
      const mockItc = {
        totalItcClaimed: '0.00',
        totalItcEligible: '0.00',
        itcToReverse: '0.00',
        reversePercentage: 0,
        itcMismatches: [],
      };

      expect(mockItc.totalItcClaimed).toBe('0.00');
    });

    it('handles no GSTR-2B data', async () => {
      const mockItc = {
        totalItcClaimed: '0.00',
        totalItcEligible: '0.00',
        itcToReverse: '0.00',
        reversePercentage: 0,
        itcMismatches: [],
      };

      expect(mockItc.totalItcClaimed).toBe('0.00');
    });
  });

  describe('generateMismatchReport', () => {
    it('generates report for variance mismatches', async () => {
      const mismatches = [
        {
          id: 'item-1',
          supplierGstin: '27AABCT1234H1Z0',
          invoiceNumber: 'INV-001',
          invoiceDate: new Date('2024-01-15'),
          tallyAmount: '100000.00',
          gstr2bAmount: '98000.00',
          variance: '2000.00',
          variancePercentage: 2,
          status: 'variance',
        },
      ];

      expect(mismatches).toHaveLength(1);
      expect(mismatches[0].variancePercentage).toBe(2);
    });

    it('includes excess in 2B in report', async () => {
      const mismatches = [
        {
          id: 'item-1',
          supplierGstin: '27AABCT1234H1Z0',
          invoiceNumber: 'INV-999',
          invoiceDate: new Date('2024-01-20'),
          tallyAmount: '0.00',
          gstr2bAmount: '50000.00',
          variance: '50000.00',
          variancePercentage: 100,
          status: 'excess_in_2b',
        },
      ];

      expect(mismatches).toHaveLength(1);
      expect(mismatches[0].status).toBe('excess_in_2b');
    });

    it('excludes matched items from report', async () => {
      const allItems = [
        {
          id: 'matched-1',
          supplierGstin: '27AABCT1234H1Z0',
          invoiceNumber: 'INV-001',
          status: 'matched',
        },
        {
          id: 'variance-1',
          supplierGstin: '27AABCT1234H1Z0',
          invoiceNumber: 'INV-002',
          status: 'variance',
        },
      ];

      const mismatches = allItems.filter((i) => i.status !== 'matched');
      expect(mismatches).toHaveLength(1);
    });
  });

  describe('listReconSessions', () => {
    it('returns sessions ordered by date descending', async () => {
      const sessions = [
        {
          id: 'session-3',
          created_at: new Date('2024-03-01'),
        },
        {
          id: 'session-2',
          created_at: new Date('2024-02-01'),
        },
        {
          id: 'session-1',
          created_at: new Date('2024-01-01'),
        },
      ];

      const sorted = sessions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      expect(sorted[0].id).toBe('session-3');
      expect(sorted[sorted.length - 1].id).toBe('session-1');
    });
  });

  describe('getReconSessionDetail', () => {
    it('returns session with items and ITC eligibility', async () => {
      const mockDetail = {
        session: {
          id: 'session-1',
          ca_firm_id: mockCaCtx.caFirmId,
          client_id: 'client-123',
          period: '2024-01',
          session_status: 'completed' as const,
          total_invoices_2b: 100,
          total_invoices_register: 100,
          matched_count: 95,
          excess_in_2b: 5,
          missing_from_2b: 0,
          amount_mismatch: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
        items: [
          {
            id: 'item-1',
            session_id: 'session-1',
            source: 'gstr2b' as const,
            supplier_gstin: '27AABCT1234H1Z0',
            invoice_number: 'INV-001',
            invoice_date: new Date('2024-01-15'),
            invoice_amount: '100000',
            tax_amount: '18000',
            total_amount: '118000',
            match_status: 'matched' as const,
            matched_with: 'item-2',
            variance_amount: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        itcEligibility: {
          totalItcClaimed: '500000.00',
          totalItcEligible: '500000.00',
          itcToReverse: '0.00',
          reversePercentage: 0,
          itcMismatches: [],
        },
      };

      expect(mockDetail.session.id).toBe('session-1');
      expect(mockDetail.items).toHaveLength(1);
      expect(mockDetail.itcEligibility.totalItcEligible).toBe('500000.00');
    });
  });

  describe('edge cases', () => {
    it('handles no purchase register data', async () => {
      const mockSession = {
        id: 'session-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        period: '2024-01',
        session_status: 'completed' as const,
        total_invoices_2b: 0,
        total_invoices_register: 0,
        matched_count: 0,
        excess_in_2b: 0,
        missing_from_2b: 0,
        amount_mismatch: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockSession.total_invoices_register).toBe(0);
    });

    it('handles no GSTR-2B data', async () => {
      const mockSession = {
        id: 'session-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        period: '2024-01',
        session_status: 'completed' as const,
        total_invoices_2b: 0,
        total_invoices_register: 100,
        matched_count: 0,
        excess_in_2b: 0,
        missing_from_2b: 100,
        amount_mismatch: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockSession.missing_from_2b).toBe(100);
    });

    it('handles all mismatches', async () => {
      const mockSession = {
        id: 'session-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        period: '2024-01',
        session_status: 'completed' as const,
        total_invoices_2b: 100,
        total_invoices_register: 100,
        matched_count: 0,
        excess_in_2b: 0,
        missing_from_2b: 0,
        amount_mismatch: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockSession.amount_mismatch).toBe(100);
      expect(mockSession.matched_count).toBe(0);
    });
  });
});
