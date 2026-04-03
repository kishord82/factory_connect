/**
 * B4: Idempotency middleware.
 * X-Idempotency-Key header → Redis check → DB check → process.
 * Prevents duplicate processing of the same request.
 */

import type { Request, Response, NextFunction } from 'express';
const HEADER = 'x-idempotency-key';

/**
 * Idempotency middleware.
 * Currently stores keys in-memory (will use Redis in production).
 * The DB-level UNIQUE constraint on idempotency_key is the final safety net.
 */
const processedKeys = new Map<string, { statusCode: number; body: unknown }>();

export function idempotency(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers[HEADER] as string | undefined;
  if (!key) {
    next();
    return;
  }

  // Check if already processed
  const cached = processedKeys.get(key);
  if (cached) {
    res.status(cached.statusCode).json(cached.body);
    return;
  }

  // Store response after processing
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    processedKeys.set(key, { statusCode: res.statusCode, body });
    // Limit cache size (in production, use Redis with TTL)
    if (processedKeys.size > 10000) {
      const firstKey = processedKeys.keys().next().value;
      if (firstKey) processedKeys.delete(firstKey);
    }
    return originalJson(body);
  };

  next();
}
