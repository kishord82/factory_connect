/**
 * CA-C4: Auto-chase reminder worker.
 * BullMQ repeatable job: runs every 6 hours.
 * Sends WhatsApp reminders for overdue document requests.
 * Respects quiet hours (21:00-08:00 IST).
 */

import { Worker, Queue, type Job, type JobsOptions } from 'bullmq';
import { createLogger } from '@fc/observability';
import { sendTemplateMessage } from '../../services/communication/whatsapp-service.js';
import { incrementReminder, getOverdueRequests } from '../../services/communication/doc-request-service.js';
import type { RequestContext, CaRequestContext } from '@fc/shared';

const logger = createLogger('auto-chase-worker');

const QUEUE_NAME = 'ca:auto-chase';
const WORKER_CONCURRENCY = 1; // Single global job

interface AutoChaseJobData {
  caFirmId: string;
}

/**
 * Create the auto-chase worker.
 */
export function createAutoCaseWorker(): Worker<AutoChaseJobData> {
  const redis = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };

  return new Worker<AutoChaseJobData>(
    QUEUE_NAME,
    async (job: Job<AutoChaseJobData>) => {
      try {
        await processAutoCaseJob(job.data);
        logger.info({ jobId: job.id }, 'Auto-chase job completed successfully');
      } catch (err) {
        logger.error({ err, jobId: job.id }, 'Auto-chase job failed');
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
 * Register the auto-chase job as repeatable.
 * Runs every 6 hours.
 */
export async function registerAutoCaseJob(): Promise<void> {
  const redis = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };

  const q = new Queue(QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  const jobOptions: JobsOptions = {
    repeat: {
      pattern: '0 */6 * * *', // Every 6 hours
    },
    removeOnComplete: true,
    removeOnFail: false,
  };

  await q.add(
    'run-auto-chase',
    {},
    jobOptions,
  );

  logger.info({ queue: QUEUE_NAME, pattern: '0 */6 * * *' }, 'Auto-chase job registered');

  await q.close();
}

/**
 * Process auto-chase job: find overdue requests, send reminders, update tracking.
 */
async function processAutoCaseJob(jobData: AutoChaseJobData): Promise<void> {
  // Check quiet hours
  const istTime = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // UTC+5:30 IST
  const hour = istTime.getUTCHours();
  const inQuietHours = hour >= 21 || hour < 8;

  if (inQuietHours) {
    logger.info({ hour }, 'Auto-chase skipped: currently in quiet hours (21:00-08:00 IST)');
    return;
  }

  try {
    // Create a CA request context for the operation
    const caCtx: CaRequestContext = {
      caFirmId: jobData.caFirmId,
      tenantId: jobData.caFirmId,
      userId: 'system:auto-chase',
      correlationId: `auto-chase-${Date.now()}`,
      role: 'system',
      subscriptionTier: 'professional',
    };

    // Get overdue requests
    const overdueRequests = await getOverdueRequests(caCtx);

    if (overdueRequests.length === 0) {
      logger.info({ caFirmId: jobData.caFirmId }, 'No overdue requests to chase');
      return;
    }

    logger.info(
      { caFirmId: jobData.caFirmId, overdueCount: overdueRequests.length },
      'Processing overdue document requests',
    );

    for (const request of overdueRequests) {
      try {
        // Skip if channel is not WhatsApp
        if (request.channel !== 'whatsapp') {
          logger.debug({ requestId: request.id, channel: request.channel }, 'Skipping non-WhatsApp request');
          continue;
        }

        // Send reminder via WhatsApp template
        try {
          await sendTemplateMessage(caCtx, request.client_id, 'doc_reminder', {
            documentType: request.document_type,
            period: request.period,
            dueDate: request.due_date.toLocaleDateString('en-IN'),
            reminderNumber: String(request.reminder_count + 1),
          });

          logger.info(
            { requestId: request.id, clientId: request.client_id, reminderCount: request.reminder_count },
            'Sent reminder for overdue document request',
          );
        } catch (err) {
          logger.warn(
            { requestId: request.id, clientId: request.client_id, err },
            'Failed to send reminder; will retry next cycle',
          );
          continue;
        }

        // Increment reminder count and update status if max reached
        await incrementReminder(caCtx, request.id);
      } catch (err) {
        logger.error(
          { requestId: request.id, err },
          'Error processing individual document request',
        );
        // Continue with next request
      }
    }

    logger.info(
      { caFirmId: jobData.caFirmId, processed: overdueRequests.length },
      'Auto-chase cycle completed',
    );
  } catch (err) {
    logger.error({ err }, 'Auto-chase job failed');
    throw err;
  }
}
