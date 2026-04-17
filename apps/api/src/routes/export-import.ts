/**
 * B17: Export/Import routes — data export (CSV/JSON) and import.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantClient } from '@fc/database';

export const exportRouter = Router();
exportRouter.use(authenticate, tenantContext);

const ExportSchema = z.object({
  entity_type: z.enum(['orders', 'shipments', 'invoices', 'connections']),
  format: z.enum(['json', 'csv']).default('json'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

interface ExportConfig {
  qualifiedTable: string;
  columns: string;
}

const EXPORT_MAP: Record<string, ExportConfig> = {
  orders: {
    qualifiedTable: 'orders.canonical_orders',
    columns:
      'id, factory_id, buyer_id, connection_id, buyer_po_number, factory_order_number, ' +
      'order_date, requested_ship_date, currency, subtotal, tax_amount, total_amount, ' +
      'source_type, status, created_at, updated_at',
  },
  shipments: {
    qualifiedTable: 'orders.canonical_shipments',
    columns:
      'id, factory_id, order_id, connection_id, shipment_date, carrier_name, tracking_number, ' +
      'weight, weight_uom, status, created_at, updated_at',
  },
  invoices: {
    qualifiedTable: 'orders.canonical_invoices',
    columns:
      'id, factory_id, order_id, shipment_id, connection_id, invoice_number, invoice_date, ' +
      'due_date, subtotal, tax_amount, total_amount, status, created_at, updated_at',
  },
  connections: {
    qualifiedTable: 'core.connections',
    columns:
      'id, factory_id, buyer_id, source_type, connection_mode, buyer_endpoint, protocol, ' +
      'status, created_at, updated_at',
  },
};

exportRouter.get('/', validate({ query: ExportSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof ExportSchema>>(req);
    const exportConfig = EXPORT_MAP[q.entity_type];

    const data = await withTenantClient(ctx, async (client: PoolClient) => {
      const params: unknown[] = [];
      let sql = `SELECT ${exportConfig.columns} FROM ${exportConfig.qualifiedTable} WHERE 1=1`;
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
