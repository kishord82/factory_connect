/**
 * CA7: CA Analytics routes — Health, productivity, profitability, activity logging
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

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

const caNotImplemented = (): never => {
  throw new FcError(
    'FC_ERR_FEATURE_DISABLED',
    'CA module not yet implemented',
    { feature: 'ca_module' },
    501,
  );
};

/** GET /api/v1/ca/analytics/health — Firm-wide health overview */
analyticsRouter.get('/health', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/analytics/productivity — Team productivity */
analyticsRouter.get('/productivity', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/analytics/profitability — Client profitability */
analyticsRouter.get('/profitability', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/ca/analytics/activity — Log staff activity */
analyticsRouter.post(
  '/activity',
  validate({ body: ActivityLogSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/analytics/firm — Overall firm analytics */
analyticsRouter.get('/firm', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});
