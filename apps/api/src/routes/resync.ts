/**
 * B11: Resync routes — 9-state resync state machine.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ResyncRequestCreateSchema, PaginationSchema } from '@fc/shared';
import { FcError } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery, getValidatedParams } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantTransaction, withTenantClient, insertOne, findOne, paginatedQuery } from '@fc/database';

export const resyncRouter = Router();
resyncRouter.use(authenticate, tenantContext);

const IdParams = z.object({ id: z.string().uuid() });

const VALID_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['VALIDATED', 'REJECTED'],
  VALIDATED: ['APPROVED', 'DENIED'],
  APPROVED: ['QUEUED'],
  QUEUED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'PARTIAL_FAIL', 'REQUIRES_REVIEW'],
};

resyncRouter.post('/', validate({ body: ResyncRequestCreateSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const resync = await withTenantTransaction(ctx, async (client: PoolClient) => {
      // Check for duplicate active resync for same connection
      const existing = await findOne(
        client,
        `SELECT id FROM resync_requests WHERE connection_id = $1 AND status NOT IN ('COMPLETED','REJECTED','DENIED') LIMIT 1`,
        [req.body.connection_id],
      );
      if (existing) {
        throw new FcError('FC_ERR_RESYNC_DUPLICATE', 'Active resync already exists for this connection', {}, 409);
      }

      return insertOne(
        client,
        `INSERT INTO resync_requests (factory_id, connection_id, resync_type, reason, requested_by, status)
         VALUES ($1,$2,$3,$4,$5,'REQUESTED') RETURNING *`,
        [ctx.tenantId, req.body.connection_id, req.body.resync_type, req.body.reason, ctx.userId],
      );
    });
    res.status(201).json({ data: resync });
  } catch (err) { next(err); }
});

resyncRouter.get('/', validate({ query: PaginationSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof PaginationSchema>>(req);
    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      return paginatedQuery(client, 'SELECT * FROM resync_requests ORDER BY created_at DESC', [], q.page, q.pageSize);
    });
    res.json(result);
  } catch (err) { next(err); }
});

/** POST /api/v1/resync/:id/transition — advance resync state */
resyncRouter.post(
  '/:id/transition',
  validate({ params: IdParams, body: z.object({ target_status: z.string() }) }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const { target_status } = req.body;
      const result = await withTenantTransaction(ctx, async (client: PoolClient) => {
        const current = await findOne<{ id: string; status: string }>(
          client, 'SELECT id, status FROM resync_requests WHERE id = $1', [getValidatedParams<z.infer<typeof IdParams>>(req).id],
        );
        if (!current) throw new FcError('FC_ERR_RESYNC_NOT_FOUND', 'Resync request not found', {}, 404);

        const allowed = VALID_TRANSITIONS[current.status];
        if (!allowed?.includes(target_status)) {
          throw new FcError('FC_ERR_RESYNC_INVALID_TRANSITION',
            `Cannot transition from ${current.status} to ${target_status}`,
            { current: current.status, target: target_status }, 400);
        }

        return insertOne(
          client,
          `UPDATE resync_requests SET status = $1::resync_status, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [target_status, getValidatedParams<z.infer<typeof IdParams>>(req).id],
        );
      });
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);
