/**
 * CA3: CA Compliance routes — Filings, exceptions, GST/TDS, dashboard
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

export const complianceRouter = Router();

// All compliance routes require auth + CA tenant context
complianceRouter.use(authenticate, caTenantContext);

const GstPrepareSchema = z.object({
  client_id: z.string().uuid(),
  period: z.string(), // YYYY-MM
  filing_type: z.enum(['gstr1', 'gstr2', 'gstr3b']).optional(),
});

const TdsReconcileSchema = z.object({
  client_id: z.string().uuid(),
  period: z.string(), // YYYY-MM
});

const FilingListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(['gst', 'tds', 'mca', 'income_tax']).optional(),
  status: z.enum(['pending', 'in_progress', 'filed', 'rejected', 'overdue']).optional(),
  client_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const IdParamsSchema = z.object({ id: z.string().uuid() });

const FilingUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'filed', 'rejected']).optional(),
  notes: z.string().optional(),
});

const caNotImplemented = (): never => {
  throw new FcError(
    'FC_ERR_FEATURE_DISABLED',
    'CA module not yet implemented',
    { feature: 'ca_module' },
    501,
  );
};

/** POST /api/v1/ca/compliance/gst/prepare — Trigger GST filing prep */
complianceRouter.post(
  '/gst/prepare',
  validate({ body: GstPrepareSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/compliance/tds/reconcile — Trigger TDS reconciliation */
complianceRouter.post(
  '/tds/reconcile',
  validate({ body: TdsReconcileSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/compliance/filings — List filings (paginated) */
complianceRouter.get(
  '/filings',
  validate({ query: FilingListQuerySchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/compliance/filings/:id — Get filing detail */
complianceRouter.get(
  '/filings/:id',
  validate({ params: IdParamsSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/v1/ca/compliance/filings/:id — Update filing status */
complianceRouter.patch(
  '/filings/:id',
  validate({ params: IdParamsSchema, body: FilingUpdateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/compliance/exceptions — List exceptions */
complianceRouter.get(
  '/exceptions',
  validate({
    query: z.object({
      page: z.coerce.number().int().positive().optional().default(1),
      pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
      severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      client_id: z.string().uuid().optional(),
    }),
  }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/v1/ca/compliance/exceptions/:id — Update exception */
complianceRouter.patch(
  '/exceptions/:id',
  validate({ params: IdParamsSchema, body: z.object({ status: z.enum(['open', 'assigned', 'resolved']).optional(), notes: z.string().optional() }) }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/compliance/dashboard — Compliance dashboard summary */
complianceRouter.get('/dashboard', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});
