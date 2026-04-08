/**
 * B24: Webhook outbound service — registers, tests, and delivers webhooks.
 * Features:
 * - registerWebhook: create webhook subscription with event filtering
 * - testWebhook: send test payload to webhook
 * - deliverWebhook: deliver event to all registered webhooks for event type
 * - HMAC-SHA256 signing with timing-safe verification
 * - Retry with exponential backoff (3 attempts)
 * - Webhook delivery log tracking
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { RequestContext, OutboxEventType } from '@fc/shared';
import { FcError } from '@fc/shared';
import { RETRY_BACKOFF_MS } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, findMany, paginatedQuery, getPool } from '@fc/database';
import type { PoolClient, PaginatedResult } from '@fc/database';
import { createLogger } from '@fc/observability';

const logger = createLogger('webhooks');
const MAX_WEBHOOK_RETRIES = 3;
const WEBHOOK_TIMEOUT_MS = 30_000;

interface WebhookSubscriptionRow {
  id: string;
  factory_id: string;
  url: string;
  events: string[]; // Event types array
  secret: string;
  custom_headers: Record<string, string> | null;
  active: boolean;
  last_delivery_at: Date | null;
  failure_count: number;
  created_at: Date;
  updated_at: Date;
}

interface WebhookDeliveryRow {
  id: string;
  factory_id: string;
  subscription_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  last_error: string | null;
  delivered_at: Date | null;
  created_at: Date;
}

/**
 * Register a new webhook subscription.
 */
export async function registerWebhook(
  ctx: RequestContext,
  data: {
    url: string;
    events: OutboxEventType[];
    secret: string;
    custom_headers?: Record<string, string>;
  },
): Promise<WebhookSubscriptionRow> {
  if (!data.url.startsWith('http')) {
    throw new FcError('FC_ERR_WEBHOOK_INVALID_URL', 'Webhook URL must be HTTP(S)', {}, 400);
  }

  if (data.events.length === 0) {
    throw new FcError('FC_ERR_WEBHOOK_NO_EVENTS', 'At least one event type must be selected', {}, 400);
  }

  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const subscription = await insertOne<WebhookSubscriptionRow>(
      client,
      `INSERT INTO webhook_subscriptions (
        factory_id, url, events, secret, custom_headers, active
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *`,
      [
        ctx.tenantId,
        data.url,
        JSON.stringify(data.events),
        data.secret,
        data.custom_headers ? JSON.stringify(data.custom_headers) : null,
      ],
    );

    logger.info({ webhookId: subscription.id, url: data.url }, 'Webhook registered');
    return subscription;
  });
}

/**
 * List webhook subscriptions for a tenant.
 */
export async function listWebhooks(
  ctx: RequestContext,
  page: number = 1,
  pageSize: number = 25,
): Promise<PaginatedResult<WebhookSubscriptionRow>> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return paginatedQuery<WebhookSubscriptionRow>(
      client,
      'SELECT * FROM webhook_subscriptions WHERE factory_id = $1 ORDER BY created_at DESC',
      [ctx.tenantId],
      page,
      pageSize,
    );
  });
}

/**
 * Delete a webhook subscription.
 */
export async function deleteWebhook(ctx: RequestContext, webhookId: string): Promise<void> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const existing = await findOne<WebhookSubscriptionRow>(
      client,
      'SELECT * FROM webhook_subscriptions WHERE id = $1 AND factory_id = $2',
      [webhookId, ctx.tenantId],
    );

    if (!existing) {
      throw new FcError(
        'FC_ERR_WEBHOOK_NOT_FOUND',
        `Webhook ${webhookId} not found`,
        { webhookId },
        404,
      );
    }

    await client.query('DELETE FROM webhook_subscriptions WHERE id = $1', [webhookId]);
    logger.info({ webhookId }, 'Webhook deleted');
  });
}

/**
 * Test a webhook by sending a test payload.
 */
export async function testWebhook(ctx: RequestContext, webhookId: string): Promise<{ status: number; body: string }> {
  const subscription = await withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<WebhookSubscriptionRow>(
      client,
      'SELECT * FROM webhook_subscriptions WHERE id = $1 AND factory_id = $2',
      [webhookId, ctx.tenantId],
    );
  });

  if (!subscription) {
    throw new FcError(
      'FC_ERR_WEBHOOK_NOT_FOUND',
      `Webhook ${webhookId} not found`,
      { webhookId },
      404,
    );
  }

  const testPayload = {
    event_type: 'webhook_test',
    timestamp: new Date().toISOString(),
    test: true,
  };

  try {
    const response = await deliverToEndpoint(subscription, testPayload, 'webhook_test');
    logger.info({ webhookId, status: response.status }, 'Webhook test sent');
    return response;
  } catch (err) {
    logger.error({ webhookId, err }, 'Webhook test failed');
    throw new FcError(
      'FC_ERR_WEBHOOK_TEST_FAILED',
      err instanceof Error ? err.message : 'Webhook test failed',
      {},
      500,
    );
  }
}

/**
 * Calculate HMAC-SHA256 signature for webhook.
 * Format: "v1=" + base64(hmac)
 */
function calculateSignature(payload: Record<string, unknown>, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return `v1=${hmac.digest('base64')}`;
}

/**
 * Verify webhook signature using timing-safe comparison.
 */
export function verifySignature(payload: Record<string, unknown>, signature: string, secret: string): boolean {
  try {
    const expected = calculateSignature(payload, secret);
    const expectedBuf = Buffer.from(expected, 'utf-8');
    const signatureBuf = Buffer.from(signature, 'utf-8');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * Deliver webhook to a single endpoint.
 */
async function deliverToEndpoint(
  subscription: WebhookSubscriptionRow,
  payload: Record<string, unknown>,
  eventType: string,
): Promise<{ status: number; body: string }> {
  const signature = calculateSignature(payload, subscription.secret);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-FC-Signature': signature,
    'X-FC-Event-Type': eventType,
    'X-FC-Timestamp': new Date().toISOString(),
    ...( subscription.custom_headers || {}),
  };

  const response = await fetch(subscription.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new FcError(
      'FC_ERR_WEBHOOK_HTTP_ERROR',
      `HTTP ${response.status}`,
      { status: response.status, url: subscription.url },
    );
  }

  const body = await response.text();
  return { status: response.status, body };
}

/**
 * Deliver an event to all registered webhooks for the event type.
 * Creates entries in webhook_deliveries table for async processing.
 */
export async function deliverWebhook(
  ctx: RequestContext,
  eventType: OutboxEventType,
  payload: Record<string, unknown>,
): Promise<number> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Get active subscriptions for this event type
    const subscriptions = await findMany<WebhookSubscriptionRow>(
      client,
      `SELECT * FROM webhook_subscriptions
       WHERE factory_id = $1 AND active = true AND $2 = ANY(events)`,
      [ctx.tenantId, eventType],
    );

    if (subscriptions.length === 0) {
      return 0;
    }

    // Create delivery records for each subscription
    let created = 0;
    for (const subscription of subscriptions) {
      await insertOne(
        client,
        `INSERT INTO webhook_deliveries (
          factory_id, subscription_id, event_type, payload, status, attempts
        ) VALUES ($1, $2, $3, $4, 'pending', 0)`,
        [
          ctx.tenantId,
          subscription.id,
          eventType,
          JSON.stringify(payload),
        ],
      );
      created++;
    }

    logger.info(
      { eventType, subscriptionCount: subscriptions.length, deliveryCount: created },
      'Webhook deliveries queued',
    );

    return created;
  });
}

/**
 * Process pending webhook deliveries with retry logic.
 * Called by a background worker (BullMQ or similar).
 */
export async function processWebhookDeliveries(): Promise<{ delivered: number; failed: number }> {
  const pool = getPool();
  const client = await pool.connect();
  const result = { delivered: 0, failed: 0 };

  try {
    await client.query('BEGIN');

    // Get pending deliveries (limit 50 per batch)
    const deliveries = await client.query<WebhookDeliveryRow & { url: string; secret: string; custom_headers: Record<string, string> | null }>(
      `SELECT wd.*, ws.url, ws.secret, ws.custom_headers
       FROM webhook_deliveries wd
       JOIN webhook_subscriptions ws ON ws.id = wd.subscription_id
       WHERE wd.status = 'pending' AND wd.attempts < $1
       ORDER BY wd.created_at ASC
       LIMIT 50
       FOR UPDATE OF wd SKIP LOCKED`,
      [MAX_WEBHOOK_RETRIES],
    );

    for (const delivery of deliveries.rows) {
      try {
        const response = await deliverToEndpoint(
          {
            id: delivery.subscription_id,
            factory_id: delivery.factory_id,
            url: delivery.url,
            events: [], // Not needed for delivery
            secret: delivery.secret,
            custom_headers: delivery.custom_headers,
            active: true,
            last_delivery_at: null,
            failure_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
          delivery.payload,
          delivery.event_type,
        );

        // Mark as delivered
        await client.query(
          `UPDATE webhook_deliveries
           SET status = 'delivered', attempts = $1, delivered_at = NOW()
           WHERE id = $2`,
          [delivery.attempts + 1, delivery.id],
        );

        // Update subscription stats
        await client.query(
          `UPDATE webhook_subscriptions
           SET last_delivery_at = NOW(), failure_count = 0
           WHERE id = $1`,
          [delivery.subscription_id],
        );

        result.delivered++;
        logger.info(
          { deliveryId: delivery.id, subscriptionId: delivery.subscription_id, status: response.status },
          'Webhook delivered',
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const nextAttempts = delivery.attempts + 1;

        if (nextAttempts >= MAX_WEBHOOK_RETRIES) {
          // Mark as failed (DLQ)
          await client.query(
            `UPDATE webhook_deliveries
             SET status = 'failed', attempts = $1, last_error = $2
             WHERE id = $3`,
            [nextAttempts, errorMessage, delivery.id],
          );

          // Increment failure count on subscription
          await client.query(
            `UPDATE webhook_subscriptions
             SET failure_count = failure_count + 1
             WHERE id = $1`,
            [delivery.subscription_id],
          );

          result.failed++;
          logger.error(
            { deliveryId: delivery.id, subscriptionId: delivery.subscription_id, attempts: nextAttempts, err },
            'Webhook delivery failed after max retries',
          );
        } else {
          // Retry with backoff
          const backoffMs = RETRY_BACKOFF_MS[Math.min(delivery.attempts, RETRY_BACKOFF_MS.length - 1)]!;
          const nextAttemptAt = new Date(Date.now() + backoffMs);

          await client.query(
            `UPDATE webhook_deliveries
             SET status = 'pending', attempts = $1, last_error = $2, next_attempt_at = $3
             WHERE id = $4`,
            [nextAttempts, errorMessage, nextAttemptAt, delivery.id],
          );

          logger.warn(
            { deliveryId: delivery.id, subscriptionId: delivery.subscription_id, attempts: nextAttempts, backoffMs, err },
            'Webhook delivery failed, will retry',
          );
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {
      // Best-effort rollback
    });
    logger.error({ err }, 'Webhook delivery processing failed');
  } finally {
    client.release();
  }

  return result;
}
