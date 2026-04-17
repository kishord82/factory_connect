/**
 * D: Bridge agents route — Remote agent management and health status.
 */

import { withTenantClient } from '@fc/database';
import { PaginationSchema } from '@fc/shared';
import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate } from '../middleware/validate.js';
import { parsePagination } from '../utils/pagination.js';


export const bridgeRouter = Router();
bridgeRouter.use(authenticate, tenantContext);

bridgeRouter.get('/agents', validate({ query: PaginationSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const params = parsePagination(req, 'created_at');

    const result = await withTenantClient(ctx, async () => ({
      data: [],
      pagination: { page: params.page, limit: params.limit, total: 0, pages: 0 },
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

bridgeRouter.get('/agents/:id', async (req, res, next) => {
  try {
    res.status(404).json({ error: { code: 'FC_ERR_BRIDGE_AGENT_NOT_FOUND', message: 'Bridge agent not found' } });
  } catch (err) {
    next(err);
  }
});

bridgeRouter.get('/agents/:id/health', async (req, res, next) => {
  try {
    const { id } = req.params;
    res.json({ data: { agent_id: id, status: 'unknown', message: 'Bridge agent not connected' } });
  } catch (err) {
    next(err);
  }
});
