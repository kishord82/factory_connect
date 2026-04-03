/**
 * B7: Order service — CRUD + transactional outbox pattern.
 * 4 writes in 1 transaction: domain + outbox + saga + audit.
 */

import type { RequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import type { CanonicalOrderCreate, CanonicalOrderUpdate, OrderListQuery } from '@fc/shared';
import {
  withTenantTransaction,
  withTenantClient,
  insertOne,
  findOne,
  findMany,
  paginatedQuery,
  buildWhereClause,
} from '@fc/database';
import type { PaginatedResult, PoolClient } from '@fc/database';

interface OrderRow {
  id: string;
  factory_id: string;
  buyer_id: string;
  connection_id: string;
  buyer_po_number: string;
  factory_order_number: string | null;
  order_date: Date;
  requested_ship_date: Date | null;
  ship_to: Record<string, unknown> | null;
  bill_to: Record<string, unknown> | null;
  buyer_contact: Record<string, unknown> | null;
  currency: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  source_type: string;
  status: string;
  idempotency_key: string | null;
  created_at: Date;
  updated_at: Date;
}

interface LineItemRow {
  id: string;
  order_id: string;
  factory_id: string;
  line_number: number;
  buyer_sku: string;
  factory_sku: string | null;
  description: string | null;
  quantity_ordered: string;
  quantity_uom: string;
  unit_price: string;
  line_total: string;
  upc: string | null;
  hsn_code: string | null;
  created_at: Date;
}

/**
 * Create order with transactional outbox pattern:
 * 1 TX → insert order + line items + outbox event + saga + audit log
 */
export async function createOrder(
  ctx: RequestContext,
  data: CanonicalOrderCreate,
): Promise<OrderRow> {
  return withTenantTransaction(ctx, async (client) => {
    // 1. Insert canonical order
    const order = await insertOne<OrderRow>(
      client,
      `INSERT INTO canonical_orders (
        factory_id, buyer_id, connection_id, buyer_po_number, factory_order_number,
        order_date, requested_ship_date, ship_to, bill_to, buyer_contact,
        currency, subtotal, tax_amount, tax_config, total_amount,
        source_type, source_raw_payload, source_claim_uri,
        mapping_config_version, idempotency_key, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'DRAFT')
      RETURNING *`,
      [
        ctx.tenantId, data.buyer_id, data.connection_id, data.buyer_po_number,
        data.factory_order_number ?? null,
        data.order_date, data.requested_ship_date ?? null,
        data.ship_to ? JSON.stringify(data.ship_to) : null,
        data.bill_to ? JSON.stringify(data.bill_to) : null,
        data.buyer_contact ? JSON.stringify(data.buyer_contact) : null,
        data.currency, data.subtotal, data.tax_amount,
        data.tax_config ? JSON.stringify(data.tax_config) : null,
        data.total_amount, data.source_type,
        data.source_raw_payload ?? null, data.source_claim_uri ?? null,
        data.mapping_config_version, data.idempotency_key ?? null,
      ],
    );

    // 2. Insert line items
    for (const item of data.line_items) {
      await client.query(
        `INSERT INTO canonical_order_line_items (
          order_id, factory_id, line_number, buyer_sku, factory_sku,
          description, quantity_ordered, quantity_uom, unit_price, line_total,
          upc, hsn_code
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          order.id, ctx.tenantId, item.line_number, item.buyer_sku,
          item.factory_sku ?? null, item.description ?? null,
          item.quantity_ordered, item.quantity_uom, item.unit_price,
          item.line_total, item.upc ?? null, item.hsn_code ?? null,
        ],
      );
    }

    // 3. Insert outbox event
    await client.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       VALUES ('canonical_order', $1, 'INBOUND_PO_RECEIVED', $2)`,
      [order.id, JSON.stringify({ order_id: order.id, buyer_po_number: data.buyer_po_number })],
    );

    // 4. Insert saga
    await client.query(
      `INSERT INTO order_sagas (
        factory_id, order_id, connection_id, current_step,
        step_deadline, compensation_data
      ) VALUES ($1, $2, $3, 'PO_RECEIVED', NOW() + INTERVAL '4 hours', '{}')`,
      [ctx.tenantId, order.id, data.connection_id],
    );

    // 5. Audit log
    await insertAuditLog(client, ctx, 'CREATE', 'canonical_order', order.id, null, order);

    return order;
  });
}

/**
 * Confirm an order — transitions status and creates saga step.
 */
export async function confirmOrder(
  ctx: RequestContext,
  orderId: string,
): Promise<OrderRow> {
  return withTenantTransaction(ctx, async (client) => {
    const existing = await findOne<OrderRow>(
      client,
      'SELECT * FROM canonical_orders WHERE id = $1',
      [orderId],
    );
    if (!existing) {
      throw new FcError('FC_ERR_ORDER_NOT_FOUND', `Order ${orderId} not found`, {}, 404);
    }
    if (existing.status !== 'DRAFT') {
      throw new FcError(
        'FC_ERR_ORDER_INVALID_STATUS',
        `Cannot confirm order in ${existing.status} status`,
        { currentStatus: existing.status },
        400,
      );
    }

    const updated = await insertOne<OrderRow>(
      client,
      `UPDATE canonical_orders SET status = 'CONFIRMED', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [orderId],
    );

    // Outbox: ORDER_CONFIRMED triggers EDI 855
    await client.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       VALUES ('canonical_order', $1, 'ORDER_CONFIRMED', $2)`,
      [orderId, JSON.stringify({ order_id: orderId })],
    );

    // Advance saga
    await client.query(
      `UPDATE order_sagas SET current_step = 'PO_CONFIRMED',
       step_deadline = NOW() + INTERVAL '4 hours', updated_at = NOW()
       WHERE order_id = $1`,
      [orderId],
    );

    await insertAuditLog(client, ctx, 'CONFIRM', 'canonical_order', orderId, existing, updated);

    return updated;
  });
}

/** Get order by ID with line items */
export async function getOrderById(
  ctx: RequestContext,
  orderId: string,
): Promise<{ order: OrderRow; line_items: LineItemRow[] } | null> {
  return withTenantClient(ctx, async (client) => {
    const order = await findOne<OrderRow>(
      client,
      'SELECT * FROM canonical_orders WHERE id = $1',
      [orderId],
    );
    if (!order) return null;

    const lineItems = await findMany<LineItemRow>(
      client,
      'SELECT * FROM canonical_order_line_items WHERE order_id = $1 ORDER BY line_number',
      [orderId],
    );

    return { order, line_items: lineItems };
  });
}

/** List orders with pagination and filters */
export async function listOrders(
  ctx: RequestContext,
  query: OrderListQuery,
): Promise<PaginatedResult<OrderRow>> {
  return withTenantClient(ctx, async (client) => {
    const filters: Record<string, unknown> = {};
    if (query.status) filters.status = query.status;
    if (query.buyer_id) filters.buyer_id = query.buyer_id;
    if (query.connection_id) filters.connection_id = query.connection_id;

    const { clause, params, nextIndex } = buildWhereClause(filters);
    let sql = `SELECT * FROM canonical_orders ${clause}`;

    if (query.search) {
      const searchClause = clause ? ' AND' : ' WHERE';
      sql += `${searchClause} (buyer_po_number ILIKE $${nextIndex} OR factory_order_number ILIKE $${nextIndex})`;
      params.push(`%${query.search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    return paginatedQuery<OrderRow>(client, sql, params, query.page, query.pageSize);
  });
}

/** Update order */
export async function updateOrder(
  ctx: RequestContext,
  orderId: string,
  data: CanonicalOrderUpdate,
): Promise<OrderRow> {
  return withTenantTransaction(ctx, async (client) => {
    const existing = await findOne<OrderRow>(
      client,
      'SELECT * FROM canonical_orders WHERE id = $1',
      [orderId],
    );
    if (!existing) {
      throw new FcError('FC_ERR_ORDER_NOT_FOUND', `Order ${orderId} not found`, {}, 404);
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.factory_order_number !== undefined) {
      sets.push(`factory_order_number = $${idx++}`);
      values.push(data.factory_order_number);
    }
    if (data.requested_ship_date !== undefined) {
      sets.push(`requested_ship_date = $${idx++}`);
      values.push(data.requested_ship_date);
    }
    if (data.ship_to !== undefined) {
      sets.push(`ship_to = $${idx++}`);
      values.push(JSON.stringify(data.ship_to));
    }
    if (data.bill_to !== undefined) {
      sets.push(`bill_to = $${idx++}`);
      values.push(JSON.stringify(data.bill_to));
    }
    if (data.buyer_contact !== undefined) {
      sets.push(`buyer_contact = $${idx++}`);
      values.push(JSON.stringify(data.buyer_contact));
    }
    if (data.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(data.status);
    }

    if (sets.length === 0) return existing;

    sets.push('updated_at = NOW()');
    values.push(orderId);

    const updated = await insertOne<OrderRow>(
      client,
      `UPDATE canonical_orders SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    await insertAuditLog(client, ctx, 'UPDATE', 'canonical_order', orderId, existing, updated);

    return updated;
  });
}

/** Insert audit log entry with hash chain */
async function insertAuditLog(
  client: PoolClient,
  ctx: RequestContext,
  action: string,
  entityType: string,
  entityId: string,
  oldRecord: unknown,
  newRecord: unknown,
): Promise<void> {
  await client.query(
    `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id,
      old_record, new_record, metadata)
     VALUES ($1, $2::audit_action, $3, $4, $5, $6, $7, $8)`,
    [
      ctx.tenantId, action, entityType, entityId, ctx.userId,
      oldRecord ? JSON.stringify(oldRecord) : null,
      newRecord ? JSON.stringify(newRecord) : null,
      JSON.stringify({ correlationId: ctx.correlationId }),
    ],
  );
}
