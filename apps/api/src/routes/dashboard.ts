/**
 * B: Dashboard route — Returns summary statistics for the factory.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import type { PoolClient } from '@fc/database';
import { withTenantClient } from '@fc/database';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, tenantContext);

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);

    const summary = await withTenantClient(ctx, async (client: PoolClient) => {
      // Get order counts by status
      const statusResult = await client.query(
        `SELECT status, COUNT(*) as count FROM orders.canonical_orders
         WHERE factory_id = $1 GROUP BY status`,
        [ctx.tenantId],
      );

      // Get recent activity count
      const recentResult = await client.query(
        `SELECT COUNT(*) as count FROM orders.canonical_orders
         WHERE factory_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
        [ctx.tenantId],
      );

      // Get shipment stats
      const shipmentResult = await client.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'dispatched' THEN 1 ELSE 0 END) as dispatched
         FROM orders.canonical_shipments WHERE factory_id = $1`,
        [ctx.tenantId],
      );

      // Get invoice stats
      const invoiceResult = await client.query(
        `SELECT COUNT(*) as total FROM orders.canonical_invoices WHERE factory_id = $1`,
        [ctx.tenantId],
      );

      const ordersByStatus: Record<string, number> = {};
      statusResult.rows.forEach((row: any) => {
        ordersByStatus[row.status] = parseInt(row.count, 10);
      });

      return {
        totalOrders: Object.values(ordersByStatus).reduce((a: number, b: number) => a + b, 0),
        ordersByStatus,
        recentOrders: parseInt(recentResult.rows[0]?.count || 0, 10),
        totalShipments: parseInt(shipmentResult.rows[0]?.total || 0, 10),
        dispatchedShipments: parseInt(shipmentResult.rows[0]?.dispatched || 0, 10),
        totalInvoices: parseInt(invoiceResult.rows[0]?.total || 0, 10),
      };
    });

    res.json({
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});
