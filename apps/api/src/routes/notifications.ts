/**
 * B19: Notification routes.
 */
import { Router } from 'express';
import { z } from 'zod';
import { PaginationSchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery } from '../middleware/validate.js';
import * as notificationService from '../services/notification-service.js';

export const notificationRouter = Router();
notificationRouter.use(authenticate, tenantContext);

const ListQuery = PaginationSchema.extend({
  unread_only: z.coerce.boolean().default(false),
});

notificationRouter.get('/', validate({ query: ListQuery }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof ListQuery>>(req);
    const result = await notificationService.listNotifications(ctx, q.page, q.pageSize, q.unread_only);
    res.json(result);
  } catch (err) { next(err); }
});

notificationRouter.post('/mark-read', validate({
  body: z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }),
}), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const count = await notificationService.markAsRead(ctx, req.body.ids);
    res.json({ data: { updated: count } });
  } catch (err) { next(err); }
});
