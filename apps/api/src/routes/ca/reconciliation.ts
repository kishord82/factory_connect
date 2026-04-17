/**
 * CA4: CA Reconciliation routes — Bank recon, GSTR-2B recon, BRS
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

export const reconciliationRouter = Router();

// All reconciliation routes require auth + CA tenant context
reconciliationRouter.use(authenticate, caTenantContext);

const BankReconSchema = z.object({
  client_id: z.string().uuid(),
  period: z.string(), // YYYY-MM
  bank_account_id: z.string().optional(),
});

const Gstr2bReconSchema = z.object({
  client_id: z.string().uuid(),
  period: z.string(), // YYYY-MM
});

const ReconSessionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  client_id: z.string().uuid().optional(),
  type: z.enum(['bank', 'gstr2b']).optional(),
  search: z.string().max(200).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const IdParamsSchema = z.object({ id: z.string().uuid() });

const ManualMatchSchema = z.object({
  unmatched_items: z.array(z.string().uuid()),
  matched_items: z.array(z.string().uuid()),
  reason: z.string().optional(),
});

const caNotImplemented = (): never => {
  throw new FcError(
    'FC_ERR_FEATURE_DISABLED',
    'CA module not yet implemented',
    { feature: 'ca_module' },
    501,
  );
};

/** POST /api/v1/ca/recon/bank — Start bank reconciliation */
reconciliationRouter.post(
  '/bank',
  validate({ body: BankReconSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/recon/gstr2b — Start GSTR-2B reconciliation */
reconciliationRouter.post(
  '/gstr2b',
  validate({ body: Gstr2bReconSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/recon/sessions — List recon sessions */
reconciliationRouter.get(
  '/sessions',
  validate({ query: ReconSessionListQuerySchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/recon/sessions/:id — Get session detail with items */
reconciliationRouter.get(
  '/sessions/:id',
  validate({ params: IdParamsSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/recon/sessions/:id/match — Manual match */
reconciliationRouter.post(
  '/sessions/:id/match',
  validate({ params: IdParamsSchema, body: ManualMatchSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/recon/sessions/:id/brs — Generate BRS */
reconciliationRouter.get(
  '/sessions/:id/brs',
  validate({ params: IdParamsSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);
