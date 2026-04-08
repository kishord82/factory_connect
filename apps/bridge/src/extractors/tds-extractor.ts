/**
 * TDS Extractor: Pulls TDS deductions, challans, and party details from TallyPrime.
 */

import { FcError } from '@fc/shared';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';

export interface TdsDeduction {
  date: string;
  partyName: string;
  panNumber: string;
  section: string; // 194A, 194C, 194J, etc
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  challanNumber: string;
  challanDate: string;
  bsrCode: string;
}

export interface TdsChallan {
  challanNumber: string;
  date: string;
  bsrCode: string;
  amount: number;
  section: string;
}

export interface TdsPartySummary {
  partyName: string;
  pan: string;
  totalDeducted: number;
  totalDeposited: number;
  variance: number;
}

export interface TdsExtractionData {
  deductions: TdsDeduction[];
  challans: TdsChallan[];
  partySummary: TdsPartySummary[];
}

export class TdsExtractor extends BaseExtractor<TdsExtractionData> {
  constructor(config: TallyConfig) {
    super(config);
  }

  async extract(): Promise<ExtractionResult<TdsExtractionData>> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordCount = 0;

    try {
      // Extract TDS data in parallel
      const [deductions, challans, partySummary] = await Promise.all([
        this.extractDeductions().catch((err) => {
          errors.push(`Deductions: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractChallans().catch((err) => {
          errors.push(`Challans: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractPartySummary().catch((err) => {
          errors.push(`Party Summary: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
      ]);

      recordCount = deductions.length + challans.length + partySummary.length;

      return {
        success: errors.length === 0,
        data: {
          deductions,
          challans,
          partySummary,
        },
        extractedAt: new Date(),
        recordCount,
        errors,
      };
    } catch (error) {
      throw new FcError(
        'FC_ERR_BRIDGE_TDS_EXTRACTION_FAILED',
        `TDS extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        { duration: Date.now() - startTime },
      );
    }
  }

  private async extractDeductions(): Promise<TdsDeduction[]> {
    const tdlRequest = this.buildDeductionsTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const deductions: TdsDeduction[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.TDSDEDUCTIONS) {
      const register = data.TDSDEDUCTIONS as Record<string, unknown>;
      const lines = register.DEDUCTIONLINE;

      if (Array.isArray(lines)) {
        deductions.push(...lines.map((line) => this.parseDeductionLine(line as Record<string, unknown>)));
      } else if (lines) {
        deductions.push(this.parseDeductionLine(lines as Record<string, unknown>));
      }
    }

    return deductions;
  }

  private async extractChallans(): Promise<TdsChallan[]> {
    const tdlRequest = this.buildChallansTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const challans: TdsChallan[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.TDSCHALLANS) {
      const register = data.TDSCHALLANS as Record<string, unknown>;
      const lines = register.CHALLANLINE;

      if (Array.isArray(lines)) {
        challans.push(...lines.map((line) => this.parseChallanLine(line as Record<string, unknown>)));
      } else if (lines) {
        challans.push(this.parseChallanLine(lines as Record<string, unknown>));
      }
    }

    return challans;
  }

  private async extractPartySummary(): Promise<TdsPartySummary[]> {
    const tdlRequest = this.buildPartySummaryTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const summary: TdsPartySummary[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.TDSPARTYSUMMARY) {
      const register = data.TDSPARTYSUMMARY as Record<string, unknown>;
      const lines = register.PARTYLINE;

      if (Array.isArray(lines)) {
        summary.push(...lines.map((line) => this.parsePartySummaryLine(line as Record<string, unknown>)));
      } else if (lines) {
        summary.push(this.parsePartySummaryLine(lines as Record<string, unknown>));
      }
    }

    return summary;
  }

  private parseDeductionLine(line: Record<string, unknown>): TdsDeduction {
    return {
      date: String(line.DATE || ''),
      partyName: String(line.PARTYNAME || ''),
      panNumber: String(line.PAN || ''),
      section: String(line.SECTION || ''),
      grossAmount: Number(line.GROSSAMOUNT || 0),
      tdsRate: Number(line.TDSRATE || 0),
      tdsAmount: Number(line.TDSAMOUNT || 0),
      challanNumber: String(line.CHALLANNUMBER || ''),
      challanDate: String(line.CHALLANDATE || ''),
      bsrCode: String(line.BSRCODE || ''),
    };
  }

  private parseChallanLine(line: Record<string, unknown>): TdsChallan {
    return {
      challanNumber: String(line.CHALLANNUMBER || ''),
      date: String(line.DATE || ''),
      bsrCode: String(line.BSRCODE || ''),
      amount: Number(line.AMOUNT || 0),
      section: String(line.SECTION || ''),
    };
  }

  private parsePartySummaryLine(line: Record<string, unknown>): TdsPartySummary {
    const totalDeducted = Number(line.TOTALDEDUCTED || 0);
    const totalDeposited = Number(line.TOTALDEPOSITED || 0);

    return {
      partyName: String(line.PARTYNAME || ''),
      pan: String(line.PAN || ''),
      totalDeducted,
      totalDeposited,
      variance: totalDeducted - totalDeposited,
    };
  }

  private buildDeductionsTdl(): string {
    return this.buildTdlRequest('TDS Deductions Register', {
      DATEFORMAT: 'DD-MMM-YYYY',
      SHOWALLLEDGERS: 'No',
    });
  }

  private buildChallansTdl(): string {
    return this.buildTdlRequest('TDS Challans Register', {
      DATEFORMAT: 'DD-MMM-YYYY',
    });
  }

  private buildPartySummaryTdl(): string {
    return this.buildTdlRequest('TDS Party Summary', {
      DATEFORMAT: 'DD-MMM-YYYY',
    });
  }

  getExtractionType(): string {
    return 'TDS_DATA';
  }
}
