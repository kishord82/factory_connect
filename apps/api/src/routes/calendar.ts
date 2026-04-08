/**
 * B16: Calendar + escalation routes.
 */

import { Router } from 'express';
import { z } from 'zod';
import { PaginationSchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantTransaction, withTenantClient, insertOne, paginatedQuery } from '@fc/database';
import { parsePagination, buildSearchWhere, buildOrderBy } from '../utils/pagination.js';

export const calendarRouter = Router();
calendarRouter.use(authenticate, tenantContext);

const CALENDAR_SORT_COLUMNS = ['entry_date', 'created_at', 'entry_type'];
const CALENDAR_SEARCH_COLUMNS = ['ce.title', 'ce.entry_type'];

const CalendarEntryCreate = z.object({
  entry_date: z.coerce.date(),
  entry_type: z.string().max(50),
  title: z.string().max(255),
  description: z.string().optional(),
  source: z.string().max(50).default('manual'),
  suppress_alerts: z.boolean().default(false),
});

const CalendarListQuery = PaginationSchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

calendarRouter.post('/', validate({ body: CalendarEntryCreate }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const entry = await withTenantTransaction(ctx, async (client: PoolClient) => {
      return insertOne(client,
        `INSERT INTO platform.calendar_entries (factory_id, entry_date, entry_type, title, description, source, suppress_alerts)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, req.body.entry_date, req.body.entry_type, req.body.title,
         req.body.description ?? null, req.body.source, req.body.suppress_alerts]);
    });
    res.status(201).json({ data: entry });
  } catch (err) { next(err); }
});

calendarRouter.get('/', validate({ query: CalendarListQuery }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof CalendarListQuery>>(req);
    const params = parsePagination(req, 'entry_date');

    const { clause: searchClause, values: searchValues, nextIndex } = buildSearchWhere(
      params.search, CALENDAR_SEARCH_COLUMNS, 2,
    );

    const extraParams: unknown[] = [];
    const extraConditions: string[] = [];
    let idx = nextIndex;

    if (q.from) { extraConditions.push(`ce.entry_date >= $${idx++}`); extraParams.push(q.from); }
    if (q.to) { extraConditions.push(`ce.entry_date <= $${idx++}`); extraParams.push(q.to); }

    const whereSearch = searchClause ? `AND ${searchClause}` : '';
    const whereExtra = extraConditions.length > 0 ? `AND ${extraConditions.join(' AND ')}` : '';
    const orderBy = buildOrderBy(params.sort, params.order, CALENDAR_SORT_COLUMNS);

    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      return paginatedQuery(
        client,
        `SELECT id, factory_id, entry_date, entry_type, title, description, source, suppress_alerts, created_at
         FROM platform.calendar_entries ce
         WHERE ce.factory_id = $1 ${whereSearch} ${whereExtra} ${orderBy}`,
        [ctx.tenantId, ...searchValues, ...extraParams],
        params.page,
        params.limit,
      );
    });
    res.json(result);
  } catch (err) { next(err); }
});
