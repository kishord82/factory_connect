/**
 * CA8: CA Communication routes — WhatsApp, templates, communication log
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { caTenantContext, getCaRequestContext } from '../../middleware/ca-tenant-context.js';
import { validate, getValidatedQuery } from '../../middleware/validate.js';
import { z } from 'zod';

export const communicationRouter = Router();

// WhatsApp webhook route (no auth)
const whatsappWebhookRouter = Router();

const WhatsappSendSchema = z.object({
  recipient_id: z.string().uuid(),
  message: z.string().min(1),
  message_type: z.enum(['text', 'document', 'notice', 'reminder']).optional(),
  template_id: z.string().uuid().optional(),
});

const TemplateCreateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['notice', 'reminder', 'update', 'request', 'confirmation']),
  content: z.string().min(1),
  variables: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
});

const CommunicationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(['whatsapp', 'email', 'sms']).optional(),
  recipient_id: z.string().uuid().optional(),
});

// Protected routes require auth + CA tenant context
communicationRouter.use(authenticate, caTenantContext);

/** POST /api/v1/ca/communication/whatsapp/send — Send WhatsApp message */
communicationRouter.post(
  '/whatsapp/send',
  validate({ body: WhatsappSendSchema }),
  async (req, res, next) => {
    try {
      // TODO: Implement WhatsApp send service
      res.status(202).json({
        data: {
          id: 'msg-1',
          recipient_id: req.body.recipient_id,
          message: req.body.message,
          message_type: req.body.message_type || 'text',
          channel: 'whatsapp',
          status: 'sent',
          sent_at: new Date().toISOString(),
          delivered_at: null,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/communication/whatsapp/webhook — Webhook receiver (no auth) */
whatsappWebhookRouter.post('/webhook', async (_req, res, next) => {
  try {
    // TODO: Implement webhook handler (verify signature)
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Mount webhook route without auth requirement
communicationRouter.use('/', whatsappWebhookRouter);

/** GET /api/v1/ca/communication/templates — List templates */
communicationRouter.get(
  '/templates',
  validate({ query: z.object({ category: z.string().optional() }) }),
  async (_req, res, next) => {
    try {
      // TODO: Implement list templates service
      res.json({
        data: [
          {
            id: 'tmpl-1',
            name: 'Notice Received Acknowledgment',
            category: 'notice',
            content: 'Dear {client_name}, we have received the notice dated {notice_date}. Our team is reviewing it and will get back to you soon.',
            variables: ['client_name', 'notice_date'],
            usage_count: 45,
            is_default: true,
            created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'tmpl-2',
            name: 'Document Request',
            category: 'request',
            content: 'Hi {client_name}, we need the following documents for {filing_type} filing: {document_list}. Please share them by {due_date}.',
            variables: ['client_name', 'filing_type', 'document_list', 'due_date'],
            usage_count: 123,
            is_default: true,
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      });
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/communication/templates — Create template */
communicationRouter.post(
  '/templates',
  validate({ body: TemplateCreateSchema }),
  async (req, res, next) => {
    try {
      const _ctx = getCaRequestContext(req);
      // TODO: Implement template creation service
      res.status(201).json({
        data: {
          id: 'tmpl-3',
          firm_id: _ctx.caFirmId,
          ...req.body,
          usage_count: 0,
          created_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/communication/log — Communication log (paginated) */
communicationRouter.get(
  '/log',
  validate({ query: CommunicationListQuerySchema }),
  async (req, res, next) => {
    try {
      const q = getValidatedQuery<z.infer<typeof CommunicationListQuerySchema>>(req);
      // TODO: Implement communication log service
      res.json({
        data: [
          {
            id: 'msg-1',
            recipient_id: 'client-1',
            recipient_name: 'Acme Corp',
            type: 'whatsapp',
            direction: 'outbound',
            message: 'Document request sent for GST filing',
            status: 'delivered',
            sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            delivered_at: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
            read_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            id: 'msg-2',
            recipient_id: 'client-2',
            recipient_name: 'Ravi Trading',
            type: 'whatsapp',
            direction: 'inbound',
            message: 'We have all the documents ready',
            status: 'received',
            sent_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            delivered_at: null,
            read_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          },
        ],
        total: 456,
        page: q.page,
        pageSize: q.pageSize,
        totalPages: Math.ceil(456 / q.pageSize),
      });
    } catch (err) {
      next(err);
    }
  },
);
