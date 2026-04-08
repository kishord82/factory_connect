/**
 * CA4: CA Reconciliation routes — Bank recon, GSTR-2B recon, BRS
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate, getValidatedParams, getValidatedQuery } from '../../middleware/validate.js';
import { z } from 'zod';

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
});

const IdParamsSchema = z.object({ id: z.string().uuid() });

const ManualMatchSchema = z.object({
  unmatched_items: z.array(z.string().uuid()),
  matched_items: z.array(z.string().uuid()),
  reason: z.string().optional(),
});

/** POST /api/v1/ca/recon/bank — Start bank reconciliation */
reconciliationRouter.post(
  '/bank',
  validate({ body: BankReconSchema }),
  async (req, res, next) => {
    try {
            // TODO: Implement bank recon service
      res.status(201).json({
        data: {
          id: 'session-bank-1',
          client_id: req.body.client_id,
          type: 'bank',
          period: req.body.period,
          status: 'in_progress',
          bank_transactions: 125,
          matched_transactions: 0,
          unmatched_transactions: 125,
          match_rate: 0,
          started_at: new Date().toISOString(),
          estimated_completion: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/recon/gstr2b — Start GSTR-2B reconciliation */
reconciliationRouter.post(
  '/gstr2b',
  validate({ body: Gstr2bReconSchema }),
  async (req, res, next) => {
    try {
            // TODO: Implement GSTR-2B recon service
      res.status(201).json({
        data: {
          id: 'session-gstr2b-1',
          client_id: req.body.client_id,
          type: 'gstr2b',
          period: req.body.period,
          status: 'in_progress',
          gstr2b_transactions: 89,
          matched_transactions: 0,
          unmatched_transactions: 89,
          match_rate: 0,
          started_at: new Date().toISOString(),
          estimated_completion: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/recon/sessions — List recon sessions */
reconciliationRouter.get(
  '/sessions',
  validate({ query: ReconSessionListQuerySchema }),
  async (req, res, next) => {
    try {
      const q = getValidatedQuery<z.infer<typeof ReconSessionListQuerySchema>>(req);
      // TODO: Implement list sessions service
      res.json({
        data: [
          {
            id: 'session-bank-1',
            client_id: 'client-1',
            client_name: 'Acme Corp',
            type: 'bank',
            period: '2024-03',
            status: 'completed',
            match_rate: 98.4,
            matched_items: 122,
            unmatched_items: 2,
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'session-gstr2b-1',
            client_id: 'client-2',
            client_name: 'Ravi Trading',
            type: 'gstr2b',
            period: '2024-03',
            status: 'in_progress',
            match_rate: 76.4,
            matched_items: 68,
            unmatched_items: 21,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        total: 15,
        page: q.page,
        pageSize: q.pageSize,
        totalPages: Math.ceil(15 / q.pageSize),
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/recon/sessions/:id — Get session detail with items */
reconciliationRouter.get(
  '/sessions/:id',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement get session service
      res.json({
        data: {
          id,
          client_id: 'client-1',
          client_name: 'Acme Corp',
          type: 'bank',
          period: '2024-03',
          status: 'completed',
          match_rate: 98.4,
          matched_items_count: 122,
          unmatched_items_count: 2,
          matched_items: [
            {
              id: 'item-1',
              date: '2024-03-01',
              amount: 50000,
              description: 'Invoice INV-001',
              reference: 'CHK-12345',
            },
          ],
          unmatched_items: [
            {
              id: 'item-2',
              date: '2024-03-15',
              amount: 25000,
              description: 'Transfer to supplier',
              reference: 'TRN-67890',
            },
          ],
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/recon/sessions/:id/match — Manual match */
reconciliationRouter.post(
  '/sessions/:id/match',
  validate({ params: IdParamsSchema, body: ManualMatchSchema }),
  async (req, res, next) => {
    try {
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement manual match service
      res.json({
        data: {
          session_id: id,
          matched_count: req.body.matched_items.length,
          match_rate: 99.2,
          completed_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/recon/sessions/:id/brs — Generate BRS */
reconciliationRouter.get(
  '/sessions/:id/brs',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement BRS generation service
      res.json({
        data: {
          session_id: id,
          period: '2024-03',
          brs_statement: {
            balance_per_bank: 475000,
            balance_per_books: 498200,
            difference: 23200,
            add_deposits_in_transit: [
              { date: '2024-03-30', amount: 25000 },
            ],
            less_outstanding_checks: [
              { check_number: 'CHK-001', amount: 1800 },
            ],
            reconciled_balance: 498200,
          },
          status: 'balanced',
          generated_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
