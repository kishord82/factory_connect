/**
 * Correlation ID middleware.
 * Extracts or generates X-Correlation-ID for request tracing.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

const HEADER = 'x-correlation-id';

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers[HEADER] as string) || uuidv4();
  (req as unknown as Record<string, unknown>).correlationId = id;
  res.setHeader('X-Correlation-ID', id);
  next();
}
