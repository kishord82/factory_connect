/**
 * B24: Webhook routes — register, list, delete, and test webhooks.
 */

import { Router } from 'express';
import { z } from 'zod';
import { OutboxEventTypeSchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedBody, getValidatedParams } from '../middleware/validate.js';
import * as webhookService from '../services/webhook-service.js';

export const webhookRouter = Router();

// All webhook routes require auth + tenant context
webhookRouter.use(authenticate, tenantContext);

// ═══════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const RegisterWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  events: z.array(OutboxEventTypeSchema).min(1, 'At least one event type is required'),
  secret: z.string().min(20, 'Secret must be at least 20 characters'),
  custom_headers: z.record(z.string()).optional(),
});

const IdParamsSchema = z.object({ id: z.string().uuid() });

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

/** POST /api/v1/webhooks — Register a new webhook */
webhookRouter.post(
  '/',
  validate({ body: RegisterWebhookSchema }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const data = getValidatedBody<z.infer<typeof RegisterWebhookSchema>>(req);
      const webhook = await webhookService.registerWebhook(ctx, data);
      res.status(201).json({ data: webhook });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/webhooks — List registered webhooks */
webhookRouter.get(
  '/',
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const page = parseInt((req.query.page as string) ?? '1', 10);
      const pageSize = parseInt((req.query.pageSize as string) ?? '25', 10);
      const result = await webhookService.listWebhooks(ctx, page, pageSize);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/** DELETE /api/v1/webhooks/:id — Delete a webhook */
webhookRouter.delete(
  '/:id',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      await webhookService.deleteWebhook(ctx, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/v1/webhooks/:id/test — Send test payload to webhook */
webhookRouter.post(
  '/:id/test',
  validate({ params: IdParamsSchema }),
  async (req, res, next) => {
    try {
      const ctx = getRequestContext(req);
      const { id } = getValidatedParams<z.infer<typeof IdParamsSchema>>(req);
      const result = await webhookService.testWebhook(ctx, id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);
