/**
 * CA2: CA Client routes — CRUD clients, health scores
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

export const clientRouter = Router();

// All client routes require auth + CA tenant context
clientRouter.use(authenticate, caTenantContext);

const ClientCreateSchema = z.object({
  client_name: z.string().min(1),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
  email: z.string().email(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  tally_id: z.string().optional(),
  tally_status: z.enum(['pending', 'connected', 'error']).optional(),
});

const ClientUpdateSchema = ClientCreateSchema.partial();

const ClientListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().max(200).optional(),
  status: z.enum(['connected', 'pending', 'error']).optional(),
  health_min: z.coerce.number().min(0).max(100).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const IdParamsSchema = z.object({ id: z.string().uuid() });

const caNotImplemented = (): never => {
  throw new FcError(
    'FC_ERR_FEATURE_DISABLED',
    'CA module not yet implemented',
    { feature: 'ca_module' },
    501,
  );
};

/** POST /api/v1/ca/clients — Add client */
clientRouter.post(
  '/',
  validate({ body: ClientCreateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/clients — List clients (paginated, filtered) */
clientRouter.get(
  '/',
  validate({ query: ClientListQuerySchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/clients/:id — Get client detail + health score */
clientRouter.get(
  '/:id',
  validate({ params: IdParamsSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/v1/ca/clients/:id — Update client */
clientRouter.patch(
  '/:id',
  validate({ params: IdParamsSchema, body: ClientUpdateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/clients/:id/health — Get health score history */
clientRouter.get(
  '/:id/health',
  validate({ params: IdParamsSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/clients/:id/bridge — Link bridge agent */
clientRouter.post(
  '/:id/bridge',
  validate({ params: IdParamsSchema, body: z.object({ bridge_id: z.string().uuid().optional() }) }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);
