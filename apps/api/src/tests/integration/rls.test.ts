/**
 * Integration: Row-Level Security (RLS) — tenant isolation verification
 * Tests that cross-tenant access is properly blocked
 */

import { withTenantTransaction, withTenantClient } from '@fc/database';
import type { PoolClient } from '@fc/database';
import type { RequestContext } from '@fc/shared';
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const BUYER_PROTOCOL = 'edi_x12';
const SQL_SELECT_FACTORY_BY_ID = 'SELECT * FROM factories WHERE id = $1';
const TENANT1_BUYER_NAME = 'Tenant 1 Buyer';
const TENANT2_BUYER_NAME = 'Tenant 2 Buyer';
const TENANT1_BUYER_ID_KEY = 'T1BUYER';
const TENANT2_BUYER_ID_KEY = 'T2BUYER';

describe('Integration: Row-Level Security (RLS)', () => {
  // Create two separate tenant contexts
  const tenant1: RequestContext = {
    tenantId: uuidv4(),
    userId: uuidv4(),
    correlationId: `test-${uuidv4()}`,
    role: 'factory_admin',
  };

  const tenant2: RequestContext = {
    tenantId: uuidv4(),
    userId: uuidv4(),
    correlationId: `test-${uuidv4()}`,
    role: 'factory_admin',
  };

  beforeEach(async () => {
    // Create factories for both tenants
    await withTenantTransaction(tenant1, async (client: PoolClient) => {
      await client.query(
        `INSERT INTO factories (id, name, slug, factory_type, contact_email, timezone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = $2`,
        [tenant1.tenantId, 'Tenant 1 Factory', `tenant1-${tenant1.tenantId.slice(0, 8)}`, 1, 'tenant1@factory.com', 'Asia/Kolkata'],
      );
    });

    await withTenantTransaction(tenant2, async (client: PoolClient) => {
      await client.query(
        `INSERT INTO factories (id, name, slug, factory_type, contact_email, timezone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = $2`,
        [tenant2.tenantId, 'Tenant 2 Factory', `tenant2-${tenant2.tenantId.slice(0, 8)}`, 2, 'tenant2@factory.com', 'Asia/Kolkata'],
      );
    });
  });

  afterEach(async () => {
    // Cleanup must run within tenant context so RLS allows the deletes.
    // Delete in FK dependency order: invoices/shipments → orders → connections → buyers → factories.
    for (const ctx of [tenant1, tenant2]) {
      await withTenantTransaction(ctx, async (client: PoolClient) => {
        await client.query('DELETE FROM canonical_invoices WHERE factory_id = $1', [ctx.tenantId]);
        await client.query('DELETE FROM canonical_shipments WHERE factory_id = $1', [ctx.tenantId]);
        await client.query('DELETE FROM canonical_order_line_items WHERE order_id IN (SELECT id FROM canonical_orders WHERE factory_id = $1)', [ctx.tenantId]);
        await client.query('DELETE FROM canonical_orders WHERE factory_id = $1', [ctx.tenantId]);
        await client.query('DELETE FROM connections WHERE factory_id = $1', [ctx.tenantId]);
        await client.query('DELETE FROM buyers WHERE factory_id = $1', [ctx.tenantId]);
        await client.query('DELETE FROM factories WHERE id = $1', [ctx.tenantId]);
        // audit_log is append-only (immutability trigger) — no cleanup needed
      });
    }
  });

  describe('Factory RLS', () => {
    it('should allow tenant1 to see its own factory', async () => {
      const factory = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query(SQL_SELECT_FACTORY_BY_ID, [tenant1.tenantId]);
        return res.rows[0];
      });

      expect(factory).toBeDefined();
      expect(factory.id).toBe(tenant1.tenantId);
      expect(factory.name).toBe('Tenant 1 Factory');
    });

    it('should deny tenant1 access to tenant2 factory', async () => {
      const factory = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query(SQL_SELECT_FACTORY_BY_ID, [tenant2.tenantId]);
        return res.rows[0];
      });

      // RLS should block the query
      expect(factory).toBeUndefined();
    });

    it('should return empty result when querying other tenant factories', async () => {
      const factories = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM factories WHERE factory_type = 2');
        return res.rows;
      });

      // Should not return tenant2's factory (factory_type = 2)
      expect(factories.length).toBe(0);
    });
  });

  describe('Buyer RLS', () => {
    beforeEach(async () => {
      // Create buyers for both tenants
      await withTenantTransaction(tenant1, async (client: PoolClient) => {
        await client.query(
          `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET name = $3`,
          [uuidv4(), tenant1.tenantId, TENANT1_BUYER_NAME, TENANT1_BUYER_ID_KEY, BUYER_PROTOCOL],
        );
      });

      await withTenantTransaction(tenant2, async (client: PoolClient) => {
        await client.query(
          `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET name = $3`,
          [uuidv4(), tenant2.tenantId, TENANT2_BUYER_NAME, TENANT2_BUYER_ID_KEY, BUYER_PROTOCOL],
        );
      });
    });

    it('should allow tenant1 to see its own buyers', async () => {
      const buyers = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM buyers WHERE factory_id = $1', [tenant1.tenantId]);
        return res.rows;
      });

      expect(buyers.length).toBeGreaterThan(0);
      expect(buyers[0].name).toBe(TENANT1_BUYER_NAME);
    });

    it('should deny tenant1 access to tenant2 buyers', async () => {
      const buyers = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM buyers WHERE buyer_identifier = $1', [TENANT2_BUYER_ID_KEY]);
        return res.rows;
      });

      // RLS should prevent seeing tenant2's buyer
      expect(buyers.length).toBe(0);
    });

    it('should not leak buyer information across tenants', async () => {
      const buyersFromT1Perspective = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query('SELECT COUNT(*) as count FROM buyers');
        return res.rows[0];
      });

      const buyersFromT2Perspective = await withTenantClient(tenant2, async (client: PoolClient) => {
        const res = await client.query('SELECT COUNT(*) as count FROM buyers');
        return res.rows[0];
      });

      // Each should only see their own buyers
      expect(buyersFromT1Perspective.count).toBe('1');
      expect(buyersFromT2Perspective.count).toBe('1');
    });
  });

  describe('Order RLS', () => {
    let tenant1BuyerId: string;
    let tenant2BuyerId: string;
    let tenant1OrderId: string;
    let tenant2OrderId: string;

    beforeEach(async () => {
      // Create buyers, connections, and orders for both tenants
      await withTenantTransaction(tenant1, async (client: PoolClient) => {
        const buyerRes = await client.query(
          `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, TENANT1_BUYER_NAME, TENANT1_BUYER_ID_KEY, BUYER_PROTOCOL],
        );
        tenant1BuyerId = buyerRes.rows[0].id;

        const connRes = await client.query(
          `INSERT INTO connections (id, factory_id, buyer_id, mode, source_type, status)
           VALUES ($1, $2, $3, 'sandbox', 'tally', 'active')
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, tenant1BuyerId],
        );

        const orderRes = await client.query(
          `INSERT INTO canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, order_date, subtotal, tax_amount, total_amount, source_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, tenant1BuyerId, connRes.rows[0].id, 'PO-T1-001', new Date(), 1000, 180, 1180, 'tally', 'DRAFT'],
        );
        tenant1OrderId = orderRes.rows[0].id;
      });

      await withTenantTransaction(tenant2, async (client: PoolClient) => {
        const buyerRes = await client.query(
          `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [uuidv4(), tenant2.tenantId, TENANT2_BUYER_NAME, TENANT2_BUYER_ID_KEY, BUYER_PROTOCOL],
        );
        tenant2BuyerId = buyerRes.rows[0].id;

        const connRes = await client.query(
          `INSERT INTO connections (id, factory_id, buyer_id, mode, source_type, status)
           VALUES ($1, $2, $3, 'sandbox', 'tally', 'active')
           RETURNING id`,
          [uuidv4(), tenant2.tenantId, tenant2BuyerId],
        );

        const orderRes = await client.query(
          `INSERT INTO canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, order_date, subtotal, tax_amount, total_amount, source_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [uuidv4(), tenant2.tenantId, tenant2BuyerId, connRes.rows[0].id, 'PO-T2-001', new Date(), 2000, 360, 2360, 'tally', 'DRAFT'],
        );
        tenant2OrderId = orderRes.rows[0].id;
      });
    });

    it('should allow tenant1 to see its own orders', async () => {
      const orders = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM canonical_orders WHERE id = $1', [tenant1OrderId]);
        return res.rows;
      });

      expect(orders.length).toBe(1);
      expect(orders[0].id).toBe(tenant1OrderId);
      expect(orders[0].buyer_po_number).toBe('PO-T1-001');
    });

    it('should deny tenant1 access to tenant2 orders', async () => {
      const orders = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM canonical_orders WHERE id = $1', [tenant2OrderId]);
        return res.rows;
      });

      // RLS should block access
      expect(orders.length).toBe(0);
    });

    it('should not allow tenant2 to query tenant1 orders by PO number', async () => {
      const orders = await withTenantClient(tenant2, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM canonical_orders WHERE buyer_po_number = $1', ['PO-T1-001']);
        return res.rows;
      });

      // RLS policy should filter out tenant1's order
      expect(orders.length).toBe(0);
    });

    it('should maintain order isolation during listing', async () => {
      const tenant1Orders = await withTenantClient(tenant1, async (client: PoolClient) => {
        const res = await client.query('SELECT COUNT(*) as count FROM canonical_orders');
        return res.rows[0];
      });

      const tenant2Orders = await withTenantClient(tenant2, async (client: PoolClient) => {
        const res = await client.query('SELECT COUNT(*) as count FROM canonical_orders');
        return res.rows[0];
      });

      // Each should see exactly 1 order
      expect(tenant1Orders.count).toBe('1');
      expect(tenant2Orders.count).toBe('1');
    });
  });

  describe('Shipment RLS', () => {
    it('should enforce RLS on shipment table', async () => {
      let shipmentId: string;

      // Create shipment in tenant1
      await withTenantTransaction(tenant1, async (client: PoolClient) => {
        const buyerRes = await client.query(
          `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, 'ShipBuyer', 'SHIPBUYER1', BUYER_PROTOCOL],
        );
        const connRes = await client.query(
          `INSERT INTO connections (id, factory_id, buyer_id, mode, source_type, status)
           VALUES ($1, $2, $3, 'sandbox', 'tally', 'active')
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, buyerRes.rows[0].id],
        );
        const orderRes = await client.query(
          `INSERT INTO canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, order_date, subtotal, tax_amount, total_amount, source_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, buyerRes.rows[0].id, connRes.rows[0].id, 'PO-SHIP-001', new Date(), 1000, 180, 1180, 'tally', 'CONFIRMED'],
        );
        const shipRes = await client.query(
          `INSERT INTO canonical_shipments (id, factory_id, order_id, connection_id, shipment_date, carrier_name, tracking_number, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, orderRes.rows[0].id, connRes.rows[0].id, new Date(), 'FedEx', 'TRACK123', 'IN_TRANSIT'],
        );
        shipmentId = shipRes.rows[0].id;
      });

      // Try to access from tenant2
      const shipment = await withTenantClient(tenant2, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM canonical_shipments WHERE id = $1', [shipmentId]);
        return res.rows[0];
      });

      // Should not be accessible
      expect(shipment).toBeUndefined();
    });
  });

  describe('Invoice RLS', () => {
    it('should enforce RLS on invoice table', async () => {
      let invoiceId: string;

      // Create invoice in tenant1
      await withTenantTransaction(tenant1, async (client: PoolClient) => {
        const buyerRes = await client.query(
          `INSERT INTO buyers (id, factory_id, name, buyer_identifier, protocol)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, 'InvBuyer', 'INVBUYER1', BUYER_PROTOCOL],
        );
        const connRes = await client.query(
          `INSERT INTO connections (id, factory_id, buyer_id, mode, source_type, status)
           VALUES ($1, $2, $3, 'sandbox', 'tally', 'active')
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, buyerRes.rows[0].id],
        );
        const orderRes = await client.query(
          `INSERT INTO canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, order_date, subtotal, tax_amount, total_amount, source_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, buyerRes.rows[0].id, connRes.rows[0].id, 'PO-INV-001', new Date(), 1000, 180, 1180, 'tally', 'SHIPPED'],
        );
        const invRes = await client.query(
          `INSERT INTO canonical_invoices (id, factory_id, order_id, connection_id, invoice_number, invoice_date, subtotal, tax_amount, total_amount, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [uuidv4(), tenant1.tenantId, orderRes.rows[0].id, connRes.rows[0].id, 'INV-001', new Date(), 1000, 180, 1180, 'DRAFT'],
        );
        invoiceId = invRes.rows[0].id;
      });

      // Try to access from tenant2
      const invoice = await withTenantClient(tenant2, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM canonical_invoices WHERE id = $1', [invoiceId]);
        return res.rows[0];
      });

      // Should not be accessible
      expect(invoice).toBeUndefined();
    });
  });

  describe('Audit Log RLS', () => {
    it('should enforce RLS on audit_log table', async () => {
      let auditId: string;

      // Create audit entry in tenant1
      await withTenantTransaction(tenant1, async (client: PoolClient) => {
        const res = await client.query(
          `INSERT INTO audit_log (factory_id, entity_id, entity_type, action, user_id, metadata, hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [tenant1.tenantId, uuidv4(), 'order', 'CREATE', tenant1.userId, JSON.stringify({ test: 'data' }), 'testhash-rls-audit'],
        );
        auditId = res.rows[0].id;
      });

      // Try to access from tenant2
      const audit = await withTenantClient(tenant2, async (client: PoolClient) => {
        const res = await client.query('SELECT * FROM audit_log WHERE id = $1', [auditId]);
        return res.rows[0];
      });

      // Should not be accessible
      expect(audit).toBeUndefined();
    });
  });

  describe('Admin Impersonation (bypass scenario)', () => {
    it('should NOT allow regular user to impersonate another tenant', async () => {
      const impersonatorCtx = buildTestContext();

      // Even if someone tries to modify the context, RLS at DB level should block
      const result = await withTenantClient(impersonatorCtx, async (client: PoolClient) => {
        const res = await client.query(SQL_SELECT_FACTORY_BY_ID, [tenant1.tenantId]);
        return res.rows;
      });

      expect(result.length).toBe(0);
    });
  });
});

function buildTestContext(): RequestContext {
  return {
    tenantId: uuidv4(),
    userId: uuidv4(),
    correlationId: `test-${uuidv4()}`,
    role: 'factory_admin',
  };
}
