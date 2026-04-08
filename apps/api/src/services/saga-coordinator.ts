/**
 * B13: 15-state Saga Coordinator.
 * Manages order lifecycle state machine with:
 * - 15-state transitions (PO_RECEIVED → COMPLETED)
 * - SLA deadline tracking and breach detection
 * - Compensation/rollback on failures
 * - Lock-based concurrent access protection
 * - Audit log integration with hash-chain
 */

import type { RequestContext, SagaStep } from '@fc/shared';
import { FcError, SAGA_POLL_INTERVAL_MS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@fc/shared';
import {
  getPool,
  withTenantTransaction,
  withTenantClient,
  findOne,
  findMany,
  paginatedQuery,
  buildWhereClause,
  insertOne,
} from '@fc/database';
import { createLogger } from '@fc/observability';
import type { PoolClient, PaginatedResult } from '@fc/database';
import crypto from 'node:crypto';

const logger = createLogger('saga-coordinator');

let pollTimer: ReturnType<typeof setInterval> | null = null;

/** Valid saga transitions */
export const VALID_TRANSITIONS: Record<SagaStep, SagaStep[]> = {
  PO_RECEIVED: ['PO_CONFIRMED', 'FAILED'],
  PO_CONFIRMED: ['ACK_QUEUED', 'FAILED'],
  ACK_QUEUED: ['ACK_SENT', 'FAILED'],
  ACK_SENT: ['ACK_DELIVERED', 'FAILED'],
  ACK_DELIVERED: ['SHIP_READY', 'FAILED'],
  SHIP_READY: ['ASN_QUEUED', 'FAILED'],
  ASN_QUEUED: ['ASN_SENT', 'FAILED'],
  ASN_SENT: ['ASN_DELIVERED', 'FAILED'],
  ASN_DELIVERED: ['INVOICE_READY', 'FAILED'],
  INVOICE_READY: ['INVOICE_QUEUED', 'FAILED'],
  INVOICE_QUEUED: ['INVOICE_SENT', 'FAILED'],
  INVOICE_SENT: ['INVOICE_DELIVERED', 'FAILED'],
  INVOICE_DELIVERED: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

interface SagaRow {
  id: string;
  factory_id: string;
  order_id: string;
  connection_id: string;
  current_step: SagaStep;
  step_deadline: Date;
  started_at: Date;
  updated_at: Date;
  locked_by: string | null;
  lock_expires: Date | null;
  compensation_data: Record<string, unknown>;
}

interface SagaListFilter {
  status?: SagaStep;
  connection_id?: string;
  order_id?: string;
}

/**
 * Check if a transition is valid.
 */
export function isValidTransition(from: SagaStep, to: SagaStep): boolean {
  return (VALID_TRANSITIONS[from] as SagaStep[])?.includes(to) ?? false;
}

/**
 * Calculate the deadline for a given step based on connection SLA config.
 * Default: 4 hours from now.
 */
async function calculateStepDeadline(
  client: PoolClient,
  factoryId: string,
  connectionId: string,
): Promise<Date> {
  // Query connection SLA config (assumes sla_hours column in connections table)
  const config = await findOne<{ sla_hours?: number }>(
    client,
    `SELECT sla_hours FROM core.connections WHERE id = $1 AND factory_id = $2`,
    [connectionId, factoryId],
  );

  const hours = config?.sla_hours ?? 4;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

/**
 * Acquire a distributed lock on a saga.
 * Returns true if lock acquired; false if already locked.
 */
async function acquireLock(
  client: PoolClient,
  sagaId: string,
  lockKey: string,
  durationSeconds = 300,
): Promise<boolean> {
  const result = await client.query(
    `UPDATE workflow.order_sagas
     SET locked_by = $1, lock_expires = NOW() + INTERVAL '1 second' * $2, updated_at = NOW()
     WHERE id = $3 AND (locked_by IS NULL OR lock_expires < NOW())
     RETURNING id`,
    [lockKey, durationSeconds, sagaId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Release a distributed lock.
 */
async function releaseLock(client: PoolClient, sagaId: string): Promise<void> {
  await client.query(
    `UPDATE workflow.order_sagas
     SET locked_by = NULL, lock_expires = NULL, updated_at = NOW()
     WHERE id = $1`,
    [sagaId],
  );
}

/**
 * Insert an audit log entry with hash-chain verification.
 */
async function insertAuditEntry(
  client: PoolClient,
  ctx: RequestContext,
  sagaId: string,
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  // Get previous audit entry hash for chain
  const previousEntry = await findOne<{ entry_hash: string }>(
    client,
    `SELECT entry_hash FROM audit_log
     WHERE entity_type = 'order_saga' AND entity_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [sagaId],
  );

  const previousHash = previousEntry?.entry_hash ?? '0';
  const payload = JSON.stringify(details);
  const currentHash = crypto
    .createHash('sha256')
    .update(previousHash + payload)
    .digest('hex');

  await client.query(
    `INSERT INTO audit_log (
      tenant_id, action, entity_type, entity_id, actor_id,
      old_record, new_record, metadata, entry_hash
    ) VALUES ($1, $2::audit_action, $3, $4, $5, $6, $7, $8, $9)`,
    [
      ctx.tenantId,
      action,
      'order_saga',
      sagaId,
      ctx.userId,
      JSON.stringify({ previousHash }),
      payload,
      JSON.stringify({ correlationId: ctx.correlationId }),
      currentHash,
    ],
  );
}

/**
 * Advance saga from current step to target step.
 * Acquires lock, validates transition, updates state, records audit.
 */
export async function advanceSaga(
  sagaId: string,
  targetStep: SagaStep,
  ctx: RequestContext,
): Promise<SagaRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Acquire lock
    const lockKey = `saga-${sagaId}-${Date.now()}`;
    const lockAcquired = await acquireLock(client, sagaId, lockKey, 300);
    if (!lockAcquired) {
      throw new FcError(
        'FC_ERR_SAGA_LOCKED',
        'Saga is currently locked by another process',
        { sagaId },
        409,
      );
    }

    try {
      // Fetch current saga state
      const saga = await findOne<SagaRow>(
        client,
        `SELECT * FROM workflow.order_sagas WHERE id = $1`,
        [sagaId],
      );

      if (!saga) {
        throw new FcError(
          'FC_ERR_SAGA_NOT_FOUND',
          `Saga ${sagaId} not found`,
          { sagaId },
          404,
        );
      }

      // Check if saga is in terminal state
      if (saga.current_step === 'COMPLETED' || saga.current_step === 'FAILED') {
        throw new FcError(
          'FC_ERR_SAGA_TERMINAL_STATE',
          `Cannot advance saga in ${saga.current_step} state`,
          { sagaId, currentStep: saga.current_step },
          400,
        );
      }

      // Validate transition
      if (!isValidTransition(saga.current_step, targetStep)) {
        throw new FcError(
          'FC_ERR_SAGA_INVALID_TRANSITION',
          `Invalid transition from ${saga.current_step} to ${targetStep}`,
          { from: saga.current_step, to: targetStep, sagaId },
          400,
        );
      }

      // Calculate new deadline
      const newDeadline = await calculateStepDeadline(client, saga.factory_id, saga.connection_id);

      // Update saga state
      const updated = await insertOne<SagaRow>(
        client,
        `UPDATE workflow.order_sagas
         SET current_step = $1, step_deadline = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [targetStep, newDeadline, sagaId],
      );

      // Record audit entry
      await insertAuditEntry(client, ctx, sagaId, 'UPDATE', {
        previousStep: saga.current_step,
        newStep: targetStep,
        deadline: newDeadline.toISOString(),
      });

      logger.info(
        { sagaId, orderId: saga.order_id, from: saga.current_step, to: targetStep },
        'Saga advanced',
      );

      return updated;
    } finally {
      await releaseLock(client, sagaId);
    }
  });
}

/**
 * Fail a saga and record failure reason.
 * Initiates compensation if configured.
 */
export async function failSaga(
  sagaId: string,
  reason: string,
  ctx: RequestContext,
): Promise<SagaRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const lockKey = `saga-${sagaId}-fail-${Date.now()}`;
    const lockAcquired = await acquireLock(client, sagaId, lockKey, 300);
    if (!lockAcquired) {
      throw new FcError(
        'FC_ERR_SAGA_LOCKED',
        'Saga is currently locked by another process',
        { sagaId },
        409,
      );
    }

    try {
      const saga = await findOne<SagaRow>(
        client,
        `SELECT * FROM workflow.order_sagas WHERE id = $1`,
        [sagaId],
      );

      if (!saga) {
        throw new FcError(
          'FC_ERR_SAGA_NOT_FOUND',
          `Saga ${sagaId} not found`,
          { sagaId },
          404,
        );
      }

      // Update to FAILED state
      const updated = await insertOne<SagaRow>(
        client,
        `UPDATE workflow.order_sagas
         SET current_step = 'FAILED', updated_at = NOW(),
             compensation_data = compensation_data || $1::jsonb
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify({ failure_reason: reason, failed_at: new Date().toISOString() }), sagaId],
      );

      // Record audit
      await insertAuditEntry(client, ctx, sagaId, 'UPDATE', {
        action: 'SAGA_FAILED',
        reason,
        previousStep: saga.current_step,
      });

      // Update order status to reflect failure
      await client.query(
        `UPDATE orders.canonical_orders
         SET status = 'CANCELLED', updated_at = NOW()
         WHERE id = $1`,
        [saga.order_id],
      );

      logger.warn(
        { sagaId, orderId: saga.order_id, reason },
        'Saga failed',
      );

      return updated;
    } finally {
      await releaseLock(client, sagaId);
    }
  });
}

/**
 * Get current saga status.
 */
export async function getSagaStatus(sagaId: string, ctx: RequestContext): Promise<SagaRow> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const saga = await findOne<SagaRow>(
      client,
      `SELECT * FROM workflow.order_sagas WHERE id = $1`,
      [sagaId],
    );

    if (!saga) {
      throw new FcError(
        'FC_ERR_SAGA_NOT_FOUND',
        `Saga ${sagaId} not found`,
        { sagaId },
        404,
      );
    }

    return saga;
  });
}

/**
 * List sagas by factory with pagination and filters.
 */
export async function listSagasByFactory(
  ctx: RequestContext,
  filters: SagaListFilter = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedResult<SagaRow>> {
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;
  if (page < 1) page = 1;

  return withTenantClient(ctx, async (client: PoolClient) => {
    const filterObj: Record<string, unknown> = {
      factory_id: ctx.tenantId,
    };

    if (filters.status) filterObj.current_step = filters.status;
    if (filters.connection_id) filterObj.connection_id = filters.connection_id;
    if (filters.order_id) filterObj.order_id = filters.order_id;

    const { clause, params } = buildWhereClause(filterObj);
    const sql = `SELECT * FROM workflow.order_sagas ${clause} ORDER BY updated_at DESC`;

    return paginatedQuery<SagaRow>(client, sql, params, page, pageSize);
  });
}

/**
 * Check for SLA breaches — sagas where step_deadline has passed.
 */
async function detectSlaBreaches(): Promise<number> {
  const pool = getPool();
  const result = await pool.query<SagaRow>(
    `SELECT * FROM workflow.order_sagas
     WHERE current_step NOT IN ('COMPLETED', 'FAILED')
       AND step_deadline < NOW()
       AND (locked_by IS NULL OR lock_expires < NOW())
     LIMIT 50`,
  );

  let breachCount = 0;
  for (const saga of result.rows) {
    logger.warn(
      {
        sagaId: saga.id,
        orderId: saga.order_id,
        step: saga.current_step,
        deadline: saga.step_deadline,
      },
      'SLA breach detected',
    );

    // Create escalation log entry
    try {
      await pool.query(
        `INSERT INTO escalation_log (factory_id, connection_id, trigger_reason, trigger_type, trigger_details, current_step, status)
         VALUES ($1, $2, $3, 'SLA_BREACH', $4, 1, 'ACTIVE')
         ON CONFLICT DO NOTHING`,
        [
          saga.factory_id,
          saga.connection_id,
          `SLA breach: ${saga.current_step} deadline passed`,
          JSON.stringify({
            saga_id: saga.id,
            order_id: saga.order_id,
            step: saga.current_step,
            deadline_breach: saga.step_deadline,
          }),
        ],
      );
      breachCount++;
    } catch (err) {
      logger.error({ err, sagaId: saga.id }, 'Failed to log SLA breach');
    }
  }

  return breachCount;
}

/**
 * Recover stale locks — sagas where lock_expires has passed.
 */
async function recoverStaleLocks(): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE workflow.order_sagas
     SET locked_by = NULL, lock_expires = NULL, updated_at = NOW()
     WHERE locked_by IS NOT NULL AND lock_expires < NOW()
     RETURNING id`,
  );

  const count = result.rowCount ?? 0;
  if (count > 0) {
    logger.info({ count }, 'Recovered stale saga locks');
  }
  return count;
}

/**
 * Compensation logic — rollback saga to a safe state.
 * Called when a saga fails to recover from a specific step.
 */
export async function compensate(sagaId: string, ctx: RequestContext): Promise<SagaRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const lockKey = `saga-${sagaId}-compensate-${Date.now()}`;
    const lockAcquired = await acquireLock(client, sagaId, lockKey, 300);
    if (!lockAcquired) {
      throw new FcError(
        'FC_ERR_SAGA_LOCKED',
        'Saga is currently locked by another process',
        { sagaId },
        409,
      );
    }

    try {
      const saga = await findOne<SagaRow>(
        client,
        `SELECT * FROM workflow.order_sagas WHERE id = $1`,
        [sagaId],
      );

      if (!saga) {
        throw new FcError(
          'FC_ERR_SAGA_NOT_FOUND',
          `Saga ${sagaId} not found`,
          { sagaId },
          404,
        );
      }

      // Define rollback steps per current state
      let rollbackStep: SagaStep = 'FAILED';

      // Compensation strategy: roll back to a known safe state based on current step
      if (saga.current_step === 'FAILED' || saga.current_step === 'COMPLETED') {
        throw new FcError(
          'FC_ERR_SAGA_CANNOT_COMPENSATE',
          `Cannot compensate saga in ${saga.current_step} state`,
          { sagaId, currentStep: saga.current_step },
          400,
        );
      }

      // Simple rollback: mark as failed and let the order be retried
      const updated = await insertOne<SagaRow>(
        client,
        `UPDATE workflow.order_sagas
         SET current_step = 'FAILED', updated_at = NOW(),
             compensation_data = compensation_data || $1::jsonb
         WHERE id = $2
         RETURNING *`,
        [
          JSON.stringify({
            compensation_initiated: new Date().toISOString(),
            rollback_from: saga.current_step,
          }),
          sagaId,
        ],
      );

      // Record compensation in audit
      await insertAuditEntry(client, ctx, sagaId, 'UPDATE', {
        action: 'COMPENSATION_INITIATED',
        rollbackFrom: saga.current_step,
        rollbackTo: rollbackStep,
      });

      logger.info(
        { sagaId, orderId: saga.order_id, from: saga.current_step, to: rollbackStep },
        'Saga compensation initiated',
      );

      return updated;
    } finally {
      await releaseLock(client, sagaId);
    }
  });
}

/**
 * Initialize a new saga for an order.
 */
export async function initSaga(
  orderId: string,
  connectionId: string,
  ctx: RequestContext,
): Promise<SagaRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Verify order exists
    const order = await findOne<{ id: string }>(
      client,
      `SELECT id FROM orders.canonical_orders WHERE id = $1`,
      [orderId],
    );

    if (!order) {
      throw new FcError(
        'FC_ERR_ORDER_NOT_FOUND',
        `Order ${orderId} not found`,
        { orderId },
        404,
      );
    }

    // Calculate initial deadline
    const initialDeadline = await calculateStepDeadline(client, ctx.tenantId, connectionId);

    // Create saga
    const saga = await insertOne<SagaRow>(
      client,
      `INSERT INTO workflow.order_sagas (
        factory_id, order_id, connection_id, current_step,
        step_deadline, started_at, compensation_data
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING *`,
      [ctx.tenantId, orderId, connectionId, 'PO_RECEIVED', initialDeadline, '{}'],
    );

    // Record in audit
    await insertAuditEntry(client, ctx, saga.id, 'CREATE', {
      action: 'SAGA_INITIALIZED',
      orderId,
      connectionId,
      initialStep: 'PO_RECEIVED',
    });

    logger.info(
      { sagaId: saga.id, orderId, connectionId },
      'Saga initialized',
    );

    return saga;
  });
}

/**
 * Poll sagas for maintenance tasks (SLA breaches, lock recovery).
 */
async function pollSagas(): Promise<void> {
  try {
    const breaches = await detectSlaBreaches();
    const recovered = await recoverStaleLocks();
    if (breaches > 0 || recovered > 0) {
      logger.info({ breaches, recovered }, 'Saga coordinator poll cycle complete');
    }
  } catch (err) {
    logger.error({ err }, 'Saga coordinator poll failed');
  }
}

/**
 * Start the saga coordinator polling loop.
 */
export function startSagaCoordinator(): void {
  if (pollTimer) return;
  logger.info({ intervalMs: SAGA_POLL_INTERVAL_MS }, 'Starting saga coordinator');
  pollTimer = setInterval(() => {
    pollSagas();
  }, SAGA_POLL_INTERVAL_MS);
}

/**
 * Stop the saga coordinator polling loop.
 */
export function stopSagaCoordinator(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info('Saga coordinator stopped');
  }
}

// Exported for testing
export { pollSagas, detectSlaBreaches, recoverStaleLocks };
