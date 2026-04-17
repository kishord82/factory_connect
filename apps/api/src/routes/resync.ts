/**
 * B11: Resync routes — 9-state resync state machine.
 */

import type { PoolClient } from '@fc/database';
import { withTenantTransaction, withTenantClient, insertOne, findOne, paginatedQuery } from '@fc/database';
import { ResyncRequestCreateSchema, PaginationSchema , FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery, getValidatedParams } from '../middleware/validate.js';


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
    const status = req.query.status as string | undefined;
    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      const params: unknown[] = [];
      let whereClause = '';
      if (status) {
        params.push(status);
        whereClause = `WHERE status = $${params.length}::resync_status`;
      }
      return paginatedQuery(
        client,
        `SELECT id, factory_id, connection_id, resync_type, reason,
                requested_by, status, approved_by, created_at, updated_at
         FROM workflow.resync_requests
         ${whereClause}
         ORDER BY created_at DESC`,
        params,
        q.page,
        q.pageSize,
      );
    });
    res.json(result);
  } catch (err) { next(err); }
});

async function performTransition(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
  targetStatus: string,
): Promise<void> {
  try {
    const ctx = getRequestContext(req);
    const { id } = getValidatedParams<z.infer<typeof IdParams>>(req);
    const result = await withTenantTransaction(ctx, async (client: PoolClient) => {
      const current = await findOne<{ id: string; status: string }>(
        client, 'SELECT id, status FROM resync_requests WHERE id = $1', [id],
      );
      if (!current) throw new FcError('FC_ERR_RESYNC_NOT_FOUND', 'Resync request not found', {}, 404);

      const allowed = VALID_TRANSITIONS[current.status];
      if (!allowed?.includes(targetStatus)) {
        throw new FcError('FC_ERR_RESYNC_INVALID_TRANSITION',
          `Cannot transition from ${current.status} to ${targetStatus}`,
          { current: current.status, target: targetStatus }, 400);
      }

      return insertOne(
        client,
        `UPDATE resync_requests SET status = $1::resync_status, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [targetStatus, id],
      );
    });
    res.json({ data: result });
  } catch (err) { next(err); }
}

/** Named transition routes */
resyncRouter.post('/:id/validate', validate({ params: IdParams }), (req, res, next) => performTransition(req, res, next, 'VALIDATED'));
resyncRouter.post('/:id/approve', validate({ params: IdParams }), (req, res, next) => performTransition(req, res, next, 'APPROVED'));
resyncRouter.post('/:id/queue', validate({ params: IdParams }), (req, res, next) => performTransition(req, res, next, 'QUEUED'));
resyncRouter.post('/:id/start', validate({ params: IdParams }), (req, res, next) => performTransition(req, res, next, 'IN_PROGRESS'));
resyncRouter.post('/:id/complete', validate({ params: IdParams }), (req, res, next) => performTransition(req, res, next, 'COMPLETED'));
resyncRouter.post('/:id/reject', validate({ params: IdParams }), (req, res, next) => performTransition(req, res, next, 'REJECTED'));
resyncRouter.post('/:id/partial-fail', validate({ params: IdParams }), (req, res, next) => performTransition(req, res, next, 'PARTIAL_FAIL'));

/** POST /api/v1/resync/:id/transition — generic state transition */
resyncRouter.post(
  '/:id/transition',
  validate({ params: IdParams, body: z.object({ target_status: z.string() }) }),
  (req, res, next) => performTransition(req, res, next, req.body.target_status),
);
