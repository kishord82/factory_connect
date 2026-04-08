/**
 * Tests for LedgerExtractor: chart of accounts and ledger groups.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LedgerExtractor } from './ledger-extractor.js';
import type { TallyConfig } from './base-extractor.js';
import { FcError } from '@fc/shared';

describe('LedgerExtractor', () => {
  let extractor: LedgerExtractor;
  let config: TallyConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 9000,
      companyName: 'Ledger Test Co',
      timeout: 5000,
    };
    extractor = new LedgerExtractor(config);
  });

  describe('extract', () => {
    it('should extract ledgers and groups', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <LEDGERS>
                <LEDGERLINE>
                  <NAME>Cash</NAME>
                  <GROUP>Cash</GROUP>
                  <OPENINGBALANCE>50000</OPENINGBALANCE>
                  <CLOSINGBALANCE>45000</CLOSINGBALANCE>
                  <DEBITTOTAL>100000</DEBITTOTAL>
                  <CREDITTOTAL>105000</CREDITTOTAL>
                  <GSTAPPLICABLE>No</GSTAPPLICABLE>
                  <GSTTYPE></GSTTYPE>
                  <GSTIN></GSTIN>
                  <PAN></PAN>
                  <ADDRESS>Warehouse</ADDRESS>
                  <STATE>TG</STATE>
                </LEDGERLINE>
              </LEDGERS>
              <LEDGERGROUPS>
                <GROUPLINE>
                  <NAME>Cash</NAME>
                  <PARENT>Assets</PARENT>
                  <ISPRIMARY>No</ISPRIMARY>
                  <NATURE>Assets</NATURE>
                </GROUPLINE>
              </LEDGERGROUPS>
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
      expect(result.data.ledgers).toHaveLength(1);
      expect(result.data.groups).toHaveLength(1);
      expect(result.recordCount).toBe(2);
    });

    it('should parse ledger with GST details', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <LEDGERS>
                <LEDGERLINE>
                  <NAME>Supplier India</NAME>
                  <GROUP>Suppliers</GROUP>
                  <OPENINGBALANCE>100000</OPENINGBALANCE>
                  <CLOSINGBALANCE>150000</CLOSINGBALANCE>
                  <DEBITTOTAL>50000</DEBITTOTAL>
                  <CREDITTOTAL>100000</CREDITTOTAL>
                  <GSTAPPLICABLE>Yes</GSTAPPLICABLE>
                  <GSTTYPE>Regular</GSTTYPE>
                  <GSTIN>27AAPCY1234A1Z0</GSTIN>
                  <PAN>AAAAA0000A</PAN>
                  <ADDRESS>123 Business St</ADDRESS>
                  <STATE>TG</STATE>
                </LEDGERLINE>
              </LEDGERS>
              <LEDGERGROUPS/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();
      const ledger = result.data.ledgers[0];

      expect(ledger.name).toBe('Supplier India');
      expect(ledger.gstApplicable).toBe(true);
      expect(ledger.gstType).toBe('Regular');
      expect(ledger.gstin).toBe('27AAPCY1234A1Z0');
      expect(ledger.panNumber).toBe('AAAAA0000A');
    });

    it('should handle multiple ledgers with different groups', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <LEDGERS>
                <LEDGERLINE>
                  <NAME>Cash</NAME>
                  <GROUP>Cash</GROUP>
                  <OPENINGBALANCE>0</OPENINGBALANCE>
                  <CLOSINGBALANCE>0</CLOSINGBALANCE>
                  <DEBITTOTAL>0</DEBITTOTAL>
                  <CREDITTOTAL>0</CREDITTOTAL>
                  <GSTAPPLICABLE>No</GSTAPPLICABLE>
                  <GSTTYPE></GSTTYPE>
                  <GSTIN></GSTIN>
                  <PAN></PAN>
                  <ADDRESS></ADDRESS>
                  <STATE></STATE>
                </LEDGERLINE>
                <LEDGERLINE>
                  <NAME>Sales</NAME>
                  <GROUP>Revenue</GROUP>
                  <OPENINGBALANCE>0</OPENINGBALANCE>
                  <CLOSINGBALANCE>500000</CLOSINGBALANCE>
                  <DEBITTOTAL>0</DEBITTOTAL>
                  <CREDITTOTAL>500000</CREDITTOTAL>
                  <GSTAPPLICABLE>Yes</GSTAPPLICABLE>
                  <GSTTYPE>Regular</GSTTYPE>
                  <GSTIN></GSTIN>
                  <PAN></PAN>
                  <ADDRESS></ADDRESS>
                  <STATE></STATE>
                </LEDGERLINE>
              </LEDGERS>
              <LEDGERGROUPS>
                <GROUPLINE>
                  <NAME>Cash</NAME>
                  <PARENT>Assets</PARENT>
                  <ISPRIMARY>No</ISPRIMARY>
                  <NATURE>Assets</NATURE>
                </GROUPLINE>
                <GROUPLINE>
                  <NAME>Revenue</NAME>
                  <PARENT>Income</PARENT>
                  <ISPRIMARY>Yes</ISPRIMARY>
                  <NATURE>Income</NATURE>
                </GROUPLINE>
              </LEDGERGROUPS>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.data.ledgers).toHaveLength(2);
      expect(result.data.groups).toHaveLength(2);
      expect(result.data.ledgers[0].name).toBe('Cash');
      expect(result.data.ledgers[1].closingBalance).toBe(500000);
      expect(result.data.groups[1].isPrimary).toBe(true);
    });

    it('should handle empty ledgers section', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <LEDGERS/>
              <LEDGERGROUPS/>
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
      expect(result.data.ledgers).toHaveLength(0);
      expect(result.data.groups).toHaveLength(0);
    });
  });

  describe('getExtractionType', () => {
    it('should return correct extraction type', () => {
      expect(extractor.getExtractionType()).toBe('LEDGER_DATA');
    });
  });

  describe('error handling', () => {
    it('should throw on Tally connection failure', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });

    it('should throw on invalid XML', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<unclosed>xml',
      });
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });
  });
});
