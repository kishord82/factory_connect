/**
 * B14: Impact analyzer — calculates blast radius before revert/rollback.
 */
import type { RequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { withTenantClient, findMany } from '@fc/database';

interface ImpactReport {
  entity_type: string;
  entity_id: string;
  impact_level: 'direct' | 'cascading';
  description: string;
}

export async function analyzeOrderImpact(ctx: RequestContext, orderId: string): Promise<ImpactReport[]> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const impacts: ImpactReport[] = [];

    // Check shipments linked to this order
    const shipments = await findMany<{ id: string }>(
      client,
      'SELECT id FROM canonical_shipments WHERE order_id = $1',
      [orderId],
    );
    for (const s of shipments) {
      impacts.push({
        entity_type: 'shipment',
        entity_id: s.id,
        impact_level: 'direct',
        description: 'Linked shipment will be orphaned',
      });
    }

    // Check invoices linked to this order
    const invoices = await findMany<{ id: string }>(
      client,
      'SELECT id FROM canonical_invoices WHERE order_id = $1',
      [orderId],
    );
    for (const inv of invoices) {
      impacts.push({
        entity_type: 'invoice',
        entity_id: inv.id,
        impact_level: 'direct',
        description: 'Linked invoice will be orphaned',
      });
    }

    // Check saga state
    const sagas = await findMany<{ id: string; current_step: string }>(
      client,
      'SELECT id, current_step FROM order_sagas WHERE order_id = $1',
      [orderId],
    );
    for (const saga of sagas) {
      impacts.push({
        entity_type: 'saga',
        entity_id: saga.id,
        impact_level: 'cascading',
        description: `Saga in ${saga.current_step} will be disrupted`,
      });
    }

    // Check outbox events
    const outbox = await findMany<{ id: string; event_type: string }>(
      client,
      'SELECT id, event_type FROM outbox WHERE aggregate_id = $1 AND processed_at IS NULL',
      [orderId],
    );
    for (const evt of outbox) {
      impacts.push({
        entity_type: 'outbox_event',
        entity_id: evt.id,
        impact_level: 'cascading',
        description: `Pending ${evt.event_type} event will be stale`,
      });
    }

    return impacts;
  });
}

export async function analyzeConnectionImpact(ctx: RequestContext, connectionId: string): Promise<ImpactReport[]> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const impacts: ImpactReport[] = [];

    const orders = await findMany<{ id: string; status: string }>(
      client,
      `SELECT id, status FROM canonical_orders WHERE connection_id = $1 AND status NOT IN ('COMPLETED','CANCELLED')`,
      [connectionId],
    );
    for (const o of orders) {
      impacts.push({
        entity_type: 'order',
        entity_id: o.id,
        impact_level: 'direct',
        description: `Active order in ${o.status} status`,
      });
    }

    const resyncs = await findMany<{ id: string }>(
      client,
      `SELECT id FROM resync_requests WHERE connection_id = $1 AND status NOT IN ('COMPLETED','REJECTED','DENIED')`,
      [connectionId],
    );
    for (const r of resyncs) {
      impacts.push({
        entity_type: 'resync',
        entity_id: r.id,
        impact_level: 'cascading',
        description: 'Active resync will be interrupted',
      });
    }

    return impacts;
  });
}
