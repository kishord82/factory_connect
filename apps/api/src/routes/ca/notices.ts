/**
 * CA6: CA Notice routes — Create, manage, escalate notices
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { caTenantContext, getCaRequestContext } from '../../middleware/ca-tenant-context.js';
import { validate, getValidatedParams, getValidatedQuery } from '../../middleware/validate.js';
import { z } from 'zod';

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
});

const IdParamsSchema = z.object({ id: z.string().uuid() });

const NoticeEscalateSchema = z.object({
  reason: z.string(),
  escalated_to: z.string().optional(),
});

/** POST /api/v1/ca/notices — Create notice */
noticeRouter.post(
  '/',
  validate({ body: NoticeCreateSchema }),
  async (req, res, next) => {
    try {
            // TODO: Implement notice creation service
      res.status(201).json({
        data: {
          id: 'notice-1',
          ...req.body,
          status: 'received',
          assigned_to: null,
          created_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/notices — List notices (paginated, filtered) */
noticeRouter.get(
  '/',
  validate({ query: NoticeListQuerySchema }),
  async (req, res, next) => {
    try {
      const q = getValidatedQuery<z.infer<typeof NoticeListQuerySchema>>(req);
      // TODO: Implement list notices service
      res.json({
        data: [
          {
            id: 'notice-1',
            client_id: 'client-1',
            client_name: 'Acme Corp',
            notice_type: 'gst',
            title: 'GST Audit Notice',
            notice_number: 'GST/AUDIT/2024/001',
            received_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            days_remaining: 20,
            status: 'in_progress',
            priority: 'high',
            assigned_to: 'staff-1',
          },
          {
            id: 'notice-2',
            client_id: 'client-2',
            client_name: 'Ravi Trading',
            notice_type: 'income_tax',
            title: 'Income Tax Assessment Notice',
            notice_number: 'IT/ASSESS/2024/002',
            received_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            days_remaining: 5,
            status: 'escalated',
            priority: 'critical',
            assigned_to: 'staff-2',
          },
        ],
        total: 12,
        page: q.page,
        pageSize: q.pageSize,
        totalPages: Math.ceil(12 / q.pageSize),
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/notices/:id — Get notice detail */
noticeRouter.get(
  '/:id',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement get notice service
      res.json({
        data: {
          id,
          client_id: 'client-1',
          client_name: 'Acme Corp',
          notice_type: 'gst',
          title: 'GST Audit Notice',
          description: 'Notice for GST audit for FY 2023-24',
          notice_number: 'GST/AUDIT/2024/001',
          received_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          authority: 'GST Commissionerate, Hyderabad',
          status: 'in_progress',
          priority: 'high',
          assigned_to: 'staff-1',
          actions_taken: [
            { date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), action: 'Notice received and logged', done_by: 'staff-1' },
            { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), action: 'Preliminary review completed', done_by: 'staff-1' },
          ],
          documents: [
            { id: 'doc-1', name: 'Notice PDF', type: 'pdf', uploaded_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
          ],
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/v1/ca/notices/:id — Update notice */
noticeRouter.patch(
  '/:id',
  validate({ params: IdParamsSchema, body: NoticeUpdateSchema }),
  async (req, res, next) => {
    try {
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement update notice service
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

/** POST /api/v1/ca/notices/:id/escalate — Escalate notice */
noticeRouter.post(
  '/:id/escalate',
  validate({ params: IdParamsSchema, body: NoticeEscalateSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      // TODO: Implement escalate notice service
      res.json({
        data: {
          id,
          status: 'escalated',
          escalation_reason: req.body.reason,
          escalated_to: req.body.escalated_to || 'senior_partner',
          escalated_at: new Date().toISOString(),
          escalated_by: ctx.userId,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/notices/deadlines — Upcoming deadlines */
noticeRouter.get('/deadlines', async (_req, res, next) => {
  try {
        // TODO: Implement deadlines service
    res.json({
      data: [
        {
          id: 'notice-2',
          client_name: 'Ravi Trading',
          notice_type: 'income_tax',
          title: 'Income Tax Assessment Notice',
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          days_remaining: 5,
          priority: 'critical',
          status: 'escalated',
        },
        {
          id: 'notice-1',
          client_name: 'Acme Corp',
          notice_type: 'gst',
          title: 'GST Audit Notice',
          due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          days_remaining: 20,
          priority: 'high',
          status: 'in_progress',
        },
      ],
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/notices/dashboard — Notice dashboard */
noticeRouter.get('/dashboard', async (_req, res, next) => {
  try {
        // TODO: Implement notices dashboard service
    res.json({
      data: {
        total_notices: 12,
        received_this_month: 2,
        in_progress: 5,
        escalated: 1,
        resolved: 6,
        critical_notices: 1,
        notices_by_type: {
          income_tax: { total: 3, in_progress: 2, escalated: 1 },
          gst: { total: 5, in_progress: 2, escalated: 0 },
          tds: { total: 2, in_progress: 1, escalated: 0 },
          other: { total: 2, in_progress: 0, escalated: 0 },
        },
        upcoming_deadlines: [
          { title: 'Income Tax Assessment Notice', due_in_days: 5 },
          { title: 'GST Audit Notice', due_in_days: 20 },
          { title: 'TDS Notice', due_in_days: 35 },
        ],
        average_response_time: 8.5,
      },
    });
  } catch (err) {
    next(err);
  }
});
