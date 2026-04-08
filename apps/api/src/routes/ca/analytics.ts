/**
 * CA7: CA Analytics routes — Health, productivity, profitability, activity logging
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { caTenantContext, getCaRequestContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

export const analyticsRouter = Router();

// All analytics routes require auth + CA tenant context
analyticsRouter.use(authenticate, caTenantContext);

const ActivityLogSchema = z.object({
  staff_id: z.string().uuid(),
  activity_type: z.enum(['filing_completed', 'document_verified', 'notice_responded', 'client_consulted', 'meeting_conducted', 'other']),
  duration_minutes: z.number().int().positive().optional(),
  client_id: z.string().uuid().optional(),
  description: z.string().optional(),
});

/** GET /api/v1/ca/analytics/health — Firm-wide health overview */
analyticsRouter.get('/health', async (_req, res, next) => {
  try {
    // TODO: Implement health analytics service
    res.json({
      data: {
        overall_health_score: 78.4,
        health_trend: 'improving',
        clients_by_health: {
          excellent: 8,
          good: 12,
          fair: 3,
          poor: 0,
        },
        compliance_health: {
          gst: 89,
          tds: 76,
          mca: 82,
          income_tax: 85,
        },
        filing_health: {
          on_time_filing_rate: 95,
          document_collection_rate: 87,
          exception_resolution_rate: 92,
        },
        health_by_client: [
          { client_id: 'client-1', client_name: 'Acme Corp', score: 92, trend: 'up' },
          { client_id: 'client-2', client_name: 'Ravi Trading', score: 65, trend: 'up' },
          { client_id: 'client-3', client_name: 'Tech Solutions', score: 78, trend: 'stable' },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/analytics/productivity — Team productivity */
analyticsRouter.get('/productivity', async (_req, res, next) => {
  try {
    // TODO: Implement productivity analytics service
    res.json({
      data: {
        team_utilization: 82,
        average_activities_per_staff: 18.5,
        most_active_staff: [
          { staff_id: 'staff-1', name: 'Rajesh Kumar', activities: 28, avg_duration: 1.5 },
          { staff_id: 'staff-2', name: 'Priya Sharma', activities: 24, avg_duration: 1.2 },
          { staff_id: 'staff-3', name: 'Amit Patel', activities: 12, avg_duration: 2.1 },
        ],
        activity_distribution: {
          filing_completed: 35,
          document_verified: 28,
          notice_responded: 15,
          client_consulted: 18,
          meeting_conducted: 8,
        },
        this_month_metrics: {
          total_activities: 370,
          avg_per_day: 18.5,
          peak_day: 'Tuesday',
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/analytics/profitability — Client profitability */
analyticsRouter.get('/profitability', async (_req, res, next) => {
  try {
    // TODO: Implement profitability analytics service
    res.json({
      data: {
        total_revenue: 450000,
        average_client_revenue: 19565,
        top_clients_by_revenue: [
          { client_id: 'client-1', client_name: 'Acme Corp', revenue: 85000, margin: 45 },
          { client_id: 'client-2', client_name: 'Ravi Trading', revenue: 62000, margin: 38 },
          { client_id: 'client-3', client_name: 'Tech Solutions', revenue: 58000, margin: 42 },
        ],
        profitability_by_service: {
          gst_filing: { revenue: 150000, margin: 50 },
          tds_reconciliation: { revenue: 95000, margin: 42 },
          audit_support: { revenue: 120000, margin: 55 },
          consultation: { revenue: 85000, margin: 35 },
        },
        client_value_distribution: [
          { value_range: '0-10K', count: 5 },
          { value_range: '10-50K', count: 12 },
          { value_range: '50-100K', count: 5 },
          { value_range: '100K+', count: 1 },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/ca/analytics/activity — Log staff activity */
analyticsRouter.post(
  '/activity',
  validate({ body: ActivityLogSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      // TODO: Implement activity logging service
      res.status(201).json({
        data: {
          id: 'activity-1',
          firm_id: ctx.caFirmId,
          ...req.body,
          logged_by: ctx.userId,
          logged_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/analytics/firm — Overall firm analytics (shape matches frontend Analytics interface) */
analyticsRouter.get('/firm', async (_req, res, next) => {
  try {
    // TODO: Implement firm analytics service backed by real DB queries
    res.json({
      data: {
        overall_health_score: 78.4,
        clients_by_health: {
          excellent: 8,
          good: 12,
          fair: 3,
          poor: 0,
        },
        compliance_health: {
          gst: 89,
          tds: 76,
          mca: 82,
          income_tax: 85,
        },
        team_utilization: 82,
        most_active_staff: [
          { name: 'Rajesh Kumar', activities: 28 },
          { name: 'Priya Sharma', activities: 24 },
          { name: 'Amit Patel', activities: 12 },
        ],
        total_revenue_ytd: 450000,
        top_clients_by_revenue: [
          { client_name: 'Acme Corp', revenue: 85000, margin: 45 },
          { client_name: 'Ravi Trading', revenue: 62000, margin: 38 },
          { client_name: 'Tech Solutions', revenue: 58000, margin: 42 },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});
