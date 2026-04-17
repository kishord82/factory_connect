/**
 * CA6: CA Notice routes — Create, manage, escalate notices
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

export const noticeRouter = Router();

// All notice routes require auth + CA tenant context
noticeRouter.use(authenticate, caTenantContext);

const NoticeCreateSchema = z.object({
  client_id: z.string().uuid(),
  notice_type: z.enum(['income_tax', 'gst', 'tds', 'professional_tax', 'audit', 'inspection', 'other']),
  title: z.string().min(1),
  description: z.string().optional(),
  notice_number: z.string().optional(),
  received_date: z.string().datetime(),
  due_date: z.string().datetime(),
  authority: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const NoticeUpdateSchema = NoticeCreateSchema.partial();

const NoticeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['received', 'under_review', 'in_progress', 'responded', 'resolved', 'escalated']).optional(),
  client_id: z.string().uuid().optional(),
  type: z.enum(['income_tax', 'gst', 'tds', 'professional_tax', 'audit', 'inspection', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().max(200).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const IdParamsSchema = z.object({ id: z.string().uuid() });

const NoticeEscalateSchema = z.object({
  reason: z.string(),
  escalated_to: z.string().optional(),
});

const caNotImplemented = (): never => {
  throw new FcError(
    'FC_ERR_FEATURE_DISABLED',
    'CA module not yet implemented',
    { feature: 'ca_module' },
    501,
  );
};

/** POST /api/v1/ca/notices — Create notice */
noticeRouter.post(
  '/',
  validate({ body: NoticeCreateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/notices — List notices (paginated, filtered) */
noticeRouter.get(
  '/',
  validate({ query: NoticeListQuerySchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/notices/:id — Get notice detail */
noticeRouter.get(
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

/** PATCH /api/v1/ca/notices/:id — Update notice */
noticeRouter.patch(
  '/:id',
  validate({ params: IdParamsSchema, body: NoticeUpdateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/notices/:id/escalate — Escalate notice */
noticeRouter.post(
  '/:id/escalate',
  validate({ params: IdParamsSchema, body: NoticeEscalateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/notices/deadlines — Upcoming deadlines */
noticeRouter.get('/deadlines', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/notices/dashboard — Notice dashboard */
noticeRouter.get('/dashboard', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});
