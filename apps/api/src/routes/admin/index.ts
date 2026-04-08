/**
 * B18: Admin routes — FC admin: factory list, Act As, feature flags.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate, getValidatedParams } from '../../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { getPool } from '@fc/database';
import { withTransaction, insertOne, paginatedQuery } from '@fc/database';
import { parsePagination, buildSearchWhere, buildOrderBy } from '../../utils/pagination.js';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('fc_admin'));

const FACTORY_SORT_COLUMNS = ['created_at', 'factory_name', 'status', 'erp_type'];
const FACTORY_SEARCH_COLUMNS = ['f.name', 'f.status', 'f.factory_type'];

/** GET /admin/factories — list all factories */
adminRouter.get('/factories', async (req, res, next) => {
  try {
    const params = parsePagination(req, 'created_at');
    const { clause: searchClause, values: searchValues } = buildSearchWhere(
      params.search, FACTORY_SEARCH_COLUMNS, 1,
    );
    const whereClause = searchClause ? `WHERE ${searchClause}` : '';
    const orderBy = buildOrderBy(params.sort, params.order, FACTORY_SORT_COLUMNS);

    const pool = getPool();
    const client = await pool.connect();
    try {
      const result = await paginatedQuery(
        client,
        `SELECT id, name AS factory_name, slug, factory_type AS erp_type,
                contact_email, status, created_at, updated_at
         FROM core.factories f ${whereClause} ${orderBy}`,
        [...searchValues],
        params.page,
        params.limit,
      );
      res.json(result);
    } finally { client.release(); }
  } catch (err) { next(err); }
});

/** POST /admin/impersonate — start Act As session */
adminRouter.post('/impersonate', validate({ body: z.object({
  factory_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
}) }), async (req, res, next) => {
  try {
    const session = await withTransaction(async (client: PoolClient) => {
      return insertOne(client,
        `INSERT INTO audit.impersonation_sessions (fc_operator_id, factory_id, reason)
         VALUES ($1, $2, $3) RETURNING id, fc_operator_id, factory_id, reason, created_at`,
        [req.auth!.sub, req.body.factory_id, req.body.reason]);
    });
    res.status(201).json({ data: session });
  } catch (err) { next(err); }
});

/** GET /admin/feature-flags — list all flags */
adminRouter.get('/feature-flags', async (_req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT flag_name, is_enabled, description, updated_at FROM platform.feature_flags ORDER BY flag_name',
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

/** PUT /admin/feature-flags/:flag — toggle flag */
adminRouter.put('/feature-flags/:flag', validate({
  params: z.object({ flag: z.string().min(1) }),
  body: z.object({ is_enabled: z.boolean() }),
}), async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE platform.feature_flags SET is_enabled = $1, updated_at = NOW() WHERE flag_name = $2 RETURNING flag_name, is_enabled, description, updated_at',
      [req.body.is_enabled, getValidatedParams<{ flag: string }>(req).flag],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: { code: 'FC_ERR_FLAG_NOT_FOUND' } });
      return;
    }
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});
