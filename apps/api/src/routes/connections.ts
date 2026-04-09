/**
 * B10: Connection routes — CRUD for buyer connections.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ConnectionCreateSchema, PaginationSchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedParams } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantTransaction, withTenantClient, insertOne, findOne, paginatedQuery } from '@fc/database';
import { parsePagination, buildSearchWhere, buildOrderBy } from '../utils/pagination.js';

export const connectionRouter = Router();
connectionRouter.use(authenticate, tenantContext);

const IdParams = z.object({ id: z.string().uuid() });

const CONNECTION_SORT_COLUMNS = ['created_at', 'status', 'mode', 'source_type'];
const CONNECTION_SEARCH_COLUMNS = ['c.buyer_endpoint', 'c.mode', 'c.status'];

interface ConnectionRow {
  id: string;
  factory_id: string;
  buyer_id: string;
  source_type: string;
  mode: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

connectionRouter.post('/', validate({ body: ConnectionCreateSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const conn = await withTenantTransaction(ctx, async (client: PoolClient) => {
      return insertOne<ConnectionRow>(
        client,
        `INSERT INTO core.connections (
          factory_id, buyer_id, source_type, mode, status
        ) VALUES ($1,$2,$3,$4,'active') RETURNING id, factory_id, buyer_id, source_type, mode, status, created_at, updated_at`,
        [
          ctx.tenantId, req.body.buyer_id, req.body.source_type, req.body.connection_mode,
        ],
      );
    });
    res.status(201).json({ data: conn });
  } catch (err) { next(err); }
});

connectionRouter.get('/', validate({ query: PaginationSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const params = parsePagination(req, 'created_at');
    const { clause: searchClause, values: searchValues } = buildSearchWhere(
      params.search, CONNECTION_SEARCH_COLUMNS, 2,
    );
    const whereSearch = searchClause ? `AND ${searchClause}` : '';
    const orderBy = buildOrderBy(params.sort, params.order, CONNECTION_SORT_COLUMNS);
    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      return paginatedQuery<ConnectionRow>(
        client,
        `SELECT id, factory_id, buyer_id, source_type, mode, protocol,
                buyer_endpoint, status, created_at, updated_at
         FROM core.connections c
         WHERE c.factory_id = $1 ${whereSearch} ${orderBy}`,
        [ctx.tenantId, ...searchValues],
        params.page,
        params.limit,
      );
    });
    res.json(result);
  } catch (err) { next(err); }
});

connectionRouter.get('/:id', validate({ params: IdParams }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const conn = await withTenantClient(ctx, async (client: PoolClient) => {
      const { id } = getValidatedParams<z.infer<typeof IdParams>>(req);
      return findOne<ConnectionRow>(
        client,
        `SELECT id, factory_id, buyer_id, source_type, mode, protocol,
                buyer_endpoint, status, created_at, updated_at
         FROM core.connections WHERE id = $1`,
        [id],
      );
    });
    if (!conn) { res.status(404).json({ error: { code: 'FC_ERR_CONNECTION_NOT_FOUND' } }); return; }
    res.json({ data: conn });
  } catch (err) { next(err); }
});
