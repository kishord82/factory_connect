/**
 * C: EDI messages route — Electronic Data Interchange message log.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantClient, paginatedQuery } from '@fc/database';
import { parsePagination, buildSearchWhere, buildOrderBy } from '../utils/pagination.js';
import { PaginationSchema } from '@fc/shared';

export const ediRouter = Router();
ediRouter.use(authenticate, tenantContext);

const EDI_SORT_COLUMNS = ['created_at', 'message_type', 'status'];
const EDI_SEARCH_COLUMNS = ['ml.message_type', 'ml.edi_standard', 'ml.status'];

ediRouter.get('/messages', validate({ query: PaginationSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const params = parsePagination(req, 'created_at');
    const { clause: searchClause, values: searchValues } = buildSearchWhere(
      params.search,
      EDI_SEARCH_COLUMNS,
      2,
    );
    const whereSearch = searchClause ? `AND ${searchClause}` : '';
    const orderBy = buildOrderBy(params.sort, params.order, EDI_SORT_COLUMNS);

    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      return paginatedQuery(
        client,
        `SELECT id, factory_id, connection_id, message_type, edi_standard, direction,
                status, error_message, created_at
         FROM orders.message_log ml
         WHERE ml.factory_id = $1 ${whereSearch} ${orderBy}`,
        [ctx.tenantId, ...searchValues],
        params.page,
        params.limit,
      );
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

ediRouter.get('/messages/:id', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { id } = req.params;

    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      const queryResult = await client.query(
        `SELECT id, factory_id, connection_id, message_type, edi_standard, direction,
                status, raw_payload, processed_payload, error_message, created_at
         FROM orders.message_log
         WHERE id = $1 AND factory_id = $2`,
        [id, ctx.tenantId],
      );
      return queryResult.rows[0] || null;
    });

    if (!result) {
      res.status(404).json({ error: { code: 'FC_ERR_EDI_MESSAGE_NOT_FOUND' } });
      return;
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
