/**
 * CA9: GST Preparation Worker
 * BullMQ worker for async GST filing preparation
 * Queue: 'ca:gst-prep'
 * Processes GSTR-1 and GSTR-3B filings with exception detection
 */

import { Worker, type Job } from 'bullmq';
import { createLogger } from '@fc/observability';
import type { CaRequestContext } from '@fc/shared';
import { prepareGstr1, prepareGstr3b } from '../../services/compliance/gst-service.js';
import { createException } from '../../services/compliance/exception-service.js';

const logger = createLogger('gst-prep-worker');

interface GstPrepJob {
  caFirmId: string;
  clientId: string;
  period: string;
  filingType: 'GSTR1' | 'GSTR3B';
  userId: string;
  correlationId: string;
}

const QUEUE_NAME = 'ca:gst-prep';
const CONCURRENCY = 5;

/**
 * Process GST filing job
 */
async function processGstPrepJob(job: Job<GstPrepJob>): Promise<void> {
  const { caFirmId, clientId, period, filingType, userId, correlationId } = job.data;

  logger.info(
    {
      jobId: job.id,
      caFirmId,
      clientId,
      period,
      filingType,
      correlationId,
    },
    `Processing GST preparation job: ${filingType}`,
  );

  try {
    const ctx: CaRequestContext = {
      caFirmId,
      tenantId: caFirmId,
      userId,
      correlationId,
      role: 'system',
      subscriptionTier: 'professional',
    };

    // Prepare filing based on type
    let filing;
    if (filingType === 'GSTR1') {
      filing = await prepareGstr1(ctx, clientId, period);
    } else {
      filing = await prepareGstr3b(ctx, clientId, period);
    }

    logger.info(
      {
        jobId: job.id,
        filingId: filing.id,
        filingType,
        status: filing.status,
      },
      `GST filing prepared successfully: ${filingType}`,
    );

    // Update job progress
    job.updateProgress(100);
  } catch (err) {
    logger.error(
      {
        jobId: job.id,
        caFirmId,
        clientId,
        period,
        filingType,
        error: err instanceof Error ? err.message : String(err),
      },
      `GST preparation job failed: ${filingType}`,
    );

    // Create compliance exception for failure
    try {
      const ctx: CaRequestContext = {
        caFirmId,
        tenantId: caFirmId,
        userId,
        correlationId,
        role: 'system',
        subscriptionTier: 'professional',
      };

      await createException(ctx, {
        filing_id: '', // Will be set in catch block if filing exists
        client_id: clientId,
        exception_type: 'GST_PREP_FAILURE',
        severity: 'high',
        description: `GST ${filingType} preparation failed: ${err instanceof Error ? err.message : String(err)}`,
        source_data: {
          period,
          filing_type: filingType,
        },
        suggested_fix: 'Retry the filing preparation or review source data',
      });
    } catch (exErr) {
      logger.error(
        { error: exErr instanceof Error ? exErr.message : String(exErr) },
        'Failed to create exception for GST prep failure',
      );
    }

    // Rethrow to trigger retry
    throw err;
  }
}

/**
 * Initialize and start the GST preparation worker
 */
export function startGstPrepWorker(): Worker<GstPrepJob> {
  const redis = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };

  const worker = new Worker<GstPrepJob>(QUEUE_NAME, processGstPrepJob, {
    connection: redis,
    concurrency: CONCURRENCY,
  });

  // Event handlers
  worker.on('active', (job) => {
    logger.info({ jobId: job.id }, 'GST prep job started');
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'GST prep job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        attempt: job?.attemptsMade,
        maxAttempts: job?.opts.attempts,
        error: err.message,
      },
      'GST prep job failed',
    );
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, 'GST prep worker error');
  });

  logger.info({ queueName: QUEUE_NAME, concurrency: CONCURRENCY }, 'GST prep worker started');

  return worker;
}

/**
 * Queue a GST preparation job
 */
export async function queueGstPrepJob(data: GstPrepJob): Promise<Job<GstPrepJob> | undefined> {

  // In BullMQ, we'd need to get a Queue instance
  // For now, we return a placeholder; actual implementation uses Queue class
  logger.info(
    {
      caFirmId: data.caFirmId,
      clientId: data.clientId,
      filingType: data.filingType,
    },
    `Queuing GST preparation: ${data.filingType}`,
  );

  return undefined;
}
