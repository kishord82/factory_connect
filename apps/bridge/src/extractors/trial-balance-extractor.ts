/**
 * Trial Balance Extractor: Pulls trial balance for any date range from TallyPrime.
 */

import { FcError } from '@fc/shared';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';

export interface TrialBalanceEntry {
  ledgerName: string;
  group: string;
  openingDebit: number;
  openingCredit: number;
  transactionDebit: number;
  transactionCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceTotals {
  openingDebit: number;
  openingCredit: number;
  transactionDebit: number;
  transactionCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceData {
  asOfDate: string;
  entries: TrialBalanceEntry[];
  totals: TrialBalanceTotals;
}

export class TrialBalanceExtractor extends BaseExtractor<TrialBalanceData> {
  private readonly asOfDate: string;

  constructor(config: TallyConfig, asOfDate: string = new Date().toISOString().split('T')[0]) {
    super(config);
    this.asOfDate = asOfDate;
  }

  async extract(): Promise<ExtractionResult<TrialBalanceData>> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const tdlRequest = this.buildTrialBalanceTdl();
      const xmlResponse = await this.sendRequest(tdlRequest);
      const parsed = await this.parseXml(xmlResponse);

      this.validateResponse(parsed);

      const entries: TrialBalanceEntry[] = [];
      const totals: TrialBalanceTotals = {
        openingDebit: 0,
        openingCredit: 0,
        transactionDebit: 0,
        transactionCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      };

      const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

      if (data?.TRIALBALANCE) {
        const tbData = data.TRIALBALANCE as Record<string, unknown>;
        const lines = tbData.TBLINE;

        if (Array.isArray(lines)) {
          lines.forEach((line) => {
            const entry = this.parseTrialBalanceEntry(line as Record<string, unknown>);
            entries.push(entry);
            this.accumulateTotals(totals, entry);
          });
        } else if (lines) {
          const entry = this.parseTrialBalanceEntry(lines as Record<string, unknown>);
          entries.push(entry);
          this.accumulateTotals(totals, entry);
        }

        // Also check for explicit TOTALS section
        const explicitTotals = tbData.TOTALS as Record<string, unknown>;
        if (explicitTotals) {
          totals.openingDebit = Number(explicitTotals.OPENINGDEBIT || totals.openingDebit);
          totals.openingCredit = Number(explicitTotals.OPENINGCREDIT || totals.openingCredit);
          totals.transactionDebit = Number(explicitTotals.TRANSACTIONDEBIT || totals.transactionDebit);
          totals.transactionCredit = Number(explicitTotals.TRANSACTIONCREDIT || totals.transactionCredit);
          totals.closingDebit = Number(explicitTotals.CLOSINGDEBIT || totals.closingDebit);
          totals.closingCredit = Number(explicitTotals.CLOSINGCREDIT || totals.closingCredit);
        }
      }

      return {
        success: errors.length === 0,
        data: {
          asOfDate: this.asOfDate,
          entries,
          totals,
        },
        extractedAt: new Date(),
        recordCount: entries.length,
        errors,
      };
    } catch (error) {
      throw new FcError(
        'FC_ERR_BRIDGE_TRIAL_BALANCE_EXTRACTION_FAILED',
        `Trial Balance extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        { date: this.asOfDate, duration: Date.now() - startTime },
      );
    }
  }

  private parseTrialBalanceEntry(line: Record<string, unknown>): TrialBalanceEntry {
    return {
      ledgerName: String(line.LEDGERNAME || ''),
      group: String(line.GROUP || ''),
      openingDebit: Number(line.OPENINGDEBIT || 0),
      openingCredit: Number(line.OPENINGCREDIT || 0),
      transactionDebit: Number(line.TRANSACTIONDEBIT || 0),
      transactionCredit: Number(line.TRANSACTIONCREDIT || 0),
      closingDebit: Number(line.CLOSINGDEBIT || 0),
      closingCredit: Number(line.CLOSINGCREDIT || 0),
    };
  }

  private accumulateTotals(totals: TrialBalanceTotals, entry: TrialBalanceEntry): void {
    totals.openingDebit += entry.openingDebit;
    totals.openingCredit += entry.openingCredit;
    totals.transactionDebit += entry.transactionDebit;
    totals.transactionCredit += entry.transactionCredit;
    totals.closingDebit += entry.closingDebit;
    totals.closingCredit += entry.closingCredit;
  }

  private buildTrialBalanceTdl(): string {
    return this.buildTdlRequest('Trial Balance', {
      ASOFDATE: this.formatDateForTally(this.asOfDate),
      DATEFORMAT: 'DD-MMM-YYYY',
      SHOWOPENINGBALANCE: 'Yes',
    });
  }

  private formatDateForTally(date: string): string {
    // Convert YYYY-MM-DD to DD-MMM-YYYY format that Tally expects
    try {
      const dateObj = new Date(date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return date;
    }
  }

  getExtractionType(): string {
    return 'TRIAL_BALANCE_DATA';
  }
}
