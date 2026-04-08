/**
 * B8: Shipment service — CRUD + outbox for ASN (856).
 */

import type { RequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { FcError } from '@fc/shared';
import type { CanonicalShipmentCreate } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, paginatedQuery } from '@fc/database';
import type { PaginatedResult } from '@fc/database';

interface ShipmentRow {
  id: string;
  factory_id: string;
  order_id: string;
  connection_id: string;
  shipment_date: Date;
  carrier_name: string | null;
  tracking_number: string | null;
  ship_from: Record<string, unknown> | null;
  ship_to: Record<string, unknown> | null;
  weight: string | null;
  weight_uom: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export async function createShipment(
  ctx: RequestContext,
  data: CanonicalShipmentCreate,
): Promise<ShipmentRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Verify order exists
    const order = await findOne(client, 'SELECT id, status FROM canonical_orders WHERE id = $1', [data.order_id]);
    if (!order) {
      throw new FcError('FC_ERR_ORDER_NOT_FOUND', `Order ${data.order_id} not found`, {}, 404);
    }

    const shipment = await insertOne<ShipmentRow>(
      client,
      `INSERT INTO canonical_shipments (
        factory_id, order_id, connection_id, shipment_date,
        carrier_name, tracking_number, ship_from, ship_to, weight, weight_uom
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        ctx.tenantId, data.order_id, data.connection_id, data.shipment_date,
        data.carrier_name ?? null, data.tracking_number ?? null,
        data.ship_from ? JSON.stringify(data.ship_from) : null,
        data.ship_to ? JSON.stringify(data.ship_to) : null,
        data.weight ?? null, data.weight_uom,
      ],
    );

    // Insert packs if provided
    if (data.packs) {
      for (const pack of data.packs) {
        await client.query(
          `INSERT INTO shipment_packs (shipment_id, factory_id, sscc, pack_type, weight, items)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [shipment.id, ctx.tenantId, pack.sscc ?? null, pack.pack_type, pack.weight ?? null, JSON.stringify(pack.items)],
        );
      }
    }

    // Outbox: SHIPMENT_CREATED triggers ASN 856
    await client.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       VALUES ('canonical_shipment', $1, 'SHIPMENT_CREATED', $2)`,
      [shipment.id, JSON.stringify({ shipment_id: shipment.id, order_id: data.order_id })],
    );

    // Advance saga to SHIP_READY
    await client.query(
      `UPDATE order_sagas SET current_step = 'SHIP_READY', updated_at = NOW()
       WHERE order_id = $1 AND current_step IN ('PO_CONFIRMED','ACK_DELIVERED')`,
      [data.order_id],
    );

    // Audit
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, new_record, metadata)
       VALUES ($1, 'SHIP', 'canonical_shipment', $2, $3, $4, $5)`,
      [ctx.tenantId, shipment.id, ctx.userId, JSON.stringify(shipment), JSON.stringify({ correlationId: ctx.correlationId })],
    );

    return shipment;
  });
}

export async function getShipmentById(ctx: RequestContext, id: string): Promise<ShipmentRow | null> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<ShipmentRow>(client, 'SELECT * FROM canonical_shipments WHERE id = $1', [id]);
  });
}

export async function listShipments(
  ctx: RequestContext,
  orderId: string | undefined,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<ShipmentRow>> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const params: unknown[] = [];
    let sql = 'SELECT * FROM canonical_shipments';
    if (orderId) {
      sql += ' WHERE order_id = $1';
      params.push(orderId);
    }
    sql += ' ORDER BY created_at DESC';
    return paginatedQuery<ShipmentRow>(client, sql, params, page, pageSize);
  });
}
