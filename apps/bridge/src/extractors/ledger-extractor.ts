/**
 * Ledger Extractor: Pulls Chart of Accounts and ledger balances from TallyPrime.
 */

import { FcError } from '@fc/shared';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';

export interface Ledger {
  name: string;
  group: string;
  openingBalance: number;
  closingBalance: number;
  debitTotal: number;
  creditTotal: number;
  gstApplicable: boolean;
  gstType: string;
  gstin: string;
  panNumber: string;
  address: string;
  state: string;
}

export interface LedgerGroup {
  name: string;
  parent: string;
  isPrimary: boolean;
  nature: string; // Assets/Liabilities/Income/Expense
}

export interface LedgerExtractionData {
  ledgers: Ledger[];
  groups: LedgerGroup[];
}

export class LedgerExtractor extends BaseExtractor<LedgerExtractionData> {
  constructor(config: TallyConfig) {
    super(config);
  }

  async extract(): Promise<ExtractionResult<LedgerExtractionData>> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordCount = 0;

    try {
      // Extract ledgers and groups in parallel
      const [ledgers, groups] = await Promise.all([
        this.extractLedgers().catch((err) => {
          errors.push(`Ledgers: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractGroups().catch((err) => {
          errors.push(`Groups: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
      ]);

      recordCount = ledgers.length + groups.length;

      return {
        success: errors.length === 0,
        data: {
          ledgers,
          groups,
        },
        extractedAt: new Date(),
        recordCount,
        errors,
      };
    } catch (error) {
      throw new FcError(
        'FC_ERR_BRIDGE_LEDGER_EXTRACTION_FAILED',
        `Ledger extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        { duration: Date.now() - startTime },
      );
    }
  }

  private async extractLedgers(): Promise<Ledger[]> {
    const tdlRequest = this.buildLedgersTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const ledgers: Ledger[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.LEDGERS) {
      const ledgerData = data.LEDGERS as Record<string, unknown>;
      const lines = ledgerData.LEDGERLINE;

      if (Array.isArray(lines)) {
        ledgers.push(...lines.map((line) => this.parseLedgerLine(line as Record<string, unknown>)));
      } else if (lines) {
        ledgers.push(this.parseLedgerLine(lines as Record<string, unknown>));
      }
    }

    return ledgers;
  }

  private async extractGroups(): Promise<LedgerGroup[]> {
    const tdlRequest = this.buildGroupsTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const groups: LedgerGroup[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.LEDGERGROUPS) {
      const groupData = data.LEDGERGROUPS as Record<string, unknown>;
      const lines = groupData.GROUPLINE;

      if (Array.isArray(lines)) {
        groups.push(...lines.map((line) => this.parseGroupLine(line as Record<string, unknown>)));
      } else if (lines) {
        groups.push(this.parseGroupLine(lines as Record<string, unknown>));
      }
    }

    return groups;
  }

  private parseLedgerLine(line: Record<string, unknown>): Ledger {
    return {
      name: String(line.NAME || ''),
      group: String(line.GROUP || ''),
      openingBalance: Number(line.OPENINGBALANCE || 0),
      closingBalance: Number(line.CLOSINGBALANCE || 0),
      debitTotal: Number(line.DEBITTOTAL || 0),
      creditTotal: Number(line.CREDITTOTAL || 0),
      gstApplicable: String(line.GSTAPPLICABLE || 'No').toLowerCase() === 'yes',
      gstType: String(line.GSTTYPE || ''),
      gstin: String(line.GSTIN || ''),
      panNumber: String(line.PAN || ''),
      address: String(line.ADDRESS || ''),
      state: String(line.STATE || ''),
    };
  }

  private parseGroupLine(line: Record<string, unknown>): LedgerGroup {
    return {
      name: String(line.NAME || ''),
      parent: String(line.PARENT || ''),
      isPrimary: String(line.ISPRIMARY || 'No').toLowerCase() === 'yes',
      nature: String(line.NATURE || ''),
    };
  }

  private buildLedgersTdl(): string {
    return this.buildTdlRequest('Chart of Accounts', {
      DATEFORMAT: 'DD-MMM-YYYY',
      SHOWOPENINGBALANCE: 'Yes',
      SHOWCLOSINGBALANCE: 'Yes',
    });
  }

  private buildGroupsTdl(): string {
    return this.buildTdlRequest('Ledger Groups', {
      SHOWALL: 'Yes',
    });
  }

  getExtractionType(): string {
    return 'LEDGER_DATA';
  }
}
