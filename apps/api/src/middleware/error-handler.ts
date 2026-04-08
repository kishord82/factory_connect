/**
 * B5: Global error handler middleware.
 * Catches all errors, formats as structured FC_ERR responses.
 */

import type { Request, Response, NextFunction } from 'express';
import { FcError } from '@fc/shared';
import { createLogger } from '@fc/observability';

const logger = createLogger('api');

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = req.correlationId || 'unknown';

  if (err instanceof FcError) {
    const fcErr = err as FcError;
    logger.warn(
      { code: fcErr.code, statusCode: fcErr.statusCode, correlationId },
      fcErr.message,
    );
    res.status(fcErr.statusCode).json({
      error: {
        code: fcErr.code,
        message: fcErr.message,
        details: fcErr.details,
        correlationId,
      },
    });
    return;
  }

  // Unexpected errors — log full stack, return generic message
  logger.error({ err, correlationId }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'FC_ERR_INTERNAL',
      message: 'An internal error occurred',
      correlationId,
    },
  });
}
