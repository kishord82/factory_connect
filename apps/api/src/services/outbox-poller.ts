/**
 * B12: Outbox poller — polls unprocessed outbox events every 5 seconds.
 * Dispatches to BullMQ for processing. Idempotent.
 */

import { getPool } from '@fc/database';
import { createLogger } from '@fc/observability';
import { OUTBOX_POLL_INTERVAL_MS } from '@fc/shared';

const logger = createLogger('outbox-poller');

let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Process handler — in production, dispatches to BullMQ.
 * Can be overridden for testing.
 */
export type OutboxEventHandler = (event: OutboxEvent) => Promise<void>;

interface OutboxEvent {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

let eventHandler: OutboxEventHandler = async (event) => {
  logger.info({ eventId: event.id, eventType: event.event_type }, 'Outbox event dispatched (no handler)');
};

export function setOutboxHandler(handler: OutboxEventHandler): void {
  eventHandler = handler;
}

/**
 * Poll for unprocessed outbox events and dispatch them.
 */
async function pollOutbox(): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Lock and fetch unprocessed events (FOR UPDATE SKIP LOCKED for concurrency)
    await client.query('BEGIN');
    const result = await client.query<OutboxEvent>(
      `SELECT id, aggregate_type, aggregate_id, event_type, payload, created_at
       FROM outbox
       WHERE processed_at IS NULL
       ORDER BY created_at ASC
       LIMIT 100
       FOR UPDATE SKIP LOCKED`,
    );

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return 0;
    }

    for (const event of result.rows) {
      try {
        await eventHandler(event);
        await client.query(
          'UPDATE outbox SET processed_at = NOW() WHERE id = $1',
          [event.id],
        );
      } catch (err) {
        logger.error({ eventId: event.id, err }, 'Failed to process outbox event');
        // Don't mark as processed — will retry on next poll
      }
    }

    await client.query('COMMIT');
    return result.rows.length;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Outbox poll failed');
    return 0;
  } finally {
    client.release();
  }
}

/** Start the outbox poller */
export function startOutboxPoller(): void {
  if (pollTimer) return;
  logger.info({ intervalMs: OUTBOX_POLL_INTERVAL_MS }, 'Starting outbox poller');
  pollTimer = setInterval(() => {
    pollOutbox().catch((err) => logger.error({ err }, 'Outbox poller error'));
  }, OUTBOX_POLL_INTERVAL_MS);
}

/** Stop the outbox poller */
export function stopOutboxPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info('Outbox poller stopped');
  }
}

/** Manually trigger a poll (for testing) */
export { pollOutbox };
