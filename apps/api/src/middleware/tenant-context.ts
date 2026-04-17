/**
 * B3: Tenant context middleware.
 * Reads factory_id from X-Tenant-ID header and user_id from X-User-ID header.
 * Both headers are required and tenant must be a valid UUID.
 * Must be used after authenticate middleware.
 */

import { FcError } from '@fc/shared';
import type { RequestContext } from '@fc/shared';
import type { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function tenantContext(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!tenantId) {
    next(new FcError('FC_ERR_TENANT_NOT_SET', 'X-Tenant-ID header is required', {}, 400));
    return;
  }
  if (!UUID_REGEX.test(tenantId)) {
    next(new FcError('FC_ERR_TENANT_INVALID', 'X-Tenant-ID must be a valid UUID', {}, 400));
    return;
  }
  if (!userId) {
    next(new FcError('FC_ERR_USER_NOT_SET', 'X-User-ID header is required', {}, 400));
    return;
  }

  const ctx: RequestContext = {
    tenantId,
    userId,
    correlationId: req.correlationId || '',
    role: req.auth?.role ?? 'factory_user',
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
