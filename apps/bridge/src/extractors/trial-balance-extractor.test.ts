/**
 * Tests for TrialBalanceExtractor: trial balance for any date range.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrialBalanceExtractor } from './trial-balance-extractor.js';
import type { TallyConfig } from './base-extractor.js';
import { FcError } from '@fc/shared';

describe('TrialBalanceExtractor', () => {
  let extractor: TrialBalanceExtractor;
  let config: TallyConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 9000,
      companyName: 'TB Test Co',
      timeout: 5000,
    };
  });

  describe('extract', () => {
    it('should extract trial balance entries with totals', async () => {
      extractor = new TrialBalanceExtractor(config, '2024-01-31');

      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TRIALBALANCE>
                <TBLINE>
                  <LEDGERNAME>Cash</LEDGERNAME>
                  <GROUP>Cash</GROUP>
                  <OPENINGDEBIT>50000</OPENINGDEBIT>
                  <OPENINGCREDIT>0</OPENINGCREDIT>
                  <TRANSACTIONDEBIT>100000</TRANSACTIONDEBIT>
                  <TRANSACTIONCREDIT>95000</TRANSACTIONCREDIT>
                  <CLOSINGDEBIT>55000</CLOSINGDEBIT>
                  <CLOSINGCREDIT>0</CLOSINGCREDIT>
                </TBLINE>
                <TBLINE>
                  <LEDGERNAME>Sales</LEDGERNAME>
                  <GROUP>Revenue</GROUP>
                  <OPENINGDEBIT>0</OPENINGDEBIT>
                  <OPENINGCREDIT>0</OPENINGCREDIT>
                  <TRANSACTIONDEBIT>0</TRANSACTIONDEBIT>
                  <TRANSACTIONCREDIT>500000</TRANSACTIONCREDIT>
                  <CLOSINGDEBIT>0</CLOSINGDEBIT>
                  <CLOSINGCREDIT>500000</CLOSINGCREDIT>
                </TBLINE>
                <TOTALS>
                  <OPENINGDEBIT>50000</OPENINGDEBIT>
                  <OPENINGCREDIT>0</OPENINGCREDIT>
                  <TRANSACTIONDEBIT>100000</TRANSACTIONDEBIT>
                  <TRANSACTIONCREDIT>595000</TRANSACTIONCREDIT>
                  <CLOSINGDEBIT>55000</CLOSINGDEBIT>
                  <CLOSINGCREDIT>500000</CLOSINGCREDIT>
                </TOTALS>
              </TRIALBALANCE>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.success).toBe(true);
      expect(result.data.entries).toHaveLength(2);
      expect(result.data.asOfDate).toBe('2024-01-31');
      expect(result.data.totals.closingDebit).toBe(55000);
      expect(result.data.totals.closingCredit).toBe(500000);
    });

    it('should accumulate totals from entries when TOTALS section missing', async () => {
      extractor = new TrialBalanceExtractor(config, '2024-02-29');

      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TRIALBALANCE>
                <TBLINE>
                  <LEDGERNAME>Ledger 1</LEDGERNAME>
                  <GROUP>Group 1</GROUP>
                  <OPENINGDEBIT>10000</OPENINGDEBIT>
                  <OPENINGCREDIT>0</OPENINGCREDIT>
                  <TRANSACTIONDEBIT>5000</TRANSACTIONDEBIT>
                  <TRANSACTIONCREDIT>3000</TRANSACTIONCREDIT>
                  <CLOSINGDEBIT>12000</CLOSINGDEBIT>
                  <CLOSINGCREDIT>0</CLOSINGCREDIT>
                </TBLINE>
                <TBLINE>
                  <LEDGERNAME>Ledger 2</LEDGERNAME>
                  <GROUP>Group 2</GROUP>
                  <OPENINGDEBIT>0</OPENINGDEBIT>
                  <OPENINGCREDIT>20000</OPENINGCREDIT>
                  <TRANSACTIONDEBIT>8000</TRANSACTIONDEBIT>
                  <TRANSACTIONCREDIT>2000</TRANSACTIONCREDIT>
                  <CLOSINGDEBIT>0</CLOSINGDEBIT>
                  <CLOSINGCREDIT>20000</CLOSINGCREDIT>
                </TBLINE>
              </TRIALBALANCE>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.data.entries).toHaveLength(2);
      expect(result.data.totals.openingDebit).toBe(10000);
      expect(result.data.totals.openingCredit).toBe(20000);
      expect(result.data.totals.closingDebit).toBe(12000);
      expect(result.data.totals.closingCredit).toBe(20000);
    });

    it('should override calculated totals with explicit TOTALS section', async () => {
      extractor = new TrialBalanceExtractor(config, '2024-03-31');

      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TRIALBALANCE>
                <TBLINE>
                  <LEDGERNAME>Ledger 1</LEDGERNAME>
                  <GROUP>Group 1</GROUP>
                  <OPENINGDEBIT>1000</OPENINGDEBIT>
                  <OPENINGCREDIT>0</OPENINGCREDIT>
                  <TRANSACTIONDEBIT>500</TRANSACTIONDEBIT>
                  <TRANSACTIONCREDIT>200</TRANSACTIONCREDIT>
                  <CLOSINGDEBIT>1300</CLOSINGDEBIT>
                  <CLOSINGCREDIT>0</CLOSINGCREDIT>
                </TBLINE>
                <TOTALS>
                  <OPENINGDEBIT>100000</OPENINGDEBIT>
                  <OPENINGCREDIT>100000</OPENINGCREDIT>
                  <TRANSACTIONDEBIT>500000</TRANSACTIONDEBIT>
                  <TRANSACTIONCREDIT>500000</TRANSACTIONCREDIT>
                  <CLOSINGDEBIT>550000</CLOSINGDEBIT>
                  <CLOSINGCREDIT>550000</CLOSINGCREDIT>
                </TOTALS>
              </TRIALBALANCE>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      // Explicit totals should be used
      expect(result.data.totals.openingDebit).toBe(100000);
      expect(result.data.totals.closingDebit).toBe(550000);
    });

    it('should handle empty trial balance', async () => {
      extractor = new TrialBalanceExtractor(config, '2024-04-30');

      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TRIALBALANCE/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.success).toBe(true);
      expect(result.data.entries).toHaveLength(0);
      expect(result.data.totals.closingDebit).toBe(0);
      expect(result.data.totals.closingCredit).toBe(0);
    });

    it('should use default date (today) if not provided', async () => {
      extractor = new TrialBalanceExtractor(config);

      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TRIALBALANCE/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      // asOfDate should be today (approximately)
      expect(result.data.asOfDate).toBeDefined();
      expect(result.data.asOfDate).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('getExtractionType', () => {
    it('should return correct extraction type', () => {
      extractor = new TrialBalanceExtractor(config);
      expect(extractor.getExtractionType()).toBe('TRIAL_BALANCE_DATA');
    });
  });

  describe('date formatting', () => {
    it('should format date correctly for Tally TDL request', async () => {
      extractor = new TrialBalanceExtractor(config, '2024-03-15');

      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TRIALBALANCE/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await extractor.extract();

      const callArgs = mockFetch.mock.calls[0];
      const body = callArgs[1]?.body as string;

      // Should contain date in DD-MMM-YYYY format
      expect(body).toContain('15-MAR-2024');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      extractor = new TrialBalanceExtractor(config, '2024-01-31');
    });

    it('should throw on Tally connection failure', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });

    it('should throw on XML parse error', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<unclosed>xml',
      });
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });
  });
});
