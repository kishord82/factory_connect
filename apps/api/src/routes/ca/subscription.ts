/**
 * CA9: CA Subscription routes — List tiers, features, upgrade
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

export const subscriptionRouter = Router();

// All subscription routes require auth + CA tenant context
subscriptionRouter.use(authenticate, caTenantContext);

const UpgradeRequestSchema = z.object({
  target_tier: z.enum(['professional', 'enterprise']),
  reason: z.string().optional(),
});

const caNotImplemented = (): never => {
  throw new FcError(
    'FC_ERR_FEATURE_DISABLED',
    'CA module not yet implemented',
    { feature: 'ca_module' },
    501,
  );
};

/** GET /api/v1/ca/subscription/tiers — List all available tiers */
subscriptionRouter.get('/tiers', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/subscription/features — Get features for current tier */
subscriptionRouter.get('/features', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/ca/subscription/upgrade — Request tier upgrade */
subscriptionRouter.post(
  '/upgrade',
  validate({ body: UpgradeRequestSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);
