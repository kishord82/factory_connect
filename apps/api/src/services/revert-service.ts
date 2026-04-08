/**
 * B15: Revert service — safely revert entity changes using audit log.
 */
import type { RequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { FcError } from '@fc/shared';
import { withTenantTransaction, findOne } from '@fc/database';
import { analyzeOrderImpact } from './impact-analyzer.js';

interface RevertResult {
  entity_type: string;
  entity_id: string;
  reverted_to_version: string;
  impacts_mitigated: number;
}

export async function revertOrder(
  ctx: RequestContext,
  orderId: string,
  options: { force?: boolean; targetAuditId?: string } = {},
): Promise<RevertResult> {
  // First analyze impact
  if (!options.force) {
    const impacts = await analyzeOrderImpact(ctx, orderId);
    const directImpacts = impacts.filter((i) => i.impact_level === 'direct');
    if (directImpacts.length > 0) {
      throw new FcError(
        'FC_ERR_REVERT_BLOCKED',
        `Revert blocked: ${directImpacts.length} direct impacts detected. Use force=true to override.`,
        { impacts: directImpacts },
        409,
      );
    }
  }

  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Find the audit log entry to revert to
    let auditEntry;
    if (options.targetAuditId) {
      auditEntry = await findOne<{ id: string; old_record: string }>(
        client,
        'SELECT id, old_record FROM audit_log WHERE id = $1 AND entity_id = $2',
        [options.targetAuditId, orderId],
      );
    } else {
      auditEntry = await findOne<{ id: string; old_record: string }>(
        client,
        `SELECT id, old_record FROM audit_log WHERE entity_id = $1 AND entity_type = 'canonical_order' AND old_record IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
        [orderId],
      );
    }

    if (!auditEntry || !auditEntry.old_record) {
      throw new FcError('FC_ERR_REVERT_NO_HISTORY', 'No previous version found to revert to', {}, 404);
    }

    const oldData =
      typeof auditEntry.old_record === 'string'
        ? (JSON.parse(auditEntry.old_record) as Record<string, unknown>)
        : (auditEntry.old_record as Record<string, unknown>);

    // Restore the old record
    await client.query(
      `UPDATE orders.canonical_orders SET
        status = $1, factory_order_number = $2, requested_ship_date = $3,
        ship_to = $4, bill_to = $5, buyer_contact = $6, updated_at = NOW()
       WHERE id = $7`,
      [
        oldData.status,
        oldData.factory_order_number,
        oldData.requested_ship_date,
        oldData.ship_to ? JSON.stringify(oldData.ship_to) : null,
        oldData.bill_to ? JSON.stringify(oldData.bill_to) : null,
        oldData.buyer_contact ? JSON.stringify(oldData.buyer_contact) : null,
        orderId,
      ],
    );

    // Record the revert in audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, metadata)
       VALUES ($1, 'REVERT', 'canonical_order', $2, $3, $4)`,
      [ctx.tenantId, orderId, ctx.userId, JSON.stringify({ reverted_from_audit: auditEntry.id, correlationId: ctx.correlationId })],
    );

    return {
      entity_type: 'canonical_order',
      entity_id: orderId,
      reverted_to_version: auditEntry.id,
      impacts_mitigated: 0,
    };
  });
}
