/**
 * B8: Shipment routes.
 */

import { Router } from 'express';
import { z } from 'zod';
import { CanonicalShipmentCreateSchema, PaginationSchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery, getValidatedParams } from '../middleware/validate.js';
import * as shipmentService from '../services/shipment-service.js';

export const shipmentRouter = Router();
shipmentRouter.use(authenticate, tenantContext);

const IdParams = z.object({ id: z.string().uuid() });
const ListQuery = PaginationSchema.extend({
  order_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

shipmentRouter.post('/', validate({ body: CanonicalShipmentCreateSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const shipment = await shipmentService.createShipment(ctx, req.body);
    res.status(201).json({ data: shipment });
  } catch (err) { next(err); }
});

shipmentRouter.get('/', validate({ query: ListQuery }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof ListQuery>>(req);
    const result = await shipmentService.listShipments(
      ctx, q.order_id, q.page, q.pageSize, q.search, q.sort, q.order,
    );
    res.json(result);
  } catch (err) { next(err); }
});

shipmentRouter.get('/:id', validate({ params: IdParams }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { id } = getValidatedParams<z.infer<typeof IdParams>>(req);
    const s = await shipmentService.getShipmentById(ctx, id);
    if (!s) { res.status(404).json({ error: { code: 'FC_ERR_SHIPMENT_NOT_FOUND' } }); return; }
    res.json({ data: s });
  } catch (err) { next(err); }
});
