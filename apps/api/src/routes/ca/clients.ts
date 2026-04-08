/**
 * CA2: CA Client routes — CRUD clients, health scores
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { caTenantContext, getCaRequestContext } from '../../middleware/ca-tenant-context.js';
import { validate, getValidatedParams, getValidatedQuery } from '../../middleware/validate.js';
import { z } from 'zod';

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

/** POST /api/v1/ca/clients — Add client */
clientRouter.post(
  '/',
  validate({ body: ClientCreateSchema }),
  async (req, res, next) => {
    try {
      const _ctx = getCaRequestContext(req);
      // TODO: Implement client creation service
      res.status(201).json({
        data: {
          id: 'client-1',
          firm_id: _ctx.caFirmId,
          ...req.body,
          health_score: 0,
          created_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/clients — List clients (paginated, filtered) */
clientRouter.get(
  '/',
  validate({ query: ClientListQuerySchema }),
  async (req, res, next) => {
    try {
      const q = getValidatedQuery<z.infer<typeof ClientListQuerySchema>>(req);
      // TODO: Implement list clients service
      res.json({
        data: [
          {
            id: 'client-1',
            client_name: 'Acme Corp',
            gst_number: '27AACCT9999X1Z0',
            email: 'contact@acme.com',
            tally_status: 'connected',
            health_score: 92,
            active_filings: 3,
            overdue_documents: 0,
            created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'client-2',
            client_name: 'Ravi Trading',
            gst_number: '18AABCT0001A1Z0',
            email: 'info@ravitrading.com',
            tally_status: 'pending',
            health_score: 65,
            active_filings: 2,
            overdue_documents: 2,
            created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        total: 23,
        page: q.page,
        pageSize: q.pageSize,
        totalPages: Math.ceil(23 / q.pageSize),
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/clients/:id — Get client detail + health score */
clientRouter.get(
  '/:id',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const _ctx = getCaRequestContext(req);
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement get client service
      res.json({
        data: {
          id,
          firm_id: _ctx.caFirmId,
          client_name: 'Acme Corp',
          gst_number: '27AACCT9999X1Z0',
          pan_number: 'AAAPF0001A',
          email: 'contact@acme.com',
          phone_number: '+91-98765-43210',
          address: '123 Business Park',
          city: 'Bangalore',
          state: 'KA',
          postal_code: '560001',
          tally_id: 'tally-123',
          tally_status: 'connected',
          health_score: 92,
          compliance_status: {
            gst: 'compliant',
            tds: 'compliant',
            mca: 'pending',
            income_tax: 'compliant',
          },
          last_sync: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/v1/ca/clients/:id — Update client */
clientRouter.patch(
  '/:id',
  validate({ params: IdParamsSchema, body: ClientUpdateSchema }),
  async (req, res, next) => {
    try {
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement update client service
      res.json({
        data: {
          id,
          ...req.body,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/clients/:id/health — Get health score history */
clientRouter.get(
  '/:id/health',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement health score service
      res.json({
        data: {
          client_id: id,
          current_score: 92,
          history: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), score: 85 },
            { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), score: 88 },
            { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), score: 91 },
            { date: new Date().toISOString(), score: 92 },
          ],
          breakdown: {
            filing_compliance: 95,
            document_collection: 90,
            communication_response: 92,
            payment_timeliness: 88,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/clients/:id/bridge — Link bridge agent */
clientRouter.post(
  '/:id/bridge',
  validate({ params: IdParamsSchema, body: z.object({ bridge_id: z.string().uuid().optional() }) }),
  async (req, res, next) => {
    try {
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement bridge linking service
      res.json({
        data: {
          client_id: id,
          bridge_id: req.body.bridge_id || 'bridge-agent-1',
          status: 'linked',
          linked_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
