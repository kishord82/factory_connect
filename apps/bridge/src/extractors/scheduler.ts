/**
 * Extraction Scheduler: Manages configurable, recurring extractions with retry and health checks.
 * Supports: per-client schedules, retry on failure, skip if Tally offline.
 * Default schedules: GST daily 2 AM, TDS weekly Sunday, Bank daily 3 AM, Payroll monthly 1st,
 * Trial Balance daily 4 AM, Stock weekly Friday.
 */

import { FcError } from '@fc/shared';
import { GstExtractor } from './gst-extractor.js';
import { TdsExtractor } from './tds-extractor.js';
import { LedgerExtractor } from './ledger-extractor.js';
import { BankExtractor } from './bank-extractor.js';
import { PayrollExtractor } from './payroll-extractor.js';
import { TrialBalanceExtractor } from './trial-balance-extractor.js';
import { StockExtractor } from './stock-extractor.js';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';

export type { TallyConfig };

export type ExtractionType = 'GST' | 'TDS' | 'LEDGER' | 'BANK' | 'PAYROLL' | 'TRIAL_BALANCE' | 'STOCK';

export interface ScheduleConfig {
  type: ExtractionType;
  cronExpression: string; // Standard 5-field cron format
  enabled: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
  skipIfTallyOffline: boolean;
}

export interface ClientScheduleConfig {
  tallyConfig: TallyConfig;
  schedules: ScheduleConfig[];
  timezone: string;
}

export interface ExtractionJob {
  id: string;
  type: ExtractionType;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt: Date | null;
  completedAt: Date | null;
  recordCount: number;
  errorCount: number;
  errors: string[];
}

/**
 * Default extraction schedules (in UTC).
 * Adjust timezone during initialization.
 */
export const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  {
    type: 'GST',
    cronExpression: '0 2 * * *', // Daily at 2 AM
    enabled: true,
    retryOnFailure: true,
    maxRetries: 3,
    skipIfTallyOffline: true,
  },
  {
    type: 'TDS',
    cronExpression: '0 3 * * 0', // Weekly Sunday at 3 AM
    enabled: true,
    retryOnFailure: true,
    maxRetries: 2,
    skipIfTallyOffline: true,
  },
  {
    type: 'LEDGER',
    cronExpression: '0 2 * * *', // Daily at 2 AM
    enabled: true,
    retryOnFailure: true,
    maxRetries: 3,
    skipIfTallyOffline: true,
  },
  {
    type: 'BANK',
    cronExpression: '0 3 * * *', // Daily at 3 AM
    enabled: true,
    retryOnFailure: true,
    maxRetries: 3,
    skipIfTallyOffline: true,
  },
  {
    type: 'PAYROLL',
    cronExpression: '0 4 1 * *', // Monthly 1st at 4 AM
    enabled: true,
    retryOnFailure: true,
    maxRetries: 2,
    skipIfTallyOffline: true,
  },
  {
    type: 'TRIAL_BALANCE',
    cronExpression: '0 4 * * *', // Daily at 4 AM
    enabled: true,
    retryOnFailure: true,
    maxRetries: 3,
    skipIfTallyOffline: true,
  },
  {
    type: 'STOCK',
    cronExpression: '0 2 * * 5', // Weekly Friday at 2 AM
    enabled: true,
    retryOnFailure: true,
    maxRetries: 3,
    skipIfTallyOffline: true,
  },
];

export class ExtractionScheduler {
  private config: ClientScheduleConfig;
  private jobs: Map<string, ExtractionJob> = new Map();
  private extractors: Map<ExtractionType, BaseExtractor<unknown>> = new Map();

  constructor(config: ClientScheduleConfig) {
    this.config = config;
    this.initializeExtractors();
  }

  private initializeExtractors(): void {
    this.extractors.set('GST', new GstExtractor(this.config.tallyConfig));
    this.extractors.set('TDS', new TdsExtractor(this.config.tallyConfig));
    this.extractors.set('LEDGER', new LedgerExtractor(this.config.tallyConfig));
    this.extractors.set('BANK', new BankExtractor(this.config.tallyConfig));
    this.extractors.set('PAYROLL', new PayrollExtractor(this.config.tallyConfig));
    this.extractors.set('TRIAL_BALANCE', new TrialBalanceExtractor(this.config.tallyConfig));
    this.extractors.set('STOCK', new StockExtractor(this.config.tallyConfig));
  }

  /**
   * Execute extraction immediately (not via schedule).
   * Useful for on-demand extractions.
   */
  async executeExtraction(type: ExtractionType): Promise<ExtractionResult<unknown>> {
    const jobId = `${type}-${Date.now()}`;
    const job: ExtractionJob = {
      id: jobId,
      type,
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      recordCount: 0,
      errorCount: 0,
      errors: [],
    };

    this.jobs.set(jobId, job);

    try {
      // Check if Tally is reachable
      if (!(await this.isTallyReachable())) {
        job.status = 'failed';
        job.completedAt = new Date();
        job.errors.push('Tally is not reachable');
        job.errorCount = 1;
        this.jobs.set(jobId, job);

        throw new FcError(
          'FC_ERR_BRIDGE_TALLY_UNREACHABLE',
          'Tally is not reachable on the configured host:port',
          { host: this.config.tallyConfig.host, port: this.config.tallyConfig.port },
        );
      }

      const extractor = this.extractors.get(type);
      if (!extractor) {
        throw new FcError(
          'FC_ERR_BRIDGE_EXTRACTOR_NOT_FOUND',
          `No extractor found for type: ${type}`,
          { type },
        );
      }

      const result = await extractor.extract();

      job.status = result.success ? 'success' : 'failed';
      job.completedAt = new Date();
      job.recordCount = result.recordCount;
      job.errorCount = result.errors.length;
      job.errors = result.errors;

      this.jobs.set(jobId, job);

      return result;
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errorCount = 1;
      job.errors.push(error instanceof Error ? error.message : String(error));
      this.jobs.set(jobId, job);

      throw error;
    }
  }

  /**
   * Execute all enabled extractions sequentially.
   * Returns map of extraction type to result.
   */
  async executeAllExtractions(): Promise<Map<ExtractionType, ExtractionResult<unknown>>> {
    const results = new Map<ExtractionType, ExtractionResult<unknown>>();

    for (const schedule of this.config.schedules) {
      if (!schedule.enabled) {
        continue;
      }

      try {
        const result = await this.executeExtraction(schedule.type);
        results.set(schedule.type, result);
      } catch (error) {
        // Continue with next extraction even if one fails
        console.error(`Extraction failed for ${schedule.type}:`, error);
      }
    }

    return results;
  }

  /**
   * Get job status by ID.
   */
  getJobStatus(jobId: string): ExtractionJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs.
   */
  getAllJobs(): ExtractionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Check if Tally is reachable via simple TCP connection attempt.
   */
  private async isTallyReachable(): Promise<boolean> {
    try {
      const response = await fetch(
        `http://${this.config.tallyConfig.host}:${this.config.tallyConfig.port}`,
        {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        },
      );
      return response.ok || response.status === 405; // 405 Method Not Allowed is still OK
    } catch {
      return false;
    }
  }

  /**
   * Get schedule for a specific extraction type.
   */
  getSchedule(type: ExtractionType): ScheduleConfig | undefined {
    return this.config.schedules.find((s) => s.type === type);
  }

  /**
   * Update schedule for a specific extraction type.
   */
  updateSchedule(type: ExtractionType, updates: Partial<ScheduleConfig>): void {
    const schedule = this.getSchedule(type);
    if (!schedule) {
      throw new FcError(
        'FC_ERR_BRIDGE_SCHEDULE_NOT_FOUND',
        `No schedule found for type: ${type}`,
        { type },
      );
    }
    Object.assign(schedule, updates);
  }

  /**
   * Get Tally configuration.
   */
  getTallyConfig(): TallyConfig {
    return this.config.tallyConfig;
  }

  /**
   * Update Tally configuration (e.g., if host/port changes).
   */
  updateTallyConfig(updates: Partial<TallyConfig>): void {
    Object.assign(this.config.tallyConfig, updates);
    // Reinitialize extractors with new config
    this.initializeExtractors();
  }
}
