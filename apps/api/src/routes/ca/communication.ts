/**
 * CA8: CA Communication routes — WhatsApp, templates, communication log
 */

import { FcError } from '@fc/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { caTenantContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';

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

const caNotImplemented = (): never => {
  throw new FcError(
    'FC_ERR_FEATURE_DISABLED',
    'CA module not yet implemented',
    { feature: 'ca_module' },
    501,
  );
};

/** POST /api/v1/ca/communication/whatsapp/send — Send WhatsApp message */
communicationRouter.post(
  '/whatsapp/send',
  validate({ body: WhatsappSendSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/communication/whatsapp/webhook — Webhook receiver (no auth) */
whatsappWebhookRouter.post('/webhook', async (_req, _res, next) => {
  try {
    caNotImplemented();
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
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/ca/communication/templates — Create template */
communicationRouter.post(
  '/templates',
  validate({ body: TemplateCreateSchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/communication/log — Communication log (paginated) */
communicationRouter.get(
  '/log',
  validate({ query: CommunicationListQuerySchema }),
  async (_req, _res, next) => {
    try {
      caNotImplemented();
    } catch (err) {
      next(err);
    }
  },
);
