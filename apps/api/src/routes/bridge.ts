/**
 * D: Bridge agents route — Remote agent management and health status.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantClient, paginatedQuery } from '@fc/database';
import { parsePagination, buildOrderBy } from '../utils/pagination.js';
import { PaginationSchema } from '@fc/shared';

export const bridgeRouter = Router();
bridgeRouter.use(authenticate, tenantContext);

const BRIDGE_SORT_COLUMNS = ['created_at', 'status', 'last_seen'];

bridgeRouter.get('/agents', validate({ query: PaginationSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const params = parsePagination(req, 'created_at');
    const orderBy = buildOrderBy(params.sort, params.order, BRIDGE_SORT_COLUMNS);

    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      // Bridge agents are not yet in the schema, so return empty paginated result
      return {
        data: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 0,
          pages: 0,
        },
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

bridgeRouter.get('/agents/:id', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { id } = req.params;

    // Bridge agent detail endpoint
    res.status(404).json({
      error: {
        code: 'FC_ERR_BRIDGE_AGENT_NOT_FOUND',
        message: 'Bridge agent not found',
      },
    });
  } catch (err) {
    next(err);
  }
});

bridgeRouter.get('/agents/:id/health', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { id } = req.params;

    // Bridge agent health endpoint
    res.json({
      data: {
        agent_id: id,
        status: 'unknown',
        message: 'Bridge agent not connected',
      },
    });
  } catch (err) {
    next(err);
  }
});
