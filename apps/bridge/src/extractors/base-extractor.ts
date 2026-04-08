/**
 * Base abstract class for all Tally extractors.
 * Handles HTTP communication, XML parsing, retry logic, and error handling.
 */

import { FcError } from '@fc/shared';
import { XMLParser } from 'fast-xml-parser';

export interface TallyConfig {
  host: string; // default: localhost
  port: number; // default: 9000
  companyName: string;
  timeout: number; // default: 30000ms
}

export interface ExtractionResult<T> {
  success: boolean;
  data: T;
  extractedAt: Date;
  recordCount: number;
  errors: string[];
}

export interface TallyResponse {
  RESPONSE?: Record<string, unknown>;
  ENVELOPE?: {
    BODY?: {
      DATA?: Record<string, unknown>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Abstract base class for Tally extractors.
 * Subclasses implement extract() for specific data types.
 */
export abstract class BaseExtractor<T> {
  protected config: TallyConfig;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  constructor(config: TallyConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? 30000,
    };
  }

  /**
   * Send TDL XML request to Tally via HTTP POST.
   * Implements exponential backoff retry on transient failures.
   */
  protected async sendRequest(xmlBody: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`http://${this.config.host}:${this.config.port}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
          },
          body: xmlBody,
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new FcError(
            'FC_ERR_TALLY_HTTP_ERROR',
            `Tally HTTP error: ${response.status} ${response.statusText}`,
            { status: response.status, attempt },
          );
        }

        const text = await response.text();
        return text;
      } catch (error) {
        lastError = error as Error;

        // Connection refused: Tally not running
        if (
          error instanceof Error &&
          (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch'))
        ) {
          throw new FcError(
            'FC_ERR_TALLY_NOT_RUNNING',
            `Tally is not running on ${this.config.host}:${this.config.port}`,
            { host: this.config.host, port: this.config.port },
          );
        }

        // Timeout
        if (error instanceof Error && error.name === 'AbortError') {
          throw new FcError(
            'FC_ERR_TALLY_TIMEOUT',
            `Tally request timeout after ${this.config.timeout}ms`,
            { timeout: this.config.timeout, attempt },
          );
        }

        // Retryable error, wait before next attempt
        if (attempt < this.maxRetries - 1) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new FcError(
      'FC_ERR_TALLY_REQUEST_FAILED',
      `Tally request failed after ${this.maxRetries} attempts: ${lastError?.message || 'unknown error'}`,
      { attempts: this.maxRetries, lastError: lastError?.message },
    );
  }

  /**
   * Parse XML response from Tally into a typed object.
   * Validates structure and throws on malformed XML.
   */
  protected async parseXml(xml: string): Promise<TallyResponse> {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: true,
        parseAttributeValue: true,
      });

      const parsed = parser.parse(xml);

      return parsed as TallyResponse;
    } catch (error) {
      throw new FcError(
        'FC_ERR_TALLY_XML_PARSE_ERROR',
        `Failed to parse Tally XML response: ${error instanceof Error ? error.message : 'unknown error'}`,
        { rawLength: xml.length },
      );
    }
  }

  /**
   * Validate that response contains expected data.
   * Throws if data structure is invalid.
   */
  protected validateResponse(data: unknown): void {
    if (!data) {
      throw new FcError(
        'FC_ERR_TALLY_EMPTY_RESPONSE',
        'Tally returned empty response',
        { received: typeof data },
      );
    }

    if (typeof data !== 'object') {
      throw new FcError(
        'FC_ERR_TALLY_INVALID_RESPONSE_TYPE',
        `Expected object response, got ${typeof data}`,
        { received: typeof data },
      );
    }
  }

  /**
   * Build standard Tally TDL XML envelope for report export.
   */
  protected buildTdlRequest(reportName: string, filters?: Record<string, string>): string {
    const filterXml = filters
      ? Object.entries(filters)
          .map(([k, v]) => `<${k}>${this.escapeXml(v)}</${k}>`)
          .join('')
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${reportName}</REPORTNAME>
        <STATICVARIABLES>
          <COMPANYNAME>${this.escapeXml(this.config.companyName)}</COMPANYNAME>
          ${filterXml}
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  /**
   * Escape XML special characters in strings.
   */
  protected escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Extract all text nodes recursively from an XML object.
   * Used for finding data in deeply nested Tally responses.
   */
  protected extractTextNodes(obj: unknown, path: string = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (obj === null || obj === undefined) {
      return result;
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      result[path || 'value'] = obj;
      return result;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        const newPath = `${path}[${idx}]`;
        Object.assign(result, this.extractTextNodes(item, newPath));
      });
      return result;
    }

    if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;
        Object.assign(result, this.extractTextNodes(value, newPath));
      });
      return result;
    }

    return result;
  }

  /**
   * Abstract method: each subclass must implement extraction logic.
   */
  abstract extract(): Promise<ExtractionResult<T>>;

  /**
   * Abstract method: each subclass returns its extraction type.
   */
  abstract getExtractionType(): string;
}
