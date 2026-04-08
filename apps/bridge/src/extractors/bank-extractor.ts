/**
 * Bank Extractor: Pulls bank transactions and account details from TallyPrime.
 */

import { FcError } from '@fc/shared';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';

export interface BankTransaction {
  date: string;
  voucherType: string;
  voucherNumber: string;
  partyName: string;
  instrumentNumber: string;
  instrumentDate: string;
  bankName: string;
  amount: number;
  transactionType: 'debit' | 'credit';
  narration: string;
  reconciled: boolean;
  bankDate: string | null;
}

export interface BankAccount {
  name: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  openingBalance: number;
  closingBalance: number;
}

export interface BankExtractionData {
  transactions: BankTransaction[];
  bankAccounts: BankAccount[];
}

export class BankExtractor extends BaseExtractor<BankExtractionData> {
  constructor(config: TallyConfig) {
    super(config);
  }

  async extract(): Promise<ExtractionResult<BankExtractionData>> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordCount = 0;

    try {
      // Extract transactions and accounts in parallel
      const [transactions, bankAccounts] = await Promise.all([
        this.extractTransactions().catch((err) => {
          errors.push(`Transactions: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractBankAccounts().catch((err) => {
          errors.push(`Bank Accounts: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
      ]);

      recordCount = transactions.length + bankAccounts.length;

      return {
        success: errors.length === 0,
        data: {
          transactions,
          bankAccounts,
        },
        extractedAt: new Date(),
        recordCount,
        errors,
      };
    } catch (error) {
      throw new FcError(
        'FC_ERR_BRIDGE_BANK_EXTRACTION_FAILED',
        `Bank extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        { duration: Date.now() - startTime },
      );
    }
  }

  private async extractTransactions(): Promise<BankTransaction[]> {
    const tdlRequest = this.buildTransactionsTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const transactions: BankTransaction[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.BANKTRANSACTIONS) {
      const transactionData = data.BANKTRANSACTIONS as Record<string, unknown>;
      const lines = transactionData.TRANSACTIONLINE;

      if (Array.isArray(lines)) {
        transactions.push(...lines.map((line) => this.parseTransactionLine(line as Record<string, unknown>)));
      } else if (lines) {
        transactions.push(this.parseTransactionLine(lines as Record<string, unknown>));
      }
    }

    return transactions;
  }

  private async extractBankAccounts(): Promise<BankAccount[]> {
    const tdlRequest = this.buildBankAccountsTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const accounts: BankAccount[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.BANKACCOUNTS) {
      const accountData = data.BANKACCOUNTS as Record<string, unknown>;
      const lines = accountData.ACCOUNTLINE;

      if (Array.isArray(lines)) {
        accounts.push(...lines.map((line) => this.parseAccountLine(line as Record<string, unknown>)));
      } else if (lines) {
        accounts.push(this.parseAccountLine(lines as Record<string, unknown>));
      }
    }

    return accounts;
  }

  private parseTransactionLine(line: Record<string, unknown>): BankTransaction {
    const transactionType = String(line.TRANSACTIONTYPE || 'debit').toLowerCase();
    const validTransactionType: 'debit' | 'credit' = transactionType === 'credit' ? 'credit' : 'debit';

    return {
      date: String(line.DATE || ''),
      voucherType: String(line.VOUCHERTYPE || ''),
      voucherNumber: String(line.VOUCHERNUMBER || ''),
      partyName: String(line.PARTYNAME || ''),
      instrumentNumber: String(line.INSTRUMENTNUMBER || ''),
      instrumentDate: String(line.INSTRUMENTDATE || ''),
      bankName: String(line.BANKNAME || ''),
      amount: Number(line.AMOUNT || 0),
      transactionType: validTransactionType,
      narration: String(line.NARRATION || ''),
      reconciled: String(line.RECONCILED || 'No').toLowerCase() === 'yes',
      bankDate: String(line.BANKDATE || '') || null,
    };
  }

  private parseAccountLine(line: Record<string, unknown>): BankAccount {
    return {
      name: String(line.NAME || ''),
      bankName: String(line.BANKNAME || ''),
      accountNumber: String(line.ACCOUNTNUMBER || ''),
      ifscCode: String(line.IFSCCODE || ''),
      openingBalance: Number(line.OPENINGBALANCE || 0),
      closingBalance: Number(line.CLOSINGBALANCE || 0),
    };
  }

  private buildTransactionsTdl(): string {
    return this.buildTdlRequest('Bank Transactions', {
      DATEFORMAT: 'DD-MMM-YYYY',
      INCLUDERECONCILEDTRANSACTIONS: 'Yes',
    });
  }

  private buildBankAccountsTdl(): string {
    return this.buildTdlRequest('Bank Accounts', {
      SHOWOPENINGBALANCE: 'Yes',
      SHOWCLOSINGBALANCE: 'Yes',
    });
  }

  getExtractionType(): string {
    return 'BANK_DATA';
  }
}
