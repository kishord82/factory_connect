/**
 * CA Platform subscription feature gate middleware.
 * Checks if a feature is included in the CA firm's subscription tier
 * before allowing access to protected endpoints.
 */

import type { Request, Response, NextFunction } from 'express';
import { FcError } from '@fc/shared';
import { getPool } from '@fc/database';
import { getCaRequestContext } from './ca-tenant-context.js';

interface SubscriptionTierRow {
  features: string[];
}

/**
 * Middleware factory that checks if a feature is available
 * in the CA firm's subscription tier.
 * Usage: app.get('/api/ca/reports', requireSubscriptionFeature('F7'), handler)
 */
export function requireSubscriptionFeature(featureCode: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCaRequestContext(req);
      const pool = getPool();

      // Get firm's subscription tier features
      const result = await pool.query<SubscriptionTierRow>(
        `SELECT st.features FROM subscription_tiers st
         JOIN ca_firms cf ON cf.subscription_tier::text = st.id
         WHERE cf.id = $1`,
        [ctx.caFirmId],
      );

      if (result.rows.length === 0) {
        next(
          new FcError(
            'FC_ERR_SUBSCRIPTION_NOT_FOUND',
            'Subscription tier not found',
            { caFirmId: ctx.caFirmId },
            403,
          ),
        );
        return;
      }

      const features = result.rows[0].features;
      if (!features.includes(featureCode)) {
        next(
          new FcError(
            'FC_ERR_FEATURE_DISABLED',
            `Feature ${featureCode} requires a higher subscription tier`,
            { feature: featureCode, currentTier: ctx.subscriptionTier },
            403,
          ),
        );
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
