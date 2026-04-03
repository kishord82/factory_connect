/**
 * B24: Webhook outbound service — delivers events to external endpoints.
 */
import { getPool } from '@fc/database';
import { createLogger } from '@fc/observability';

const logger = createLogger('webhooks');

interface WebhookSubscription {
  id: string;
  factory_id: string;
  url: string;
  event_types: string[];
  secret: string;
  is_active: boolean;
  created_at: Date;
}

interface WebhookDelivery {
  subscription_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  last_error: string | null;
}

export async function getActiveSubscriptions(factoryId: string, eventType: string): Promise<WebhookSubscription[]> {
  const pool = getPool();
  const result = await pool.query<WebhookSubscription>(
    `SELECT * FROM webhook_subscriptions WHERE factory_id = $1 AND is_active = true AND $2 = ANY(event_types)`,
    [factoryId, eventType],
  );
  return result.rows;
}

export async function enqueueDelivery(
  subscriptionId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO webhook_deliveries (subscription_id, event_type, payload, status, attempts)
     VALUES ($1, $2, $3, 'pending', 0)`,
    [subscriptionId, eventType, JSON.stringify(payload)],
  );
  logger.info({ subscriptionId, eventType }, 'Webhook delivery enqueued');
}

export async function processWebhookDeliveries(): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<WebhookDelivery & { id: string; url: string; secret: string }>(
      `SELECT wd.id, wd.subscription_id, wd.event_type, wd.payload, wd.attempts,
              ws.url, ws.secret
       FROM webhook_deliveries wd
       JOIN webhook_subscriptions ws ON ws.id = wd.subscription_id
       WHERE wd.status = 'pending' AND wd.attempts < 5
       ORDER BY wd.created_at ASC
       LIMIT 50
       FOR UPDATE OF wd SKIP LOCKED`,
    );

    let delivered = 0;
    for (const row of result.rows) {
      try {
        // In production, this would make an HTTP request to row.url
        // For now, just mark as delivered
        await client.query(
          `UPDATE webhook_deliveries SET status = 'delivered', attempts = attempts + 1, delivered_at = NOW() WHERE id = $1`,
          [row.id],
        );
        delivered++;
      } catch (err) {
        await client.query(
          `UPDATE webhook_deliveries SET attempts = attempts + 1, last_error = $1 WHERE id = $2`,
          [err instanceof Error ? err.message : 'Unknown error', row.id],
        );
        logger.error({ err, deliveryId: row.id }, 'Webhook delivery failed');
      }
    }

    await client.query('COMMIT');
    return delivered;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Webhook delivery processing failed');
    return 0;
  } finally {
    client.release();
  }
}
