/**
 * Tests for GstExtractor: sales register, purchase register, HSN summary, B2B summary.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GstExtractor } from './gst-extractor.js';
import type { TallyConfig } from './base-extractor.js';
import { FcError } from '@fc/shared';

describe('GstExtractor', () => {
  let extractor: GstExtractor;
  let config: TallyConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 9000,
      companyName: 'GST Test Co',
      timeout: 5000,
    };
    extractor = new GstExtractor(config);
  });

  describe('extract', () => {
    it('should return GstExtractionData with all registers and summary', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER>
                <SALESLINE>
                  <VOUCHERDATE>01-01-2024</VOUCHERDATE>
                  <VOUCHERNUMBER>SLV001</VOUCHERNUMBER>
                  <PARTYNAME>Customer Inc</PARTYNAME>
                  <PARTYGSTIN>27AAPCY1234A1Z0</PARTYGSTIN>
                  <INVOICENUMBER>INV001</INVOICENUMBER>
                  <HSNCODE>1001</HSNCODE>
                  <TAXABLEAMOUNT>10000</TAXABLEAMOUNT>
                  <CGSTRATE>9</CGSTRATE>
                  <CGSTAMOUNT>900</CGSTAMOUNT>
                  <SGSTRATE>9</SGSTRATE>
                  <SGSTAMOUNT>900</SGSTAMOUNT>
                  <IGSTRATE>0</IGSTRATE>
                  <IGSTAMOUNT>0</IGSTAMOUNT>
                  <CESSAMOUNT>0</CESSAMOUNT>
                  <TOTALAMOUNT>11800</TOTALAMOUNT>
                  <PLACEOFSUPPLY>AP</PLACEOFSUPPLY>
                  <REVERSECHARGE>No</REVERSECHARGE>
                </SALESLINE>
              </GSTREGISTER>
              <HSNSUMMARY>
                <HSNLINE>
                  <HSNCODE>1001</HSNCODE>
                  <DESCRIPTION>Product A</DESCRIPTION>
                  <TOTALQUANTITY>100</TOTALQUANTITY>
                  <TOTALVALUE>11800</TOTALVALUE>
                  <TAXABLEVALUE>10000</TAXABLEVALUE>
                </HSNLINE>
              </HSNSUMMARY>
              <B2BSUMMARY>
                <B2BCOUNT>10</B2BCOUNT>
                <B2CCOUNT>5</B2CCOUNT>
                <CDNRCOUNT>2</CDNRCOUNT>
                <EXPORTCOUNT>1</EXPORTCOUNT>
              </B2BSUMMARY>
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
      expect(result.data.salesRegister).toHaveLength(1);
      expect(result.data.hsnSummary).toHaveLength(1);
      expect(result.data.b2bSummary.b2bCount).toBe(10);
      expect(result.recordCount).toBeGreaterThan(0);
    });

    it('should handle extraction with multiple sales lines', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER>
                <SALESLINE>
                  <VOUCHERDATE>01-01-2024</VOUCHERDATE>
                  <VOUCHERNUMBER>SLV001</VOUCHERNUMBER>
                  <PARTYNAME>Party A</PARTYNAME>
                  <PARTYGSTIN>27AAPCY1234A1Z0</PARTYGSTIN>
                  <INVOICENUMBER>INV001</INVOICENUMBER>
                  <HSNCODE>1001</HSNCODE>
                  <TAXABLEAMOUNT>5000</TAXABLEAMOUNT>
                  <CGSTRATE>9</CGSTRATE>
                  <CGSTAMOUNT>450</CGSTAMOUNT>
                  <SGSTRATE>9</SGSTRATE>
                  <SGSTAMOUNT>450</SGSTAMOUNT>
                  <IGSTRATE>0</IGSTRATE>
                  <IGSTAMOUNT>0</IGSTAMOUNT>
                  <CESSAMOUNT>0</CESSAMOUNT>
                  <TOTALAMOUNT>5900</TOTALAMOUNT>
                  <PLACEOFSUPPLY>AP</PLACEOFSUPPLY>
                  <REVERSECHARGE>No</REVERSECHARGE>
                </SALESLINE>
                <SALESLINE>
                  <VOUCHERDATE>02-01-2024</VOUCHERDATE>
                  <VOUCHERNUMBER>SLV002</VOUCHERNUMBER>
                  <PARTYNAME>Party B</PARTYNAME>
                  <PARTYGSTIN>27BBPCY1234B1Z0</PARTYGSTIN>
                  <INVOICENUMBER>INV002</INVOICENUMBER>
                  <HSNCODE>1002</HSNCODE>
                  <TAXABLEAMOUNT>5000</TAXABLEAMOUNT>
                  <CGSTRATE>18</CGSTRATE>
                  <CGSTAMOUNT>900</CGSTAMOUNT>
                  <SGSTRATE>18</SGSTRATE>
                  <SGSTAMOUNT>900</SGSTAMOUNT>
                  <IGSTRATE>0</IGSTRATE>
                  <IGSTAMOUNT>0</IGSTAMOUNT>
                  <CESSAMOUNT>0</CESSAMOUNT>
                  <TOTALAMOUNT>6800</TOTALAMOUNT>
                  <PLACEOFSUPPLY>TG</PLACEOFSUPPLY>
                  <REVERSECHARGE>Yes</REVERSECHARGE>
                </SALESLINE>
              </GSTREGISTER>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>2</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
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
      expect(result.data.salesRegister).toHaveLength(2);
      expect(result.data.salesRegister[0].partyName).toBe('Party A');
      expect(result.data.salesRegister[1].reverseCharge).toBe(true);
    });

    it('should handle empty response gracefully', async () => {
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

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.data.salesRegister).toHaveLength(0);
      expect(result.data.hsnSummary).toHaveLength(0);
    });

    it('should report errors from individual register extractions', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'malformed xml',
        });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getExtractionType', () => {
    it('should return correct extraction type', () => {
      expect(extractor.getExtractionType()).toBe('GST_DATA');
    });
  });

  describe('parsing', () => {
    it('should correctly parse sales line with all fields', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER>
                <SALESLINE>
                  <VOUCHERDATE>15-03-2024</VOUCHERDATE>
                  <VOUCHERNUMBER>IV-2024-001</VOUCHERNUMBER>
                  <PARTYNAME>ABC Traders</PARTYNAME>
                  <PARTYGSTIN>27AAPCY1234A1Z0</PARTYGSTIN>
                  <INVOICENUMBER>INV-2024-001</INVOICENUMBER>
                  <HSNCODE>8517</HSNCODE>
                  <TAXABLEAMOUNT>50000</TAXABLEAMOUNT>
                  <CGSTRATE>9</CGSTRATE>
                  <CGSTAMOUNT>4500</CGSTAMOUNT>
                  <SGSTRATE>9</SGSTRATE>
                  <SGSTAMOUNT>4500</SGSTAMOUNT>
                  <IGSTRATE>0</IGSTRATE>
                  <IGSTAMOUNT>0</IGSTAMOUNT>
                  <CESSAMOUNT>100</CESSAMOUNT>
                  <TOTALAMOUNT>59100</TOTALAMOUNT>
                  <PLACEOFSUPPLY>KA</PLACEOFSUPPLY>
                  <REVERSECHARGE>No</REVERSECHARGE>
                </SALESLINE>
              </GSTREGISTER>
              <HSNSUMMARY/>
              <B2BSUMMARY>
                <B2BCOUNT>1</B2BCOUNT>
                <B2CCOUNT>0</B2CCOUNT>
                <CDNRCOUNT>0</CDNRCOUNT>
                <EXPORTCOUNT>0</EXPORTCOUNT>
              </B2BSUMMARY>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();
      const line = result.data.salesRegister[0];

      expect(line.voucherDate).toBe('15-03-2024');
      expect(line.voucherNumber).toBe('IV-2024-001');
      expect(line.partyName).toBe('ABC Traders');
      expect(line.taxableAmount).toBe(50000);
      expect(line.cgstAmount).toBe(4500);
      expect(line.cessAmount).toBe(100);
      expect(line.totalAmount).toBe(59100);
    });

    it('should handle missing optional fields', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <GSTREGISTER>
                <SALESLINE>
                  <VOUCHERDATE>01-01-2024</VOUCHERDATE>
                  <VOUCHERNUMBER>SLV001</VOUCHERNUMBER>
                  <PARTYNAME>Party</PARTYNAME>
                </SALESLINE>
              </GSTREGISTER>
              <HSNSUMMARY/>
              <B2BSUMMARY/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();
      const line = result.data.salesRegister[0];

      expect(line.partyGstin).toBe('');
      expect(line.cgstAmount).toBe(0);
      expect(line.reverseCharge).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw on Tally connection failure', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });

    it('should throw on invalid XML response', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<invalid>xml</broken>',
      });
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });
  });
});
