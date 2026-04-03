/**
 * B6: Feature gate middleware.
 * C10: Evaluation order: platform flag first, then factory preference.
 * requireFeature(flagName) checks both levels.
 */

import type { Request, Response, NextFunction } from 'express';
import { FcError } from '@fc/shared';
import { getPool } from '@fc/database';
import { getRequestContext } from './tenant-context.js';

/**
 * Create middleware that requires a specific feature flag to be enabled.
 * Checks: 1) Platform-level feature_flags table, 2) Factory-level factory_preferences.
 */
export function requireFeature(flagName: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getRequestContext(req);
      const enabled = await isFeatureEnabled(flagName, ctx.tenantId);
      if (!enabled) {
        next(
          new FcError(
            'FC_ERR_FEATURE_DISABLED',
            `Feature ${flagName} is not enabled`,
            { feature: flagName },
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

/**
 * Check if a feature is enabled for a given tenant.
 * Order: platform flag → factory preference override.
 */
export async function isFeatureEnabled(
  flagName: string,
  tenantId: string,
): Promise<boolean> {
  const pool = getPool();

  // 1. Check platform-level flag
  const platformResult = await pool.query<{ is_enabled: boolean }>(
    'SELECT is_enabled FROM feature_flags WHERE flag_name = $1',
    [flagName],
  );

  if (platformResult.rows.length === 0) {
    // Unknown flag — default to disabled
    return false;
  }

  const platformEnabled = platformResult.rows[0].is_enabled;
  if (!platformEnabled) {
    // Platform says off — factory can't override
    return false;
  }

  // 2. Check factory-level preference (can opt out)
  const factoryResult = await pool.query<{ is_enabled: boolean }>(
    'SELECT is_enabled FROM factory_preferences WHERE flag_name = $1 AND tenant_id = $2',
    [flagName, tenantId],
  );

  if (factoryResult.rows.length === 0) {
    // No factory override — use platform value
    return platformEnabled;
  }

  return factoryResult.rows[0].is_enabled;
}
