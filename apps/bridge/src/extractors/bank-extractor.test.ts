/**
 * Tests for BankExtractor: bank transactions and account details.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BankExtractor } from './bank-extractor.js';
import type { TallyConfig } from './base-extractor.js';
import { FcError } from '@fc/shared';

describe('BankExtractor', () => {
  let extractor: BankExtractor;
  let config: TallyConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 9000,
      companyName: 'Bank Test Co',
      timeout: 5000,
    };
    extractor = new BankExtractor(config);
  });

  describe('extract', () => {
    it('should extract transactions and bank accounts', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <BANKTRANSACTIONS>
                <TRANSACTIONLINE>
                  <DATE>01-01-2024</DATE>
                  <VOUCHERTYPE>Journal</VOUCHERTYPE>
                  <VOUCHERNUMBER>JV001</VOUCHERNUMBER>
                  <PARTYNAME>Customer A</PARTYNAME>
                  <INSTRUMENTNUMBER>CHQ001</INSTRUMENTNUMBER>
                  <INSTRUMENTDATE>01-01-2024</INSTRUMENTDATE>
                  <BANKNAME>ICICI Bank</BANKNAME>
                  <AMOUNT>50000</AMOUNT>
                  <TRANSACTIONTYPE>debit</TRANSACTIONTYPE>
                  <NARRATION>Cheque received</NARRATION>
                  <RECONCILED>Yes</RECONCILED>
                  <BANKDATE>02-01-2024</BANKDATE>
                </TRANSACTIONLINE>
              </BANKTRANSACTIONS>
              <BANKACCOUNTS>
                <ACCOUNTLINE>
                  <NAME>ICICI Bank - Current</NAME>
                  <BANKNAME>ICICI Bank</BANKNAME>
                  <ACCOUNTNUMBER>123456789</ACCOUNTNUMBER>
                  <IFSCCODE>ICIC0000001</IFSCCODE>
                  <OPENINGBALANCE>100000</OPENINGBALANCE>
                  <CLOSINGBALANCE>150000</CLOSINGBALANCE>
                </ACCOUNTLINE>
              </BANKACCOUNTS>
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
      expect(result.data.transactions).toHaveLength(1);
      expect(result.data.bankAccounts).toHaveLength(1);
      expect(result.recordCount).toBe(2);
    });

    it('should correctly parse transaction types', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <BANKTRANSACTIONS>
                <TRANSACTIONLINE>
                  <DATE>01-01-2024</DATE>
                  <VOUCHERTYPE>Journal</VOUCHERTYPE>
                  <VOUCHERNUMBER>JV001</VOUCHERNUMBER>
                  <PARTYNAME>Bank</PARTYNAME>
                  <INSTRUMENTNUMBER></INSTRUMENTNUMBER>
                  <INSTRUMENTDATE></INSTRUMENTDATE>
                  <BANKNAME>ICICI</BANKNAME>
                  <AMOUNT>25000</AMOUNT>
                  <TRANSACTIONTYPE>credit</TRANSACTIONTYPE>
                  <NARRATION>Transfer out</NARRATION>
                  <RECONCILED>No</RECONCILED>
                  <BANKDATE></BANKDATE>
                </TRANSACTIONLINE>
              </BANKTRANSACTIONS>
              <BANKACCOUNTS/>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();
      const transaction = result.data.transactions[0];

      expect(transaction.transactionType).toBe('credit');
      expect(transaction.amount).toBe(25000);
      expect(transaction.reconciled).toBe(false);
      expect(transaction.bankDate).toBeNull();
    });

    it('should handle multiple transactions and accounts', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <BANKTRANSACTIONS>
                <TRANSACTIONLINE>
                  <DATE>01-01-2024</DATE>
                  <VOUCHERTYPE>Journal</VOUCHERTYPE>
                  <VOUCHERNUMBER>JV001</VOUCHERNUMBER>
                  <PARTYNAME>Party A</PARTYNAME>
                  <INSTRUMENTNUMBER>CHQ001</INSTRUMENTNUMBER>
                  <INSTRUMENTDATE>01-01-2024</INSTRUMENTDATE>
                  <BANKNAME>ICICI</BANKNAME>
                  <AMOUNT>10000</AMOUNT>
                  <TRANSACTIONTYPE>debit</TRANSACTIONTYPE>
                  <NARRATION>Cheque</NARRATION>
                  <RECONCILED>Yes</RECONCILED>
                  <BANKDATE>02-01-2024</BANKDATE>
                </TRANSACTIONLINE>
                <TRANSACTIONLINE>
                  <DATE>02-01-2024</DATE>
                  <VOUCHERTYPE>Journal</VOUCHERTYPE>
                  <VOUCHERNUMBER>JV002</VOUCHERNUMBER>
                  <PARTYNAME>Party B</PARTYNAME>
                  <INSTRUMENTNUMBER>TFR001</INSTRUMENTNUMBER>
                  <INSTRUMENTDATE>02-01-2024</INSTRUMENTDATE>
                  <BANKNAME>HDFC</BANKNAME>
                  <AMOUNT>20000</AMOUNT>
                  <TRANSACTIONTYPE>credit</TRANSACTIONTYPE>
                  <NARRATION>Transfer</NARRATION>
                  <RECONCILED>No</RECONCILED>
                  <BANKDATE></BANKDATE>
                </TRANSACTIONLINE>
              </BANKTRANSACTIONS>
              <BANKACCOUNTS>
                <ACCOUNTLINE>
                  <NAME>ICICI Current</NAME>
                  <BANKNAME>ICICI Bank</BANKNAME>
                  <ACCOUNTNUMBER>1111111</ACCOUNTNUMBER>
                  <IFSCCODE>ICIC0000001</IFSCCODE>
                  <OPENINGBALANCE>50000</OPENINGBALANCE>
                  <CLOSINGBALANCE>60000</CLOSINGBALANCE>
                </ACCOUNTLINE>
                <ACCOUNTLINE>
                  <NAME>HDFC Savings</NAME>
                  <BANKNAME>HDFC Bank</BANKNAME>
                  <ACCOUNTNUMBER>2222222</ACCOUNTNUMBER>
                  <IFSCCODE>HDFC0000001</IFSCCODE>
                  <OPENINGBALANCE>100000</OPENINGBALANCE>
                  <CLOSINGBALANCE>120000</CLOSINGBALANCE>
                </ACCOUNTLINE>
              </BANKACCOUNTS>
            </DATA>
          </BODY>
        </ENVELOPE>`;

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await extractor.extract();

      expect(result.data.transactions).toHaveLength(2);
      expect(result.data.bankAccounts).toHaveLength(2);
      expect(result.data.transactions[0].voucherNumber).toBe('JV001');
      expect(result.data.transactions[1].bankName).toBe('HDFC');
      expect(result.data.bankAccounts[1].closingBalance).toBe(120000);
    });

    it('should handle empty sections gracefully', async () => {
      const mockResponse = `<?xml version="1.0"?>
        <ENVELOPE>
          <BODY>
            <DATA>
              <BANKTRANSACTIONS/>
              <BANKACCOUNTS/>
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
      expect(result.data.transactions).toHaveLength(0);
      expect(result.data.bankAccounts).toHaveLength(0);
    });
  });

  describe('getExtractionType', () => {
    it('should return correct extraction type', () => {
      expect(extractor.getExtractionType()).toBe('BANK_DATA');
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
        text: async () => '<broken>xml',
      });
      global.fetch = mockFetch;

      await expect(extractor.extract()).rejects.toBeInstanceOf(FcError);
    });
  });
});
