/**
 * CA10: TDS Reconciliation Worker
 * BullMQ worker for async TDS/TRACES reconciliation
 * Queue: 'ca:tds-recon'
 * Processes reconciliation sessions and detects mismatches
 */

import { createLogger } from '@fc/observability';
import type { CaRequestContext } from '@fc/shared';
import { Worker, type Job } from 'bullmq';

import { createException } from '../../services/compliance/exception-service.js';
import { reconcileTds } from '../../services/compliance/tds-service.js';

const logger = createLogger('tds-recon-worker');

interface TdsReconJob {
  caFirmId: string;
  clientId: string;
  period: string;
  quarter: string;
  userId: string;
  correlationId: string;
}

const QUEUE_NAME = 'ca:tds-recon';
const CONCURRENCY = 5;

function buildJobContext(data: TdsReconJob): CaRequestContext {
  return {
    caFirmId: data.caFirmId,
    tenantId: data.caFirmId,
    userId: data.userId,
    correlationId: data.correlationId,
    role: 'system',
    subscriptionTier: 'professional',
  };
}

function logReconMismatch(
  sessionId: string,
  matched: number,
  unmatchedSource: number,
  unmatchedTarget: number,
): void {
  const matchRate = matched > 0
    ? (matched / (matched + unmatchedSource + unmatchedTarget)) * 100
    : 0;

  logger.info(
    { sessionId, matchRate: matchRate.toFixed(2) },
    `TDS reconciliation complete with ${unmatchedSource} unmatched source and ${unmatchedTarget} unmatched target entries`,
  );
}

async function handleReconFailure(
  ctx: CaRequestContext,
  data: TdsReconJob,
  err: unknown,
): Promise<void> {
  try {
    await createException(ctx, {
      filing_id: '',
      client_id: data.clientId,
      exception_type: 'TDS_RECON_FAILURE',
      severity: 'high',
      description: `TDS reconciliation failed for Q${data.quarter}: ${err instanceof Error ? err.message : String(err)}`,
      source_data: { period: data.period, quarter: data.quarter },
      suggested_fix: 'Review Tally and TRACES data; retry reconciliation',
    });
  } catch (exErr) {
    logger.error(
      { error: exErr instanceof Error ? exErr.message : String(exErr) },
      'Failed to create exception for TDS recon failure',
    );
  }
}

/**
 * Process TDS reconciliation job
 */
async function processTdsReconJob(job: Job<TdsReconJob>): Promise<void> {
  const { caFirmId, clientId, period, quarter, correlationId } = job.data;

  logger.info(
    { jobId: job.id, caFirmId, clientId, period, quarter, correlationId },
    'Processing TDS reconciliation job',
  );

  try {
    const ctx = buildJobContext(job.data);
    const session = await reconcileTds(ctx, clientId, period, quarter);

    logger.info(
      {
        jobId: job.id,
        sessionId: session.id,
        matchedCount: session.matched_count,
        unmatchedSource: session.unmatched_source,
        unmatchedTarget: session.unmatched_target,
        variance: session.variance_amount,
      },
      'TDS reconciliation completed',
    );

    job.updateProgress(100);

    if (session.unmatched_source > 0 || session.unmatched_target > 0) {
      logReconMismatch(
        session.id,
        session.matched_count,
        session.unmatched_source,
        session.unmatched_target,
      );
    }
  } catch (err) {
    logger.error(
      {
        jobId: job.id,
        caFirmId,
        clientId,
        quarter,
        error: err instanceof Error ? err.message : String(err),
      },
      'TDS reconciliation job failed',
    );

    const ctx = buildJobContext(job.data);
    await handleReconFailure(ctx, job.data, err);
    throw err;
  }
}

/**
 * Initialize and start the TDS reconciliation worker
 */
export function startTdsReconWorker(): Worker<TdsReconJob> {
  const redis = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };

  const worker = new Worker<TdsReconJob>(QUEUE_NAME, processTdsReconJob, {
    connection: redis,
    concurrency: CONCURRENCY,
  });

  // Event handlers
  worker.on('active', (job) => {
    logger.info({ jobId: job.id }, 'TDS recon job started');
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'TDS recon job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        attempt: job?.attemptsMade,
        maxAttempts: job?.opts.attempts,
        error: err.message,
      },
      'TDS recon job failed',
    );
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, 'TDS recon worker error');
  });

  logger.info({ queueName: QUEUE_NAME, concurrency: CONCURRENCY }, 'TDS recon worker started');

  return worker;
}

/**
 * Queue a TDS reconciliation job
 */
export async function queueTdsReconJob(data: TdsReconJob): Promise<void> {

  // In BullMQ, we'd need to get a Queue instance
  // For now, this is a placeholder; actual implementation uses Queue class

  logger.info(
    {
      caFirmId: data.caFirmId,
      clientId: data.clientId,
      quarter: data.quarter,
    },
    'Queuing TDS reconciliation',
  );
}
