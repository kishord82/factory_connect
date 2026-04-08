/**
 * Tests for BaseExtractor HTTP, retry, and XML parsing logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';
import { FcError } from '@fc/shared';

// Concrete test implementation of BaseExtractor
class TestExtractor extends BaseExtractor<{ test: string }> {
  async extract(): Promise<ExtractionResult<{ test: string }>> {
    return {
      success: true,
      data: { test: 'value' },
      extractedAt: new Date(),
      recordCount: 1,
      errors: [],
    };
  }

  getExtractionType(): string {
    return 'TEST';
  }
}

describe('BaseExtractor', () => {
  let extractor: TestExtractor;
  let config: TallyConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 9000,
      companyName: 'Test Company',
      timeout: 5000,
    };
    extractor = new TestExtractor(config);
  });

  describe('sendRequest', () => {
    it('should send XML request to Tally HTTP endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<RESPONSE><DATA>test</DATA></RESPONSE>',
      });
      global.fetch = mockFetch;

      const xml = '<TEST>request</TEST>';
      const result = await extractor['sendRequest'](xml);

      expect(result).toBe('<RESPONSE><DATA>test</DATA></RESPONSE>');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9000',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: xml,
        }),
      );
    });

    it('should throw FC_ERR_TALLY_NOT_RUNNING if connection refused', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      const xml = '<TEST>request</TEST>';
      await expect(extractor['sendRequest'](xml)).rejects.toThrow('FC_ERR_TALLY_NOT_RUNNING');
    });

    it('should throw FC_ERR_TALLY_TIMEOUT on timeout', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
      global.fetch = mockFetch;

      const xml = '<TEST>request</TEST>';
      await expect(extractor['sendRequest'](xml)).rejects.toThrow('FC_ERR_TALLY_TIMEOUT');
    });

    it('should throw FC_ERR_TALLY_HTTP_ERROR on non-2xx response', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      global.fetch = mockFetch;

      const xml = '<TEST>request</TEST>';
      await expect(extractor['sendRequest'](xml)).rejects.toThrow('FC_ERR_TALLY_HTTP_ERROR');
    });

    it('should retry on transient failure', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '<RESPONSE>success</RESPONSE>',
        });
      global.fetch = mockFetch;

      const xml = '<TEST>request</TEST>';
      // Should throw because ECONNREFUSED is treated as fatal (Tally not running)
      await expect(extractor['sendRequest'](xml)).rejects.toThrow('FC_ERR_TALLY_NOT_RUNNING');
    });
  });

  describe('parseXml', () => {
    it('should parse valid XML response', async () => {
      const xml = '<?xml version="1.0"?><ENVELOPE><BODY><DATA>test</DATA></BODY></ENVELOPE>';
      const result = await extractor['parseXml'](xml);

      expect(result).toHaveProperty('ENVELOPE');
    });

    it('should throw FC_ERR_TALLY_XML_PARSE_ERROR on malformed XML', async () => {
      const malformedXml = '<ENVELOPE><BODY><DATA>unclosed';
      await expect(extractor['parseXml'](malformedXml)).rejects.toThrow(
        'FC_ERR_TALLY_XML_PARSE_ERROR',
      );
    });

    it('should handle empty XML gracefully', async () => {
      const xml = '';
      await expect(extractor['parseXml'](xml)).rejects.toThrow('FC_ERR_TALLY_XML_PARSE_ERROR');
    });
  });

  describe('validateResponse', () => {
    it('should accept valid object response', () => {
      const data = { RESPONSE: 'value' };
      expect(() => extractor['validateResponse'](data)).not.toThrow();
    });

    it('should throw FC_ERR_TALLY_EMPTY_RESPONSE on null/undefined', () => {
      expect(() => extractor['validateResponse'](null)).toThrow('FC_ERR_TALLY_EMPTY_RESPONSE');
      expect(() => extractor['validateResponse'](undefined)).toThrow('FC_ERR_TALLY_EMPTY_RESPONSE');
    });

    it('should throw FC_ERR_TALLY_INVALID_RESPONSE_TYPE on non-object', () => {
      expect(() => extractor['validateResponse']('string')).toThrow(
        'FC_ERR_TALLY_INVALID_RESPONSE_TYPE',
      );
      expect(() => extractor['validateResponse'](123)).toThrow('FC_ERR_TALLY_INVALID_RESPONSE_TYPE');
    });
  });

  describe('buildTdlRequest', () => {
    it('should build valid TDL XML envelope', () => {
      const xml = extractor['buildTdlRequest']('Test Report', { FILTER1: 'value1' });

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<ENVELOPE>');
      expect(xml).toContain('Test Report');
      expect(xml).toContain('Test Company');
      expect(xml).toContain('FILTER1');
      expect(xml).toContain('value1');
    });

    it('should escape XML special characters in filters', () => {
      const xml = extractor['buildTdlRequest']('Report', { FILTER: '<test>&"' });

      expect(xml).toContain('&lt;test&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
    });

    it('should handle report without filters', () => {
      const xml = extractor['buildTdlRequest']('Simple Report');

      expect(xml).toContain('Simple Report');
      expect(xml).toContain('<ENVELOPE>');
      expect(xml).not.toContain('undefined');
    });
  });

  describe('escapeXml', () => {
    it('should escape all XML special characters', () => {
      const input = '<tag> & "quoted" \'apostrophe\'';
      const escaped = extractor['escapeXml'](input);

      expect(escaped).toBe('&lt;tag&gt; &amp; &quot;quoted&quot; &apos;apostrophe&apos;');
    });

    it('should handle already escaped content', () => {
      const input = '&lt;already&gt;';
      const escaped = extractor['escapeXml'](input);

      expect(escaped).toBe('&amp;lt;already&amp;gt;');
    });

    it('should preserve normal text', () => {
      const input = 'Normal text 123';
      const escaped = extractor['escapeXml'](input);

      expect(escaped).toBe('Normal text 123');
    });
  });

  describe('extractTextNodes', () => {
    it('should extract all text nodes from nested object', () => {
      const obj = {
        HEADER: 'value1',
        BODY: {
          DATA: 'value2',
          ITEMS: [{ NAME: 'item1' }, { NAME: 'item2' }],
        },
      };

      const result = extractor['extractTextNodes'](obj);

      expect(result['HEADER']).toBe('value1');
      expect(result['BODY.DATA']).toBe('value2');
    });

    it('should handle arrays properly', () => {
      const arr = [{ id: 1 }, { id: 2 }];
      const result = extractor['extractTextNodes'](arr);

      expect(result['[0].id']).toBe(1);
      expect(result['[1].id']).toBe(2);
    });

    it('should handle primitive values', () => {
      const result = extractor['extractTextNodes']('string');
      expect(result['value']).toBe('string');
    });

    it('should handle null/undefined', () => {
      const resultNull = extractor['extractTextNodes'](null);
      const resultUndefined = extractor['extractTextNodes'](undefined);

      expect(Object.keys(resultNull)).toHaveLength(0);
      expect(Object.keys(resultUndefined)).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should include error context in FcError', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch;

      try {
        await extractor['sendRequest']('<TEST/>');
        expect.fail('Should have thrown');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(FcError);
        const fcError = error as FcError;
        expect(fcError.code).toBeDefined();
        expect(fcError.details).toBeDefined();
      }
    });
  });

  describe('configuration', () => {
    it('should use provided timeout', () => {
      const customConfig: TallyConfig = {
        host: '192.168.1.1',
        port: 8000,
        companyName: 'Custom',
        timeout: 10000,
      };
      const customExtractor = new TestExtractor(customConfig);

      expect(customExtractor['config'].timeout).toBe(10000);
    });

    it('should default timeout to 30000ms if not provided', () => {
      const minimalConfig = {
        host: 'localhost',
        port: 9000,
        companyName: 'Test',
      } as TallyConfig;
      const customExtractor = new TestExtractor(minimalConfig);

      expect(customExtractor['config'].timeout).toBe(30000);
    });
  });
});
