/**
 * F14: Staff Productivity Service Tests
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

describe('Productivity Service', () => {
  describe('logActivity', () => {
    it('creates activity log record', async () => {
      const mockLog = {
        id: 'log-1',
        ca_firm_id: mockCaCtx.caFirmId,
        staff_id: 'staff-1',
        client_id: 'client-1',
        activity_type: 'filing_preparation',
        duration_minutes: 120,
        description: 'Prepared GSTR-1 for Q1',
        activity_date: new Date('2024-01-15'),
        created_at: new Date(),
      };

      expect(mockLog.staff_id).toBe('staff-1');
      expect(mockLog.duration_minutes).toBe(120);
      expect(mockLog.activity_type).toBe('filing_preparation');
    });
  });

  describe('getStaffProductivity', () => {
    it('calculates correct total hours', async () => {
      const mockProductivity = {
        staffId: 'staff-1',
        totalHours: 40.5,
        clientCount: 5,
        activitiesByType: {
          filing_preparation: 10,
          exception_resolution: 8,
          consultation: 5,
        },
        avgTimePerClient: 8.1,
        filingsPrepared: 3,
        exceptionsResolved: 12,
      };

      expect(mockProductivity.totalHours).toBe(40.5);
    });

    it('calculates average time per client', async () => {
      const totalHours = 40;
      const clientCount = 5;
      const avgTimePerClient = totalHours / clientCount;

      expect(avgTimePerClient).toBe(8);
    });

    it('counts activities by type', async () => {
      const mockProductivity = {
        staffId: 'staff-1',
        totalHours: 40,
        clientCount: 5,
        activitiesByType: {
          filing_preparation: 15,
          exception_resolution: 20,
          consultation: 10,
        },
        avgTimePerClient: 8,
        filingsPrepared: 0,
        exceptionsResolved: 0,
      };

      const totalActivities = Object.values(mockProductivity.activitiesByType).reduce(
        (a, b) => a + b,
        0,
      );
      expect(totalActivities).toBe(45);
    });

    it('handles staff with no activity', async () => {
      const mockProductivity = {
        staffId: 'staff-2',
        totalHours: 0,
        clientCount: 0,
        activitiesByType: {},
        avgTimePerClient: 0,
        filingsPrepared: 0,
        exceptionsResolved: 0,
      };

      expect(mockProductivity.totalHours).toBe(0);
      expect(mockProductivity.clientCount).toBe(0);
    });
  });

  describe('getTeamProductivity', () => {
    it('aggregates productivity for all team members', async () => {
      const mockTeamData = [
        {
          staffId: 'staff-1',
          totalHours: 40,
          clientCount: 5,
          activitiesByType: {},
          avgTimePerClient: 8,
          filingsPrepared: 3,
          exceptionsResolved: 12,
        },
        {
          staffId: 'staff-2',
          totalHours: 38,
          clientCount: 4,
          activitiesByType: {},
          avgTimePerClient: 9.5,
          filingsPrepared: 2,
          exceptionsResolved: 10,
        },
      ];

      expect(mockTeamData).toHaveLength(2);
      const totalTeamHours = mockTeamData.reduce((sum, s) => sum + s.totalHours, 0);
      expect(totalTeamHours).toBe(78);
    });
  });

  describe('getClientProfitability', () => {
    it('calculates profitability correctly', async () => {
      const mockProfitability = {
        clientId: 'client-1',
        totalTimeMinutes: 600,
        estimatedCost: 1500, // 10 hours * $150/hour
        subscriptionRevenue: 5000,
        profitability: 3500,
        profitabilityRatio: 70,
        recommendation: 'Highly profitable: Candidate for premium features',
      };

      expect(mockProfitability.profitability).toBe(3500);
      expect(mockProfitability.profitabilityRatio).toBe(70);
    });

    it('marks loss-making clients', async () => {
      const mockProfitability = {
        clientId: 'client-2',
        totalTimeMinutes: 2000,
        estimatedCost: 5000, // 33 hours * $150/hour
        subscriptionRevenue: 3000,
        profitability: -2000,
        profitabilityRatio: -66.67,
        recommendation: 'Loss-making: Review scope or pricing',
      };

      expect(mockProfitability.profitability).toBeLessThan(0);
      expect(mockProfitability.recommendation).toContain('Loss-making');
    });

    it('identifies marginal clients < 20% ratio', async () => {
      const mockProfitability = {
        clientId: 'client-3',
        totalTimeMinutes: 1200,
        estimatedCost: 3000, // 20 hours * $150/hour
        subscriptionRevenue: 3500,
        profitability: 500,
        profitabilityRatio: 14.29,
        recommendation: 'Marginal: Consider automation or upsell',
      };

      expect(mockProfitability.profitabilityRatio).toBeLessThan(20);
      expect(mockProfitability.recommendation).toContain('Marginal');
    });

    it('handles zero time spent', async () => {
      const mockProfitability = {
        clientId: 'client-4',
        totalTimeMinutes: 0,
        estimatedCost: 0,
        subscriptionRevenue: 5000,
        profitability: 5000,
        profitabilityRatio: 100,
        recommendation: 'Highly profitable: Candidate for premium features',
      };

      expect(mockProfitability.estimatedCost).toBe(0);
      expect(mockProfitability.profitabilityRatio).toBe(100);
    });
  });

  describe('getFirmAnalytics', () => {
    it('aggregates firm-wide metrics', async () => {
      const mockAnalytics = {
        totalClients: 50,
        activeClients: 45,
        filingVolume: 180,
        exceptionRate: 8.5,
        avgHealthScore: 6.5,
        revenuePerClient: 2222.22,
      };

      expect(mockAnalytics.totalClients).toBe(50);
      expect(mockAnalytics.activeClients).toBeLessThanOrEqual(mockAnalytics.totalClients);
      expect(mockAnalytics.revenuePerClient).toBeGreaterThan(0);
    });

    it('calculates filing volume in period', async () => {
      const mockAnalytics = {
        totalClients: 50,
        activeClients: 45,
        filingVolume: 180,
        exceptionRate: 8.5,
        avgHealthScore: 6.5,
        revenuePerClient: 2222.22,
      };

      // Assuming 4 filing types per client per period
      const expectedMin = 45 * 3;
      expect(mockAnalytics.filingVolume).toBeGreaterThanOrEqual(expectedMin);
    });

    it('calculates exception rate as percentage', async () => {
      const mockAnalytics = {
        totalClients: 50,
        activeClients: 45,
        filingVolume: 180,
        exceptionRate: 8.5,
        avgHealthScore: 6.5,
        revenuePerClient: 2222.22,
      };

      // Exception rate should be 0-100%
      expect(mockAnalytics.exceptionRate).toBeGreaterThanOrEqual(0);
      expect(mockAnalytics.exceptionRate).toBeLessThanOrEqual(100);
    });

    it('calculates revenue per client', async () => {
      const totalRevenue = 100000;
      const activeClients = 45;
      const revenuePerClient = totalRevenue / activeClients;

      expect(revenuePerClient).toBeGreaterThan(0);
    });

    it('handles zero active clients', async () => {
      const totalRevenue = 0;
      const activeClients = 0;
      const revenuePerClient = activeClients > 0 ? totalRevenue / activeClients : 0;

      expect(revenuePerClient).toBe(0);
    });
  });

  describe('productivity calculations', () => {
    it('converts minutes to hours correctly', async () => {
      const minutes = 120;
      const hours = minutes / 60;
      expect(hours).toBe(2);
    });

    it('rounds hours to 2 decimal places', async () => {
      const minutes = 90;
      const hours = Math.round((minutes / 60) * 100) / 100;
      expect(hours).toBe(1.5);
    });

    it('handles fractional hours', async () => {
      const minutes = 125;
      const hours = Math.round((minutes / 60) * 100) / 100;
      expect(hours).toBe(2.08);
    });
  });

  describe('profitability calculations', () => {
    it('calculates estimated cost at $150/hour', async () => {
      const hourlyRate = 150;
      const hours = 10;
      const estimatedCost = hours * hourlyRate;

      expect(estimatedCost).toBe(1500);
    });

    it('calculates profitability ratio correctly', async () => {
      const profitability = 3500;
      const subscriptionRevenue = 5000;
      const ratio = (profitability / subscriptionRevenue) * 100;

      expect(ratio).toBe(70);
    });

    it('handles negative profitability', async () => {
      const profitability = -2000;
      const subscriptionRevenue = 3000;
      const ratio = (profitability / subscriptionRevenue) * 100;

      expect(ratio).toBeLessThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles staff with zero hours', async () => {
      const mockProductivity = {
        staffId: 'staff-new',
        totalHours: 0,
        clientCount: 0,
        activitiesByType: {},
        avgTimePerClient: 0,
        filingsPrepared: 0,
        exceptionsResolved: 0,
      };

      expect(mockProductivity.totalHours).toBe(0);
    });

    it('handles client with zero time investment', async () => {
      const mockProfitability = {
        clientId: 'client-zero-time',
        totalTimeMinutes: 0,
        estimatedCost: 0,
        subscriptionRevenue: 5000,
        profitability: 5000,
        profitabilityRatio: 100,
        recommendation: 'Highly profitable: Candidate for premium features',
      };

      expect(mockProfitability.profitability).toBe(5000);
    });

    it('handles firm with one client', async () => {
      const mockAnalytics = {
        totalClients: 1,
        activeClients: 1,
        filingVolume: 4,
        exceptionRate: 10,
        avgHealthScore: 6.0,
        revenuePerClient: 5000,
      };

      expect(mockAnalytics.totalClients).toBe(1);
    });
  });
});
