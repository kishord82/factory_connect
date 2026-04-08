/**
 * CA-C5: WhatsApp webhook processing worker.
 * BullMQ worker: processes incoming WhatsApp webhooks asynchronously.
 * Concurrency: 10 (can handle 10 webhooks in parallel).
 */

import { Worker, Queue, type Job } from 'bullmq';
import { createLogger } from '@fc/observability';
import { processWebhook } from '../../services/communication/whatsapp-service.js';
import type { CaRequestContext } from '@fc/shared';

const logger = createLogger('whatsapp-webhook-worker');

const QUEUE_NAME = 'ca:whatsapp-webhook';
const WORKER_CONCURRENCY = 10;

interface WebhookJobData {
  caFirmId: string;
  webhookPayload: Record<string, unknown>;
  receivedAt: Date;
}

/**
 * Create the WhatsApp webhook worker.
 */
export function createWhatsAppWebhookWorker(): Worker<WebhookJobData> {
  const redis = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };

  return new Worker<WebhookJobData>(
    QUEUE_NAME,
    async (job: Job<WebhookJobData>) => {
      try {
        await processWebhookJob(job.data);
        logger.debug({ jobId: job.id, caFirmId: job.data.caFirmId }, 'Webhook processed successfully');
      } catch (err) {
        logger.error({ err, jobId: job.id, caFirmId: job.data.caFirmId }, 'Webhook processing failed');
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: WORKER_CONCURRENCY,
    },
  );
}

/**
 * Enqueue a webhook for processing.
 * Called from the HTTP webhook endpoint.
 */
export async function enqueueWebhook(caFirmId: string, webhookPayload: Record<string, unknown>): Promise<void> {
  const redis = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };
  const queue = new Queue(QUEUE_NAME, { connection: redis });

  try {
    await queue.add(
      'process-webhook',
      {
        caFirmId,
        webhookPayload,
        receivedAt: new Date(),
      },
      {
        priority: 10, // High priority for real-time message handling
      },
    );

    logger.debug({ caFirmId }, 'Webhook enqueued for processing');
  } finally {
    await queue.close();
  }
}

/**
 * Process webhook job.
 */
async function processWebhookJob(data: WebhookJobData): Promise<void> {
  const caCtx: CaRequestContext = {
    caFirmId: data.caFirmId,
    tenantId: data.caFirmId,
    userId: 'system:webhook',
    correlationId: `webhook-${Date.now()}`,
    role: 'system',
    subscriptionTier: 'professional',
  };

  // Process the webhook
  await processWebhook(caCtx, data.webhookPayload);

  logger.debug(
    { caFirmId: data.caFirmId, receivedAt: data.receivedAt, processedAt: new Date() },
    'Webhook processed',
  );
}
