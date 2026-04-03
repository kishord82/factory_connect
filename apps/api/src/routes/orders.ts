/**
 * B7: Order routes — POST/GET orders, confirmOrder.
 */

import { Router } from 'express';
import { CanonicalOrderCreateSchema, CanonicalOrderUpdateSchema, OrderListQuerySchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery, getValidatedParams } from '../middleware/validate.js';
import { idempotency } from '../middleware/idempotency.js';
import { z } from 'zod';
import * as orderService from '../services/order-service.js';

export const orderRouter = Router();

// All order routes require auth + tenant context
orderRouter.use(authenticate, tenantContext);

const IdParamsSchema = z.object({ id: z.string().uuid() });

/** POST /api/v1/orders — Create order */
orderRouter.post(
  '/',
  idempotency,
  validate({ body: CanonicalOrderCreateSchema }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const order = await orderService.createOrder(ctx, req.body);
      res.status(201).json({ data: order });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/orders — List orders */
orderRouter.get(
  '/',
  validate({ query: OrderListQuerySchema }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const q = getValidatedQuery<z.infer<typeof OrderListQuerySchema>>(req);
      const result = await orderService.listOrders(ctx, q);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/orders/:id — Get order with line items */
orderRouter.get(
  '/:id',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      const result = await orderService.getOrderById(ctx, id);
      if (!result) {
        res.status(404).json({ error: { code: 'FC_ERR_ORDER_NOT_FOUND', message: 'Order not found' } });
        return;
      }
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/v1/orders/:id — Update order */
orderRouter.patch(
  '/:id',
  validate({ params: IdParamsSchema, body: CanonicalOrderUpdateSchema }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const { id: updateId } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      const order = await orderService.updateOrder(ctx, updateId, req.body);
      res.json({ data: order });
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/orders/:id/confirm — Confirm order (triggers EDI 855) */
orderRouter.post(
  '/:id/confirm',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const { id: confirmId } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      const order = await orderService.confirmOrder(ctx, confirmId);
      res.json({ data: order });
    } catch (err) {
      next(err);
    }
  },
);
