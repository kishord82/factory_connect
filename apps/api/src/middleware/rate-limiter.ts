/**
 * B22: Rate limiter middleware — token bucket per tenant.
 */
import type { Request, Response, NextFunction } from 'express';
import { FcError } from '@fc/shared';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();
const MAX_TOKENS = 100;
const REFILL_RATE = 10; // tokens per second
const REFILL_INTERVAL = 1000; // ms

function getBucket(key: string): TokenBucket {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: Date.now() };
    buckets.set(key, bucket);
  }
  // Refill tokens based on elapsed time
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(elapsed / REFILL_INTERVAL) * REFILL_RATE;
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
  return bucket;
}

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = req.auth?.factory_id || req.ip || 'anonymous';
  const bucket = getBucket(key);

  if (bucket.tokens <= 0) {
    res.setHeader('Retry-After', '1');
    res.setHeader('X-RateLimit-Limit', String(MAX_TOKENS));
    res.setHeader('X-RateLimit-Remaining', '0');
    next(new FcError('FC_ERR_RATE_LIMITED', 'Too many requests', {}, 429));
    return;
  }

  bucket.tokens--;
  res.setHeader('X-RateLimit-Limit', String(MAX_TOKENS));
  res.setHeader('X-RateLimit-Remaining', String(bucket.tokens));
  next();
}
