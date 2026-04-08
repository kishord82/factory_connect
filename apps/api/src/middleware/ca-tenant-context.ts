/**
 * CA Platform tenant context middleware.
 * Extracts ca_firm_id from authenticated JWT and makes it available
 * for database RLS via CaRequestContext.
 * Must be used after authenticate middleware.
 */

import type { Request, Response, NextFunction } from 'express';
import { FcError } from '@fc/shared';
import type { CaRequestContext, CaSubscriptionTier } from '@fc/shared';
import type { AuthPayload } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      correlationId?: string;
      caCtx?: CaRequestContext;
    }
  }
}

/**
 * Build CaRequestContext from the authenticated request.
 * Sets app.current_tenant for RLS enforcement.
 */
export function caTenantContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.ca_firm_id) {
    next(new FcError('FC_ERR_TENANT_NOT_SET', 'CA firm context is required', {}, 403));
    return;
  }

  const ctx: CaRequestContext = {
    caFirmId: req.auth.ca_firm_id,
    tenantId: req.auth.ca_firm_id,
    userId: req.auth.sub,
    correlationId: req.correlationId || '',
    role: req.auth.role,
    subscriptionTier: (req.auth.subscription_tier || 'trial') as CaSubscriptionTier,
  };

  req.caCtx = ctx;
  next();
}

/**
 * Extract CaRequestContext from Express request.
 * Throws if not set (middleware not applied).
 */
export function getCaRequestContext(req: Request): CaRequestContext {
  if (!req.caCtx) {
    throw new FcError(
      'FC_ERR_TENANT_NOT_SET',
      'CA tenant context middleware not applied',
      {},
      500,
    );
  }
  return req.caCtx;
}
