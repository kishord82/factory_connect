/**
 * Health check endpoints.
 * /health — basic liveness check
 * /ready — readiness check (DB connection)
 */

import { Router } from 'express';
import { healthCheck } from '@fc/database';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', async (_req, res) => {
  const dbOk = await healthCheck();
  const status = dbOk ? 'ready' : 'not_ready';
  const code = dbOk ? 200 : 503;
  res.status(code).json({ status, database: dbOk });
});
