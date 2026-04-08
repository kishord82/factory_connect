/**
 * B26: Analytics/reporting routes — dashboard stats and metrics.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantClient } from '@fc/database';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate, tenantContext);

const DateRangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** GET /analytics/overview — combined overview for portal analytics page */
analyticsRouter.get('/overview', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      const [ordersByStatus, shipmentsByStatus, topBuyers, revenueByMonth] = await Promise.all([
        client.query(
          `SELECT status, COUNT(*)::int as count FROM canonical_orders GROUP BY status ORDER BY count DESC`,
        ),
        client.query(
          `SELECT status, COUNT(*)::int as count FROM canonical_shipments GROUP BY status ORDER BY count DESC`,
        ),
        client.query(
          `SELECT b.name, COUNT(*)::int as total_orders
           FROM canonical_orders o
           JOIN connections c ON o.connection_id = c.id
           JOIN buyers b ON c.buyer_id = b.id
           GROUP BY b.name ORDER BY total_orders DESC LIMIT 5`,
        ),
        client.query(
          `SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
                  COALESCE(SUM(total_amount), 0)::numeric as revenue
           FROM canonical_orders
           WHERE created_at >= NOW() - INTERVAL '6 months'
           GROUP BY TO_CHAR(created_at, 'YYYY-MM')
           ORDER BY month ASC`,
        ),
      ]);

      const orderStatusMap: Record<string, number> = {};
      for (const row of ordersByStatus.rows) {
        orderStatusMap[row.status] = row.count;
      }

      const shipmentStatusMap: Record<string, number> = {};
      for (const row of shipmentsByStatus.rows) {
        shipmentStatusMap[row.status] = row.count;
      }

      const revenueMap: Record<string, number> = {};
      for (const row of revenueByMonth.rows) {
        revenueMap[row.month] = Number(row.revenue);
      }

      return {
        orders_by_status: orderStatusMap,
        shipments_by_status: shipmentStatusMap,
        top_buyers: topBuyers.rows,
        revenue_by_month: revenueMap,
      };
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

/** GET /analytics/dashboard — summary stats */
analyticsRouter.get('/dashboard', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const stats = await withTenantClient(ctx, async (client: PoolClient) => {
      const [orders, shipments, invoices, connections] = await Promise.all([
        client.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'DRAFT\') as draft, COUNT(*) FILTER (WHERE status = \'CONFIRMED\') as confirmed FROM canonical_orders'),
        client.query('SELECT COUNT(*) as total FROM canonical_shipments'),
        client.query('SELECT COUNT(*) as total FROM canonical_invoices'),
        client.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'active\') as active FROM connections'),
      ]);
      return {
        orders: orders.rows[0],
        shipments: shipments.rows[0],
        invoices: invoices.rows[0],
        connections: connections.rows[0],
      };
    });
    res.json({ data: stats });
  } catch (err) { next(err); }
});

/** GET /analytics/order-volume — orders over time */
analyticsRouter.get('/order-volume', validate({ query: DateRangeQuery }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof DateRangeQuery>>(req);
    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      const params: unknown[] = [];
      let sql = `SELECT DATE(created_at) as date, COUNT(*) as count FROM canonical_orders WHERE 1=1`;
      let idx = 1;
      if (q.from) { sql += ` AND created_at >= $${idx++}`; params.push(q.from); }
      if (q.to) { sql += ` AND created_at <= $${idx++}`; params.push(q.to); }
      sql += ' GROUP BY DATE(created_at) ORDER BY date ASC';
      const r = await client.query(sql, params);
      return r.rows;
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

/** GET /analytics/saga-health — saga status distribution */
analyticsRouter.get('/saga-health', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      const r = await client.query(
        `SELECT current_step, COUNT(*) as count,
         COUNT(*) FILTER (WHERE step_deadline < NOW()) as breached
         FROM order_sagas GROUP BY current_step ORDER BY count DESC`,
      );
      return r.rows;
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

/** GET /analytics/escalations — recent escalations */
analyticsRouter.get('/escalations', validate({ query: DateRangeQuery }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof DateRangeQuery>>(req);
    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      const params: unknown[] = [];
      let sql = `SELECT trigger_type, COUNT(*) as count, MAX(created_at) as latest FROM escalation_log WHERE 1=1`;
      let idx = 1;
      if (q.from) { sql += ` AND created_at >= $${idx++}`; params.push(q.from); }
      if (q.to) { sql += ` AND created_at <= $${idx++}`; params.push(q.to); }
      sql += ' GROUP BY trigger_type ORDER BY count DESC';
      const r = await client.query(sql, params);
      return r.rows;
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});
