/**
 * Tests for ExtractionScheduler: job scheduling, execution, and status tracking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExtractionScheduler,
  DEFAULT_SCHEDULES,
  type ClientScheduleConfig,
  type TallyConfig,
} from './scheduler.js';
import { FcError } from '@fc/shared';

describe('ExtractionScheduler', () => {
  let scheduler: ExtractionScheduler;
  let config: ClientScheduleConfig;
  let tallyConfig: TallyConfig;

  beforeEach(() => {
    tallyConfig = {
      host: 'localhost',
      port: 9000,
      companyName: 'Test Company',
      timeout: 5000,
    };

    config = {
      tallyConfig,
      schedules: DEFAULT_SCHEDULES,
      timezone: 'Asia/Kolkata',
    };

    scheduler = new ExtractionScheduler(config);
  });

  describe('initialization', () => {
    it('should initialize with default schedules', () => {
      expect(scheduler.getTallyConfig().host).toBe('localhost');
      expect(scheduler.getSchedule('GST')).toBeDefined();
      expect(scheduler.getSchedule('TDS')).toBeDefined();
      expect(scheduler.getSchedule('STOCK')).toBeDefined();
    });

    it('should have GST schedule enabled by default', () => {
      const gstSchedule = scheduler.getSchedule('GST');
      expect(gstSchedule?.enabled).toBe(true);
    });

    it('should have correct default cron expressions', () => {
      const gstSchedule = scheduler.getSchedule('GST');
      expect(gstSchedule?.cronExpression).toBe('0 2 * * *'); // Daily 2 AM
    });
  });

  describe('executeExtraction', () => {
    it('should execute GST extraction', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER/>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>0</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await scheduler.executeExtraction('GST');

      expect(result.success).toBe(true);
      expect(result.extractedAt).toBeInstanceOf(Date);
    });

    it('should return job status after execution', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER/>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>0</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await scheduler.executeExtraction('GST');

      // Check that jobs are tracked
      const allJobs = scheduler.getAllJobs();
      expect(allJobs.length).toBeGreaterThan(0);
    });

    it('should throw on Tally not reachable', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      await expect(scheduler.executeExtraction('GST')).rejects.toBeInstanceOf(FcError);
    });

    it('should throw on unknown extractor type', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      global.fetch = mockFetch;

      await expect(scheduler.executeExtraction('UNKNOWN' as any)).rejects.toBeInstanceOf(FcError);
    });

    it('should track job status across all extraction types', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER/>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>0</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await scheduler.executeExtraction('GST');

      const jobs = scheduler.getAllJobs();
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].type).toBe('GST');
      expect(jobs[0].status).toBe('success');
    });
  });

  describe('executeAllExtractions', () => {
    it('should execute all enabled extractions', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER/>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>0</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const results = await scheduler.executeAllExtractions();

      expect(results.size).toBeGreaterThan(0);
      expect(results.has('GST')).toBe(true);
    });

    it('should skip disabled extractions', async () => {
      // Disable all extractions except GST
      config.schedules.forEach((schedule) => {
        schedule.enabled = schedule.type === 'GST';
      });

      scheduler = new ExtractionScheduler(config);

      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER/>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>0</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const results = await scheduler.executeAllExtractions();

      expect(results.size).toBe(1);
      expect(results.has('GST')).toBe(true);
      expect(results.has('TDS')).toBe(false);
    });

    it('should continue on individual extraction failure', async () => {
      const gstResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER/>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>0</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => gstResponse,
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          text: async () => gstResponse,
        });

      global.fetch = mockFetch;

      const results = await scheduler.executeAllExtractions();

      // Should have some results despite one failure
      expect(results.size).toBeGreaterThan(0);
    });
  });

  describe('schedule management', () => {
    it('should get schedule for extraction type', () => {
      const gstSchedule = scheduler.getSchedule('GST');

      expect(gstSchedule).toBeDefined();
      expect(gstSchedule?.type).toBe('GST');
      expect(gstSchedule?.enabled).toBe(true);
    });

    it('should update schedule configuration', () => {
      scheduler.updateSchedule('GST', { enabled: false, maxRetries: 5 });

      const updated = scheduler.getSchedule('GST');
      expect(updated?.enabled).toBe(false);
      expect(updated?.maxRetries).toBe(5);
    });

    it('should throw on updating non-existent schedule', () => {
      expect(() => {
        scheduler.updateSchedule('INVALID' as any, { enabled: false });
      }).toThrow('FC_ERR_BRIDGE_SCHEDULE_NOT_FOUND');
    });
  });

  describe('tally config management', () => {
    it('should get current Tally config', () => {
      const config = scheduler.getTallyConfig();

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(9000);
      expect(config.companyName).toBe('Test Company');
    });

    it('should update Tally config', () => {
      scheduler.updateTallyConfig({
        host: '192.168.1.1',
        port: 8000,
      });

      const updated = scheduler.getTallyConfig();
      expect(updated.host).toBe('192.168.1.1');
      expect(updated.port).toBe(8000);
      expect(updated.companyName).toBe('Test Company'); // Should remain unchanged
    });
  });

  describe('job tracking', () => {
    it('should track job by ID', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER/>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>0</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await scheduler.executeExtraction('GST');

      const jobs = scheduler.getAllJobs();
      expect(jobs.length).toBeGreaterThan(0);

      const jobId = jobs[0].id;
      const status = scheduler.getJobStatus(jobId);

      expect(status?.id).toBe(jobId);
      expect(status?.status).toBe('success');
    });

    it('should get all tracked jobs', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER/>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>0</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const allJobs = scheduler.getAllJobs();
      const initialCount = allJobs.length;

      await scheduler.executeExtraction('GST');

      const updatedJobs = scheduler.getAllJobs();
      expect(updatedJobs.length).toBe(initialCount + 1);
    });
  });

  describe('schedule defaults', () => {
    it('should have 7 default schedules', () => {
      expect(DEFAULT_SCHEDULES).toHaveLength(7);
    });

    it('should have GST daily at 2 AM', () => {
      const gstSchedule = DEFAULT_SCHEDULES.find((s) => s.type === 'GST');
      expect(gstSchedule?.cronExpression).toBe('0 2 * * *');
    });

    it('should have TDS weekly on Sunday', () => {
      const tdsSchedule = DEFAULT_SCHEDULES.find((s) => s.type === 'TDS');
      expect(tdsSchedule?.cronExpression).toBe('0 3 * * 0');
    });

    it('should have PAYROLL monthly on 1st', () => {
      const payrollSchedule = DEFAULT_SCHEDULES.find((s) => s.type === 'PAYROLL');
      expect(payrollSchedule?.cronExpression).toBe('0 4 1 * *');
    });
  });
});
