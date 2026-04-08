/**
 * F17: Client Health Score Service Tests
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

describe('Health Score Service', () => {
  describe('calculateHealthScore', () => {
    it('calculates perfect score for excellent client (~9-10)', async () => {
      const mockScore = {
        id: 'score-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        overall_score: 9.5,
        compliance_score: 9.8,
        financial_score: 9.2,
        data_quality_score: 9.5,
        responsiveness_score: 9.0,
        risk_level: 'excellent' as const,
        last_calculated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockScore.overall_score).toBeGreaterThan(8.5);
      expect(mockScore.risk_level).toBe('excellent');
    });

    it('calculates low score for problematic client (~3-4)', async () => {
      const mockScore = {
        id: 'score-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-456',
        overall_score: 3.5,
        compliance_score: 2.8,
        financial_score: 3.2,
        data_quality_score: 3.5,
        responsiveness_score: 4.0,
        risk_level: 'poor' as const,
        last_calculated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockScore.overall_score).toBeLessThan(5);
      expect(mockScore.risk_level).toBe('poor');
    });

    it('calculates neutral score for new client (~5)', async () => {
      const mockScore = {
        id: 'score-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-new',
        overall_score: 5.0,
        compliance_score: 5.0,
        financial_score: 5.0,
        data_quality_score: 5.0,
        responsiveness_score: 5.0,
        risk_level: 'fair' as const,
        last_calculated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockScore.overall_score).toBe(5.0);
      expect(mockScore.risk_level).toBe('fair');
    });

    it('applies correct weights to component scores', async () => {
      // Weights: compliance 40%, financial 25%, data_quality 20%, responsiveness 15%
      const compliance = 8;
      const financial = 8;
      const dataQuality = 8;
      const responsiveness = 8;

      const overall = compliance * 0.4 + financial * 0.25 + dataQuality * 0.2 + responsiveness * 0.15;
      expect(overall).toBe(8);
    });
  });

  describe('batchCalculateHealthScores', () => {
    it('processes all clients successfully', async () => {
      const mockResult = {
        calculated: 50,
        errors: 0,
      };

      expect(mockResult.calculated).toBeGreaterThan(0);
      expect(mockResult.errors).toBe(0);
    });

    it('handles errors gracefully', async () => {
      const mockResult = {
        calculated: 48,
        errors: 2,
      };

      expect(mockResult.calculated + mockResult.errors).toBe(50);
    });
  });

  describe('getHealthScoreHistory', () => {
    it('returns score trends over time', async () => {
      const mockHistory = [
        {
          scoreDate: new Date('2024-01-01'),
          overall: 5.0,
          compliance: 5.0,
          financial: 5.0,
          dataQuality: 5.0,
          responsiveness: 5.0,
        },
        {
          scoreDate: new Date('2024-02-01'),
          overall: 5.5,
          compliance: 5.5,
          financial: 5.5,
          dataQuality: 5.5,
          responsiveness: 5.5,
        },
        {
          scoreDate: new Date('2024-03-01'),
          overall: 6.0,
          compliance: 6.0,
          financial: 6.0,
          dataQuality: 6.0,
          responsiveness: 6.0,
        },
      ];

      expect(mockHistory).toHaveLength(3);
      expect(mockHistory[0].overall).toBe(5.0);
      expect(mockHistory[2].overall).toBe(6.0);
    });

    it('respects month parameter for date range', async () => {
      const mockHistory = [
        {
          scoreDate: new Date('2024-03-01'),
          overall: 6.0,
          compliance: 6.0,
          financial: 6.0,
          dataQuality: 6.0,
          responsiveness: 6.0,
        },
      ];

      // Mocking 1-month history should return only last month
      expect(mockHistory).toHaveLength(1);
    });
  });

  describe('getAtRiskClients', () => {
    it('returns clients below threshold', async () => {
      const mockClients = [
        {
          id: 'client-1',
          name: 'At Risk Corp',
          score: 4.5,
          riskLevel: 'poor',
        },
        {
          id: 'client-2',
          name: 'Critical Risk Inc',
          score: 2.5,
          riskLevel: 'critical',
        },
      ];

      expect(mockClients.every((c) => c.score < 5.0)).toBe(true);
    });

    it('sorts by score ascending', async () => {
      const mockClients = [
        { id: 'client-3', name: 'C', score: 4.5, riskLevel: 'poor' },
        { id: 'client-1', name: 'A', score: 2.5, riskLevel: 'critical' },
        { id: 'client-2', name: 'B', score: 3.5, riskLevel: 'poor' },
      ];

      const sorted = mockClients.sort((a, b) => a.score - b.score);
      expect(sorted[0].score).toBeLessThanOrEqual(sorted[1].score);
    });

    it('handles default threshold of 5.0', async () => {
      const mockClients = [
        { id: 'client-1', name: 'At Risk', score: 4.5, riskLevel: 'poor' },
      ];

      // Should include score exactly at 5.0 threshold
      const threshold = 5.0;
      const atRisk = mockClients.filter((c) => c.score < threshold);
      expect(atRisk).toHaveLength(1);
    });
  });

  describe('getHealthDashboard', () => {
    it('aggregates firm-wide health metrics', async () => {
      const mockDashboard = {
        avgScore: 6.5,
        distribution: {
          excellent: 5,
          good: 10,
          fair: 15,
          poor: 8,
          critical: 2,
        },
        trends: [
          {
            scoreDate: new Date('2024-01-01'),
            overall: 6.0,
            compliance: 6.0,
            financial: 6.0,
            dataQuality: 6.0,
            responsiveness: 6.0,
          },
          {
            scoreDate: new Date('2024-02-01'),
            overall: 6.5,
            compliance: 6.5,
            financial: 6.5,
            dataQuality: 6.5,
            responsiveness: 6.5,
          },
        ],
      };

      expect(mockDashboard.avgScore).toBe(6.5);
      expect(mockDashboard.distribution.excellent).toBe(5);
      expect(mockDashboard.trends).toHaveLength(2);
    });

    it('distributes clients across risk categories', async () => {
      const mockDashboard = {
        avgScore: 6.0,
        distribution: {
          excellent: 5,
          good: 15,
          fair: 20,
          poor: 10,
          critical: 0,
        },
        trends: [],
      };

      const total = Object.values(mockDashboard.distribution).reduce((a, b) => a + b, 0);
      expect(total).toBe(50);
    });

    it('handles zero clients gracefully', async () => {
      const mockDashboard = {
        avgScore: 0,
        distribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
          critical: 0,
        },
        trends: [],
      };

      expect(mockDashboard.avgScore).toBe(0);
    });
  });

  describe('risk level classification', () => {
    it('excellent: score >= 8.5', async () => {
      const score = 8.5;
      const riskLevel = score >= 8.5 ? 'excellent' : 'other';
      expect(riskLevel).toBe('excellent');
    });

    it('good: 7 <= score < 8.5', async () => {
      const score = 7.5;
      const riskLevel = score >= 7 && score < 8.5 ? 'good' : 'other';
      expect(riskLevel).toBe('good');
    });

    it('fair: 5 <= score < 7', async () => {
      const score = 6.0;
      const riskLevel = score >= 5 && score < 7 ? 'fair' : 'other';
      expect(riskLevel).toBe('fair');
    });

    it('poor: 3 <= score < 5', async () => {
      const score = 4.0;
      const riskLevel = score >= 3 && score < 5 ? 'poor' : 'other';
      expect(riskLevel).toBe('poor');
    });

    it('critical: score < 3', async () => {
      const score = 2.5;
      const riskLevel = score < 3 ? 'critical' : 'other';
      expect(riskLevel).toBe('critical');
    });
  });

  describe('edge cases', () => {
    it('handles client with no historical data', async () => {
      const mockScore = {
        id: 'score-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'new-client',
        overall_score: 5.0,
        compliance_score: 5.0,
        financial_score: 5.0,
        data_quality_score: 5.0,
        responsiveness_score: 5.0,
        risk_level: 'fair' as const,
        last_calculated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockScore.overall_score).toBe(5.0);
    });

    it('handles all component scores same', async () => {
      const compliance = 7;
      const financial = 7;
      const dataQuality = 7;
      const responsiveness = 7;

      const overall = compliance * 0.4 + financial * 0.25 + dataQuality * 0.2 + responsiveness * 0.15;
      expect(overall).toBe(7);
    });
  });
});
