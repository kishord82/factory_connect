/**
 * Tests for StockExtractor: stock items, groups, godowns, and movements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StockExtractor } from './stock-extractor.js';
import type { TallyConfig } from './base-extractor.js';
import { FcError } from '@fc/shared';

describe('StockExtractor', () => {
  let extractor: StockExtractor;
  let config: TallyConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 9000,
      companyName: 'Stock Test Co',
      timeout: 5000,
    };
    extractor = new StockExtractor(config);
  });

  describe('extract', () => {
    it('should extract stock items and movements', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <STOCKITEMS>
                <ITEMLINE>
                  <NAME>Product A</NAME>
                  <GROUP>Raw Materials</GROUP>
                  <GODOWN>Main Warehouse</GODOWN>
                  <UNIT>Kg</UNIT>
                  <OPENINGQUANTITY>1000</OPENINGQUANTITY>
                  <OPENINGVALUE>50000</OPENINGVALUE>
                  <CLOSINGQUANTITY>1200</CLOSINGQUANTITY>
                  <CLOSINGVALUE>60000</CLOSINGVALUE>
                  <HSNCODE>1001</HSNCODE>
                  <GSTRATE>5</GSTRATE>
                </ITEMLINE>
              </STOCKITEMS>
              <STOCKMOVEMENTS>
                <MOVEMENTLINE>
                  <DATE>01-01-2024</DATE>
                  <ITEMNAME>Product A</ITEMNAME>
                  <VOUCHERTYPE>Purchase</VOUCHERTYPE>
                  <QUANTITY>200</QUANTITY>
                  <RATE>50</RATE>
                  <VALUE>10000</VALUE>
                  <GODOWN>Main Warehouse</GODOWN>
                </MOVEMENTLINE>
              </STOCKMOVEMENTS>
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
      expect(result.data.items).toHaveLength(1);
      expect(result.data.movements).toHaveLength(1);
      expect(result.recordCount).toBe(2);
    });

    it('should parse stock item with complete details', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <STOCKITEMS>
                <ITEMLINE>
                  <NAME>Widget X</NAME>
                  <GROUP>Finished Goods</GROUP>
                  <GODOWN>Warehouse A</GODOWN>
                  <UNIT>Pieces</UNIT>
                  <OPENINGQUANTITY>500</OPENINGQUANTITY>
                  <OPENINGVALUE>250000</OPENINGVALUE>
                  <CLOSINGQUANTITY>750</CLOSINGQUANTITY>
                  <CLOSINGVALUE>375000</CLOSINGVALUE>
                  <HSNCODE>8517</HSNCODE>
                  <GSTRATE>18</GSTRATE>
                </ITEMLINE>
              </STOCKITEMS>
              <STOCKMOVEMENTS/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();
      const item = result.data.items[0];

      expect(item.name).toBe('Widget X');
      expect(item.group).toBe('Finished Goods');
      expect(item.godown).toBe('Warehouse A');
      expect(item.unit).toBe('Pieces');
      expect(item.openingQuantity).toBe(500);
      expect(item.closingQuantity).toBe(750);
      expect(item.hsnCode).toBe('8517');
      expect(item.gstRate).toBe(18);
    });

    it('should parse multiple stock movements', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <STOCKITEMS/>
              <STOCKMOVEMENTS>
                <MOVEMENTLINE>
                  <DATE>01-01-2024</DATE>
                  <ITEMNAME>Product A</ITEMNAME>
                  <VOUCHERTYPE>Purchase</VOUCHERTYPE>
                  <QUANTITY>100</QUANTITY>
                  <RATE>100</RATE>
                  <VALUE>10000</VALUE>
                  <GODOWN>Main</GODOWN>
                </MOVEMENTLINE>
                <MOVEMENTLINE>
                  <DATE>02-01-2024</DATE>
                  <ITEMNAME>Product A</ITEMNAME>
                  <VOUCHERTYPE>Sales</VOUCHERTYPE>
                  <QUANTITY>50</QUANTITY>
                  <RATE>120</RATE>
                  <VALUE>6000</VALUE>
                  <GODOWN>Main</GODOWN>
                </MOVEMENTLINE>
                <MOVEMENTLINE>
                  <DATE>03-01-2024</DATE>
                  <ITEMNAME>Product B</ITEMNAME>
                  <VOUCHERTYPE>Transfer</VOUCHERTYPE>
                  <QUANTITY>30</QUANTITY>
                  <RATE>50</RATE>
                  <VALUE>1500</VALUE>
                  <GODOWN>Branch</GODOWN>
                </MOVEMENTLINE>
              </STOCKMOVEMENTS>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.data.movements).toHaveLength(3);
      expect(result.data.movements[0].voucherType).toBe('Purchase');
      expect(result.data.movements[1].voucherType).toBe('Sales');
      expect(result.data.movements[2].quantity).toBe(30);
      expect(result.data.movements[2].godown).toBe('Branch');
    });

    it('should handle multiple stock items', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <STOCKITEMS>
                <ITEMLINE>
                  <NAME>Item 1</NAME>
                  <GROUP>Group A</GROUP>
                  <GODOWN>Warehouse 1</GODOWN>
                  <UNIT>Kg</UNIT>
                  <OPENINGQUANTITY>100</OPENINGQUANTITY>
                  <OPENINGVALUE>5000</OPENINGVALUE>
                  <CLOSINGQUANTITY>150</CLOSINGQUANTITY>
                  <CLOSINGVALUE>7500</CLOSINGVALUE>
                  <HSNCODE>1001</HSNCODE>
                  <GSTRATE>5</GSTRATE>
                </ITEMLINE>
                <ITEMLINE>
                  <NAME>Item 2</NAME>
                  <GROUP>Group B</GROUP>
                  <GODOWN>Warehouse 2</GODOWN>
                  <UNIT>Pieces</UNIT>
                  <OPENINGQUANTITY>200</OPENINGQUANTITY>
                  <OPENINGVALUE>20000</OPENINGVALUE>
                  <CLOSINGQUANTITY>250</CLOSINGQUANTITY>
                  <CLOSINGVALUE>25000</CLOSINGVALUE>
                  <HSNCODE>8517</HSNCODE>
                  <GSTRATE>18</GSTRATE>
                </ITEMLINE>
              </STOCKITEMS>
              <STOCKMOVEMENTS/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0].name).toBe('Item 1');
      expect(result.data.items[1].closingQuantity).toBe(250);
      expect(result.data.items[0].gstRate).toBe(5);
      expect(result.data.items[1].gstRate).toBe(18);
    });

    it('should handle empty sections gracefully', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <STOCKITEMS/>
              <STOCKMOVEMENTS/>
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
      expect(result.data.items).toHaveLength(0);
      expect(result.data.movements).toHaveLength(0);
    });
  });

  describe('getExtractionType', () => {
    it('should return correct extraction type', () => {
      expect(extractor.getExtractionType()).toBe('STOCK_DATA');
    });
  });

  describe('error handling', () => {
    it('should throw on Tally connection failure', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });

    it('should throw on XML parse error', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<broken>xml</unclosed>',
      });
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });
  });
});
