/**
 * CA5: CA Document request routes — Create, manage, verify document requests
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

export const documentRouter = Router();

// All document routes require auth + CA tenant context
documentRouter.use(authenticate, caTenantContext);

const DocumentRequestSchema = z.object({
  client_id: z.string().uuid(),
  document_type: z.enum(['invoice', 'receipt', 'statement', 'bank_passbook', 'expense_bill', 'debit_note', 'credit_note', 'other']),
  description: z.string().optional(),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const BulkDocumentRequestSchema = z.object({
  client_id: z.string().uuid(),
  document_type: z.enum(['invoice', 'receipt', 'statement', 'bank_passbook', 'expense_bill', 'debit_note', 'credit_note', 'other']),
  period: z.string(), // YYYY-MM
  count: z.number().int().positive(),
  auto_chase: z.boolean().optional(),
});

const DocumentRequestListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['pending', 'submitted', 'verified', 'rejected', 'overdue']).optional(),
  client_id: z.string().uuid().optional(),
  type: z.enum(['invoice', 'receipt', 'statement', 'bank_passbook', 'expense_bill', 'debit_note', 'credit_note', 'other']).optional(),
  search: z.string().max(200).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const IdParamsSchema = z.object({ id: z.string().uuid() });

const DocumentVerifySchema = z.object({
  status: z.enum(['verified', 'rejected']),
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

/** POST /api/v1/ca/documents/request — Create document request */
documentRouter.post(
  '/request',
  validate({ body: DocumentRequestSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/documents/request/bulk — Bulk create requests */
documentRouter.post(
  '/request/bulk',
  validate({ body: BulkDocumentRequestSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/documents/requests — List document requests */
documentRouter.get(
  '/requests',
  validate({ query: DocumentRequestListQuerySchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/v1/ca/documents/requests/:id — Update request */
documentRouter.patch(
  '/requests/:id',
  validate({
    params: IdParamsSchema,
    body: z.object({
      due_date: z.string().datetime().optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      description: z.string().optional(),
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

/** POST /api/v1/ca/documents/requests/:id/verify — Verify received document */
documentRouter.post(
  '/requests/:id/verify',
  validate({ params: IdParamsSchema, body: DocumentVerifySchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/documents/dashboard — Collection dashboard */
documentRouter.get('/dashboard', async (_req, _res, next) => {
  try {
    caNotImplemented();
  } catch (err) {
    next(err);
  }
});
