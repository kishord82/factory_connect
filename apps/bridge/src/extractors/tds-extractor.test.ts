/**
 * Tests for TdsExtractor: deductions, challans, and party summaries.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TdsExtractor } from './tds-extractor.js';
import type { TallyConfig } from './base-extractor.js';
import { FcError } from '@fc/shared';

describe('TdsExtractor', () => {
  let extractor: TdsExtractor;
  let config: TallyConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 9000,
      companyName: 'TDS Test Co',
      timeout: 5000,
    };
    extractor = new TdsExtractor(config);
  });

  describe('extract', () => {
    it('should extract deductions, challans, and party summary', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TDSDEDUCTIONS>
                <DEDUCTIONLINE>
                  <DATE>01-01-2024</DATE>
                  <PARTYNAME>Vendor Inc</PARTYNAME>
                  <PAN>AAAAA0000A</PAN>
                  <SECTION>194C</SECTION>
                  <GROSSAMOUNT>100000</GROSSAMOUNT>
                  <TDSRATE>2</TDSRATE>
                  <TDSAMOUNT>2000</TDSAMOUNT>
                  <CHALLANNUMBER>CHAL001</CHALLANNUMBER>
                  <CHALLANDATE>05-01-2024</CHALLANDATE>
                  <BSRCODE>0021110001</BSRCODE>
                </DEDUCTIONLINE>
              </TDSDEDUCTIONS>
              <TDSCHALLANS>
                <CHALLANLINE>
                  <CHALLANNUMBER>CHAL001</CHALLANNUMBER>
                  <DATE>05-01-2024</DATE>
                  <BSRCODE>0021110001</BSRCODE>
                  <AMOUNT>2000</AMOUNT>
                  <SECTION>194C</SECTION>
                </CHALLANLINE>
              </TDSCHALLANS>
              <TDSPARTYSUMMARY>
                <PARTYLINE>
                  <PARTYNAME>Vendor Inc</PARTYNAME>
                  <PAN>AAAAA0000A</PAN>
                  <TOTALDEDUCTED>2000</TOTALDEDUCTED>
                  <TOTALDEPOSITED>2000</TOTALDEPOSITED>
                </PARTYLINE>
              </TDSPARTYSUMMARY>
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
      expect(result.data.deductions).toHaveLength(1);
      expect(result.data.challans).toHaveLength(1);
      expect(result.data.partySummary).toHaveLength(1);
      expect(result.recordCount).toBe(3);
    });

    it('should calculate variance in party summary', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TDSDEDUCTIONS/>
              <TDSCHALLANS/>
              <TDSPARTYSUMMARY>
                <PARTYLINE>
                  <PARTYNAME>Party A</PARTYNAME>
                  <PAN>PAN001</PAN>
                  <TOTALDEDUCTED>5000</TOTALDEDUCTED>
                  <TOTALDEPOSITED>4500</TOTALDEPOSITED>
                </PARTYLINE>
              </TDSPARTYSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();
      const partySummary = result.data.partySummary[0];

      expect(partySummary.totalDeducted).toBe(5000);
      expect(partySummary.totalDeposited).toBe(4500);
      expect(partySummary.variance).toBe(500);
    });

    it('should handle multiple deductions and challans', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TDSDEDUCTIONS>
                <DEDUCTIONLINE>
                  <DATE>01-01-2024</DATE>
                  <PARTYNAME>Vendor 1</PARTYNAME>
                  <PAN>PAN001</PAN>
                  <SECTION>194C</SECTION>
                  <GROSSAMOUNT>50000</GROSSAMOUNT>
                  <TDSRATE>2</TDSRATE>
                  <TDSAMOUNT>1000</TDSAMOUNT>
                  <CHALLANNUMBER>CHAL001</CHALLANNUMBER>
                  <CHALLANDATE>05-01-2024</CHALLANDATE>
                  <BSRCODE>0021110001</BSRCODE>
                </DEDUCTIONLINE>
                <DEDUCTIONLINE>
                  <DATE>02-01-2024</DATE>
                  <PARTYNAME>Vendor 2</PARTYNAME>
                  <PAN>PAN002</PAN>
                  <SECTION>194A</SECTION>
                  <GROSSAMOUNT>75000</GROSSAMOUNT>
                  <TDSRATE>10</TDSRATE>
                  <TDSAMOUNT>7500</TDSAMOUNT>
                  <CHALLANNUMBER>CHAL002</CHALLANNUMBER>
                  <CHALLANDATE>06-01-2024</CHALLANDATE>
                  <BSRCODE>0021110002</BSRCODE>
                </DEDUCTIONLINE>
              </TDSDEDUCTIONS>
              <TDSCHALLANS/>
              <TDSPARTYSUMMARY/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.data.deductions).toHaveLength(2);
      expect(result.data.deductions[0].section).toBe('194C');
      expect(result.data.deductions[1].section).toBe('194A');
      expect(result.data.deductions[1].tdsAmount).toBe(7500);
    });

    it('should handle empty sections gracefully', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <TDSDEDUCTIONS/>
              <TDSCHALLANS/>
              <TDSPARTYSUMMARY/>
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
      expect(result.data.deductions).toHaveLength(0);
      expect(result.data.challans).toHaveLength(0);
      expect(result.data.partySummary).toHaveLength(0);
    });
  });

  describe('getExtractionType', () => {
    it('should return correct extraction type', () => {
      expect(extractor.getExtractionType()).toBe('TDS_DATA');
    });
  });

  describe('error handling', () => {
    it('should throw on Tally connection failure', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });

    it('should throw on malformed XML response', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => 'broken<xml>data',
      });
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });
  });
});
