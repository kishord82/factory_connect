/**
 * B17: Export/Import routes — data export (CSV/JSON) and import.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery } from '../middleware/validate.js';
import { withTenantClient } from '@fc/database';

export const exportRouter = Router();
exportRouter.use(authenticate, tenantContext);

const ExportSchema = z.object({
  entity_type: z.enum(['orders', 'shipments', 'invoices', 'connections']),
  format: z.enum(['json', 'csv']).default('json'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const TABLE_MAP: Record<string, string> = {
  orders: 'canonical_orders',
  shipments: 'canonical_shipments',
  invoices: 'canonical_invoices',
  connections: 'connections',
};

exportRouter.get('/', validate({ query: ExportSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof ExportSchema>>(req);
    const table = TABLE_MAP[q.entity_type];

    const data = await withTenantClient(ctx, async (client) => {
      const params: unknown[] = [];
      let sql = `SELECT * FROM ${table} WHERE 1=1`;
      let idx = 1;
      if (q.from) {
        sql += ` AND created_at >= $${idx++}`;
        params.push(q.from);
      }
      if (q.to) {
        sql += ` AND created_at <= $${idx++}`;
        params.push(q.to);
      }
      sql += ' ORDER BY created_at DESC LIMIT 10000';
      const result = await client.query(sql, params);
      return result.rows;
    });

    if (q.format === 'csv') {
      if (data.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.send('');
        return;
      }
      const headers = Object.keys(data[0] as Record<string, unknown>);
      const csvRows = [headers.join(',')];
      for (const row of data) {
        const r = row as Record<string, unknown>;
        csvRows.push(
          headers
            .map((h) => {
              const val = r[h];
              if (val === null || val === undefined) return '';
              const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
              return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            })
            .join(','),
        );
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${q.entity_type}_export.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      res.json({ data, count: data.length });
    }
  } catch (err) {
    next(err);
  }
});
