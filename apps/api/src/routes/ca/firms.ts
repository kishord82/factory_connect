/**
 * CA1: CA Firm routes — POST/PATCH firm, GET firm profile, subscription
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

export const firmRouter = Router();

// All firm routes require auth + CA tenant context
firmRouter.use(authenticate, caTenantContext);

const FirmCreateSchema = z.object({
  firm_name: z.string().min(1),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
  firm_type: z.enum(['individual', 'partnership', 'llp', 'pvt_ltd']).optional(),
  phone_number: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
});

const FirmUpdateSchema = FirmCreateSchema.partial();

const caNotImplemented = (): never => {
  throw new FcError(
    'FC_ERR_FEATURE_DISABLED',
    'CA module not yet implemented',
    { feature: 'ca_module' },
    501,
  );
};

/** POST /api/v1/ca/firms — Create CA firm (onboarding) */
firmRouter.post(
  '/',
  validate({ body: FirmCreateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/firms/me — Get current firm profile */
firmRouter.get('/me', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/v1/ca/firms/me — Update firm settings */
firmRouter.patch(
  '/me',
  validate({ body: FirmUpdateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/firms/me/subscription — Get subscription details */
firmRouter.get('/me/subscription', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/firms/me/dashboard — Main dashboard data */
firmRouter.get('/me/dashboard', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});
