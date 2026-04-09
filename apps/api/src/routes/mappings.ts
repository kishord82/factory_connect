/**
 * C: Mappings route — Data transformation rules and field mappings.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantClient, paginatedQuery } from '@fc/database';
import { parsePagination, buildOrderBy } from '../utils/pagination.js';
import { PaginationSchema } from '@fc/shared';

export const mappingsRouter = Router();
mappingsRouter.use(authenticate, tenantContext);

const MAPPINGS_SORT_COLUMNS = ['created_at', 'mapping_type', 'status'];

const MappingRow = z.object({
  id: z.string().uuid(),
  mapping_type: z.string(),
  source_system: z.string(),
  target_system: z.string(),
  status: z.string(),
  created_at: z.date(),
});

mappingsRouter.get('/', validate({ query: PaginationSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const params = parsePagination(req, 'created_at');
    const orderBy = buildOrderBy(params.sort, params.order, MAPPINGS_SORT_COLUMNS);

    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      return paginatedQuery(
        client,
        `SELECT id, mapping_type, source_system, target_system, status, created_at
         FROM ai.mapping_configs
         WHERE factory_id = $1 ${orderBy}`,
        [ctx.tenantId],
        params.page,
        params.limit,
      );
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

mappingsRouter.get('/:id', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { id } = req.params;

    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      const queryResult = await client.query(
        `SELECT id, mapping_type, source_system, target_system, status, rules, created_at
         FROM ai.mapping_configs
         WHERE id = $1 AND factory_id = $2`,
        [id, ctx.tenantId],
      );
      return queryResult.rows[0] || null;
    });

    if (!result) {
      res.status(404).json({ error: { code: 'FC_ERR_MAPPING_NOT_FOUND' } });
      return;
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
