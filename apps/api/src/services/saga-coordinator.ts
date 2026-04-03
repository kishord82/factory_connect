/**
 * B13: 15-state Saga Coordinator.
 * Polls order_sagas every 60s for:
 * - SLA breach detection (step_deadline passed)
 * - Stale heartbeat recovery (lock expired)
 */

import { getPool } from '@fc/database';
import { createLogger } from '@fc/observability';
import { SAGA_POLL_INTERVAL_MS } from '@fc/shared';

const logger = createLogger('saga-coordinator');

let pollTimer: ReturnType<typeof setInterval> | null = null;

/** Valid saga transitions */
const SAGA_TRANSITIONS: Record<string, string[]> = {
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

export function isValidTransition(from: string, to: string): boolean {
  return SAGA_TRANSITIONS[from]?.includes(to) ?? false;
}

interface SagaRow {
  id: string;
  factory_id: string;
  order_id: string;
  connection_id: string;
  current_step: string;
  step_deadline: Date;
  locked_by: string | null;
  lock_expires: Date | null;
}

/**
 * Detect SLA breaches — sagas where step_deadline has passed.
 */
async function detectSlaBreaches(): Promise<number> {
  const pool = getPool();
  const result = await pool.query<SagaRow>(
    `SELECT id, factory_id, order_id, connection_id, current_step, step_deadline
     FROM order_sagas
     WHERE current_step NOT IN ('COMPLETED', 'FAILED')
       AND step_deadline < NOW()
       AND (locked_by IS NULL OR lock_expires < NOW())
     LIMIT 50`,
  );

  for (const saga of result.rows) {
    logger.warn(
      { sagaId: saga.id, orderId: saga.order_id, step: saga.current_step, deadline: saga.step_deadline },
      'SLA breach detected',
    );

    // Create escalation log entry
    await pool.query(
      `INSERT INTO escalation_log (factory_id, connection_id, trigger_type, trigger_details, current_step, status)
       VALUES ($1, $2, 'SLA_BREACH', $3, 'NOTIFY', 'ACTIVE')
       ON CONFLICT DO NOTHING`,
      [saga.factory_id, saga.connection_id, JSON.stringify({
        saga_id: saga.id, order_id: saga.order_id, step: saga.current_step,
      })],
    );
  }

  return result.rows.length;
}

/**
 * Recover stale locks — sagas where lock_expires has passed.
 */
async function recoverStaleLocks(): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE order_sagas
     SET locked_by = NULL, lock_expires = NULL, updated_at = NOW()
     WHERE locked_by IS NOT NULL AND lock_expires < NOW()
     RETURNING id`,
  );

  if (result.rowCount && result.rowCount > 0) {
    logger.info({ count: result.rowCount }, 'Recovered stale saga locks');
  }
  return result.rowCount ?? 0;
}

async function pollSagas(): Promise<void> {
  try {
    await detectSlaBreaches();
    await recoverStaleLocks();
  } catch (err) {
    logger.error({ err }, 'Saga coordinator poll failed');
  }
}

export function startSagaCoordinator(): void {
  if (pollTimer) return;
  logger.info({ intervalMs: SAGA_POLL_INTERVAL_MS }, 'Starting saga coordinator');
  pollTimer = setInterval(() => { pollSagas(); }, SAGA_POLL_INTERVAL_MS);
}

export function stopSagaCoordinator(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info('Saga coordinator stopped');
  }
}

export { pollSagas, detectSlaBreaches, recoverStaleLocks };
