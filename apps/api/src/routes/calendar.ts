/**
 * B16: Calendar + escalation routes.
 */

import { Router } from 'express';
import { z } from 'zod';
import { PaginationSchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery } from '../middleware/validate.js';
import { withTenantTransaction, withTenantClient, insertOne, paginatedQuery } from '@fc/database';

export const calendarRouter = Router();
calendarRouter.use(authenticate, tenantContext);

const CalendarEntryCreate = z.object({
  entry_date: z.coerce.date(),
  entry_type: z.string().max(50),
  title: z.string().max(255),
  description: z.string().optional(),
  source: z.string().max(50).default('manual'),
  suppress_alerts: z.boolean().default(false),
});

calendarRouter.post('/', validate({ body: CalendarEntryCreate }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const entry = await withTenantTransaction(ctx, async (client) => {
      return insertOne(client,
        `INSERT INTO calendar_entries (factory_id, entry_date, entry_type, title, description, source, suppress_alerts)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, req.body.entry_date, req.body.entry_type, req.body.title,
         req.body.description ?? null, req.body.source, req.body.suppress_alerts]);
    });
    res.status(201).json({ data: entry });
  } catch (err) { next(err); }
});

calendarRouter.get('/', validate({ query: PaginationSchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}) }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<{ page: number; pageSize: number; from?: Date; to?: Date }>(req);
    const result = await withTenantClient(ctx, async (client) => {
      const params: unknown[] = [];
      let sql = 'SELECT * FROM calendar_entries WHERE 1=1';
      let idx = 1;
      if (q.from) { sql += ` AND entry_date >= $${idx++}`; params.push(q.from); }
      if (q.to) { sql += ` AND entry_date <= $${idx++}`; params.push(q.to); }
      sql += ' ORDER BY entry_date ASC';
      return paginatedQuery(client, sql, params, q.page, q.pageSize);
    });
    res.json(result);
  } catch (err) { next(err); }
});
