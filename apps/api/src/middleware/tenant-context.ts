/**
 * B3: Tenant context middleware.
 * Extracts factory_id from authenticated JWT and makes it available
 * for database RLS via RequestContext.
 */

import type { Request, Response, NextFunction } from 'express';
import { FcError } from '@fc/shared';
import type { RequestContext } from '@fc/shared';

/**
 * Build RequestContext from the authenticated request.
 * Must be used after authenticate middleware.
 */
export function tenantContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.factory_id) {
    next(new FcError('FC_ERR_TENANT_NOT_SET', 'Tenant context is required', {}, 403));
    return;
  }

  const ctx: RequestContext = {
    tenantId: req.auth.factory_id,
    userId: req.auth.sub,
    correlationId: req.correlationId || '',
    role: req.auth.role,
  };

  (req as unknown as Record<string, unknown>).ctx = ctx;
  next();
}

/**
 * Extract RequestContext from Express request.
 * Throws if not set (middleware not applied).
 */
export function getRequestContext(req: Request): RequestContext {
  const ctx = (req as unknown as Record<string, unknown>).ctx as RequestContext | undefined;
  if (!ctx) {
    throw new FcError('FC_ERR_TENANT_NOT_SET', 'Tenant context middleware not applied', {}, 500);
  }
  return ctx;
}
