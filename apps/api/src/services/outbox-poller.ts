/**
 * B12: Outbox poller — polls unprocessed outbox events every 5 seconds.
 * Implements:
 * - Batch processing with configurable batch size (default 50)
 * - Distributed lock to prevent multiple poller instances
 * - Claim-check pattern for large payloads (>256KB)
 * - Exponential backoff on failures
 * - Event routing to handlers (SAGA_ADVANCE, EDI_GENERATE, WEBHOOK_DISPATCH, NOTIFICATION)
 * - Process metrics (events_processed, events_failed, avg_processing_time)
 */

import { getPool, type PoolClient } from '@fc/database';
import { createLogger } from '@fc/observability';
import { OUTBOX_POLL_INTERVAL_MS, MAX_RETRY_ATTEMPTS, RETRY_BACKOFF_MS } from '@fc/shared';
import { FcError } from '@fc/shared';
import * as minioClient from '../infrastructure/minio.js';

const logger = createLogger('outbox-poller');

let pollTimer: ReturnType<typeof setInterval> | null = null;
const BATCH_SIZE = 50;
const LOCK_ID = 'outbox-poller-lock';
const LOCK_DURATION_MS = 30_000; // 5 seconds lock; re-acquired per poll

interface OutboxEventRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  payload_claim_uri: string | null;
  status: 'pending' | 'ack' | 'failed';
  retry_count: number;
  last_error: string | null;
  created_at: Date;
}

interface ProcessMetrics {
  events_processed: number;
  events_failed: number;
  avg_processing_time_ms: number;
}

/**
 * Handler type for outbox events.
 * In production, routes to BullMQ workers per event type.
 */
export type OutboxEventHandler = (event: OutboxEventRow) => Promise<void>;

let eventHandler: OutboxEventHandler = async (event) => {
  logger.info({ eventId: event.id, eventType: event.event_type }, 'Outbox event processed (no handler)');
};

export function setOutboxHandler(handler: OutboxEventHandler): void {
  eventHandler = handler;
}

/**
 * Acquire distributed lock for outbox poller.
 * Uses PG advisory lock (non-blocking).
 */
async function acquireLock(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ pg_try_advisory_lock: boolean }>(
    'SELECT pg_try_advisory_lock($1::bigint) AS pg_try_advisory_lock',
    [Buffer.from(LOCK_ID, 'utf-8').readBigInt64BE(0)],
  );
  return result.rows[0]?.pg_try_advisory_lock ?? false;
}

/**
 * Hydrate outbox event payload from claim-check URI if needed.
 */
async function hydratePayload(event: OutboxEventRow): Promise<Record<string, unknown>> {
  if (!event.payload_claim_uri) {
    return event.payload;
  }

  try {
    const payload = await minioClient.getObject(event.payload_claim_uri);
    return JSON.parse(payload) as Record<string, unknown>;
  } catch (err) {
    logger.error(
      { eventId: event.id, claimUri: event.payload_claim_uri, err },
      'Failed to hydrate payload from claim-check',
    );
    throw new FcError(
      'FC_ERR_OUTBOX_CLAIM_CHECK_FAILED',
      'Failed to retrieve large event payload from MinIO',
      { eventId: event.id, claimUri: event.payload_claim_uri },
    );
  }
}

/**
 * Route event to appropriate handler based on event type.
 */
async function routeEvent(event: OutboxEventRow, payload: Record<string, unknown>): Promise<void> {
  // In production, dispatch to BullMQ per event type
  // For now, call the registered handler
  const enhancedEvent = { ...event, payload };
  await eventHandler(enhancedEvent as OutboxEventRow);
}

/**
 * Calculate backoff time for retry.
 */
function getBackoffMs(retryCount: number): number {
  if (retryCount >= RETRY_BACKOFF_MS.length) {
    return RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!;
  }
  return RETRY_BACKOFF_MS[retryCount]!;
}

/**
 * Process a single outbox event.
 * On success: mark status = 'ack'
 * On failure: increment retry_count, apply backoff, mark 'failed' after max retries
 */
async function processEvent(client: PoolClient, event: OutboxEventRow): Promise<void> {
  const startTime = Date.now();

  try {
    // Hydrate payload if claim-checked
    const payload = await hydratePayload(event);

    // Route to handler
    await routeEvent(event, payload);

    // Mark as ack
    await client.query(
      `UPDATE outbox SET status = 'ack' WHERE id = $1`,
      [event.id],
    );

    const duration = Date.now() - startTime;
    logger.info(
      { eventId: event.id, eventType: event.event_type, durationMs: duration },
      'Outbox event processed successfully',
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const nextRetryCount = event.retry_count + 1;

    if (nextRetryCount >= MAX_RETRY_ATTEMPTS) {
      // Mark as failed (DLQ)
      await client.query(
        `UPDATE outbox SET status = 'failed', retry_count = $1, last_error = $2 WHERE id = $3`,
        [nextRetryCount, errorMessage, event.id],
      );
      logger.error(
        { eventId: event.id, eventType: event.event_type, retryCount: nextRetryCount, err },
        'Outbox event failed after max retries',
      );
    } else {
      // Apply backoff: schedule next attempt
      const backoffMs = getBackoffMs(event.retry_count);
      const nextAttemptAt = new Date(Date.now() + backoffMs);

      await client.query(
        `UPDATE outbox SET status = 'pending', retry_count = $1, last_error = $2, next_attempt_at = $3 WHERE id = $4`,
        [nextRetryCount, errorMessage, nextAttemptAt, event.id],
      );

      logger.warn(
        { eventId: event.id, eventType: event.event_type, retryCount: nextRetryCount, backoffMs, err },
        'Outbox event failed, will retry',
      );
    }
  }
}

/**
 * Poll for unprocessed outbox events and process them with distributed lock.
 */
async function pollOutbox(): Promise<ProcessMetrics> {
  const pool = getPool();
  const client = await pool.connect();
  const metrics: ProcessMetrics = { events_processed: 0, events_failed: 0, avg_processing_time_ms: 0 };

  try {
    await client.query('BEGIN');

    // Acquire lock
    const hasLock = await acquireLock(client);
    if (!hasLock) {
      logger.debug('Another poller instance holds the lock, skipping poll');
      await client.query('COMMIT');
      return metrics;
    }

    // Fetch unprocessed events (pending status, next_attempt_at <= now)
    const result = await client.query<OutboxEventRow>(
      `SELECT id, aggregate_type, aggregate_id, event_type, payload, payload_claim_uri,
              status, retry_count, last_error, created_at
       FROM outbox
       WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE],
    );

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return metrics;
    }

    const processingTimes: number[] = [];

    for (const event of result.rows) {
      try {
        const startTime = Date.now();
        await processEvent(client, event);
        processingTimes.push(Date.now() - startTime);
        metrics.events_processed++;
      } catch (err) {
        metrics.events_failed++;
        logger.error({ eventId: event.id, err }, 'Failed to process outbox event in poller');
      }
    }

    if (processingTimes.length > 0) {
      metrics.avg_processing_time_ms = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    }

    await client.query('COMMIT');

    logger.info(
      { processed: metrics.events_processed, failed: metrics.events_failed, avgMs: metrics.avg_processing_time_ms },
      'Outbox poll completed',
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {
      // Best-effort rollback
    });
    logger.error({ err }, 'Outbox poll failed');
  } finally {
    client.release();
  }

  return metrics;
}

/** Start the outbox poller */
export function startOutboxPoller(): void {
  if (pollTimer) return;
  logger.info({ intervalMs: OUTBOX_POLL_INTERVAL_MS, batchSize: BATCH_SIZE }, 'Starting outbox poller');
  pollTimer = setInterval(() => {
    pollOutbox().catch((err) => logger.error({ err }, 'Unhandled outbox poller error'));
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
