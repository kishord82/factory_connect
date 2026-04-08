/**
 * B4: Zod validation middleware.
 * Validates request body, query, and params against Zod schemas.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FcError } from '@fc/shared';

interface ValidationSchemas {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

/**
 * Create validation middleware from Zod schemas.
 * Parsed values are stored on req.validated (Express 5 makes req.query read-only).
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          throw zodToFcError(result.error, 'body');
        }
        req.body = result.data;
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          throw zodToFcError(result.error, 'query');
        }
        (req as unknown as Record<string, unknown>).validatedQuery = result.data;
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          throw zodToFcError(result.error, 'params');
        }
        (req as unknown as Record<string, unknown>).validatedParams = result.data;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Extract validated body from request. */
export function getValidatedBody<T>(req: Request): T {
  return req.body as T;
}

/** Extract validated query from request (set by validate middleware). */
export function getValidatedQuery<T>(req: Request): T {
  const data = (req as unknown as Record<string, unknown>).validatedQuery as T | undefined;
  if (!data) {
    throw new FcError('FC_ERR_VALIDATION_FAILED', 'Validated query not found — validate middleware not applied', {}, 500);
  }
  return data;
}

/** Extract validated params from request (set by validate middleware). */
export function getValidatedParams<T>(req: Request): T {
  const data = (req as unknown as Record<string, unknown>).validatedParams as T | undefined;
  if (!data) {
    throw new FcError('FC_ERR_VALIDATION_FAILED', 'Validated params not found — validate middleware not applied', {}, 500);
  }
  return data;
}

function zodToFcError(error: z.ZodError, source: string): FcError {
  const issues = error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
  return new FcError(
    'FC_ERR_VALIDATION_FAILED',
    `Validation failed in ${source}`,
    { issues },
    400,
  );
}
