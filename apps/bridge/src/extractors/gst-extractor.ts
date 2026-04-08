/**
 * GST Extractor: Pulls GST-related data from TallyPrime.
 * Extracts: Sales Register, Purchase Register, HSN Summary, B2B/B2C Summary.
 */

import { FcError } from '@fc/shared';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';

export interface GstSalesLine {
  voucherDate: string;
  voucherNumber: string;
  partyName: string;
  partyGstin: string;
  invoiceNumber: string;
  hsnCode: string;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessAmount: number;
  totalAmount: number;
  placeOfSupply: string;
  reverseCharge: boolean;
}

export interface GstPurchaseLine {
  voucherDate: string;
  voucherNumber: string;
  partyName: string;
  partyGstin: string;
  invoiceNumber: string;
  hsnCode: string;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessAmount: number;
  totalAmount: number;
  placeOfSupply: string;
  reverseCharge: boolean;
}

export interface HsnSummaryLine {
  hsnCode: string;
  description: string;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
}

export interface B2bSummary {
  b2bCount: number;
  b2cCount: number;
  cdnrCount: number;
  exportCount: number;
}

export interface GstExtractionData {
  salesRegister: GstSalesLine[];
  purchaseRegister: GstPurchaseLine[];
  hsnSummary: HsnSummaryLine[];
  b2bSummary: B2bSummary;
}

export class GstExtractor extends BaseExtractor<GstExtractionData> {
  constructor(config: TallyConfig) {
    super(config);
  }

  async extract(): Promise<ExtractionResult<GstExtractionData>> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordCount = 0;

    try {
      // Extract all three registers in parallel
      const [salesRegister, purchaseRegister, hsnSummary, b2bSummary] = await Promise.all([
        this.extractSalesRegister().catch((err) => {
          errors.push(`Sales Register: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractPurchaseRegister().catch((err) => {
          errors.push(`Purchase Register: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractHsnSummary().catch((err) => {
          errors.push(`HSN Summary: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractB2bSummary().catch((err) => {
          errors.push(`B2B Summary: ${err instanceof Error ? err.message : String(err)}`);
          return { b2bCount: 0, b2cCount: 0, cdnrCount: 0, exportCount: 0 };
        }),
      ]);

      recordCount = salesRegister.length + purchaseRegister.length + hsnSummary.length;

      return {
        success: errors.length === 0,
        data: {
          salesRegister,
          purchaseRegister,
          hsnSummary,
          b2bSummary,
        },
        extractedAt: new Date(),
        recordCount,
        errors,
      };
    } catch (error) {
      throw new FcError(
        'FC_ERR_BRIDGE_GST_EXTRACTION_FAILED',
        `GST extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        { duration: Date.now() - startTime },
      );
    }
  }

  private async extractSalesRegister(): Promise<GstSalesLine[]> {
    const tdlRequest = this.buildSalesRegisterTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    // Extract sales lines from Tally's nested XML structure
    // Tally returns: ENVELOPE > BODY > DATA > GSTREGISTER > SALESLINE
    const salesLines: GstSalesLine[] = [];

    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;
    if (data?.GSTREGISTER) {
      const register = data.GSTREGISTER as Record<string, unknown>;
      const lines = register.SALESLINE;

      if (Array.isArray(lines)) {
        salesLines.push(
          ...lines.map((line) => this.parseSalesLine(line as Record<string, unknown>)),
        );
      } else if (lines) {
        salesLines.push(this.parseSalesLine(lines as Record<string, unknown>));
      }
    }

    return salesLines;
  }

  private async extractPurchaseRegister(): Promise<GstPurchaseLine[]> {
    const tdlRequest = this.buildPurchaseRegisterTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const purchaseLines: GstPurchaseLine[] = [];

    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;
    if (data?.GSTREGISTER) {
      const register = data.GSTREGISTER as Record<string, unknown>;
      const lines = register.PURCHASELINE;

      if (Array.isArray(lines)) {
        purchaseLines.push(
          ...lines.map((line) => this.parsePurchaseLine(line as Record<string, unknown>)),
        );
      } else if (lines) {
        purchaseLines.push(this.parsePurchaseLine(lines as Record<string, unknown>));
      }
    }

    return purchaseLines;
  }

  private async extractHsnSummary(): Promise<HsnSummaryLine[]> {
    const tdlRequest = this.buildHsnSummaryTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const hsnLines: HsnSummaryLine[] = [];

    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;
    if (data?.HSNSUMMARY) {
      const summary = data.HSNSUMMARY as Record<string, unknown>;
      const lines = summary.HSNLINE;

      if (Array.isArray(lines)) {
        hsnLines.push(
          ...lines.map((line) => this.parseHsnLine(line as Record<string, unknown>)),
        );
      } else if (lines) {
        hsnLines.push(this.parseHsnLine(lines as Record<string, unknown>));
      }
    }

    return hsnLines;
  }

  private async extractB2bSummary(): Promise<B2bSummary> {
    const tdlRequest = this.buildB2bSummaryTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;
    const summary = data?.B2BSUMMARY as Record<string, unknown>;

    return {
      b2bCount: Number(summary?.B2BCOUNT || 0),
      b2cCount: Number(summary?.B2CCOUNT || 0),
      cdnrCount: Number(summary?.CDNRCOUNT || 0),
      exportCount: Number(summary?.EXPORTCOUNT || 0),
    };
  }

  private parseSalesLine(line: Record<string, unknown>): GstSalesLine {
    return {
      voucherDate: String(line.VOUCHERDATE || ''),
      voucherNumber: String(line.VOUCHERNUMBER || ''),
      partyName: String(line.PARTYNAME || ''),
      partyGstin: String(line.PARTYGSTIN || ''),
      invoiceNumber: String(line.INVOICENUMBER || ''),
      hsnCode: String(line.HSNCODE || ''),
      taxableAmount: Number(line.TAXABLEAMOUNT || 0),
      cgstRate: Number(line.CGSTRATE || 0),
      cgstAmount: Number(line.CGSTAMOUNT || 0),
      sgstRate: Number(line.SGSTRATE || 0),
      sgstAmount: Number(line.SGSTAMOUNT || 0),
      igstRate: Number(line.IGSTRATE || 0),
      igstAmount: Number(line.IGSTAMOUNT || 0),
      cessAmount: Number(line.CESSAMOUNT || 0),
      totalAmount: Number(line.TOTALAMOUNT || 0),
      placeOfSupply: String(line.PLACEOFSUPPLY || ''),
      reverseCharge: String(line.REVERSECHARGE || '').toLowerCase() === 'yes',
    };
  }

  private parsePurchaseLine(line: Record<string, unknown>): GstPurchaseLine {
    return {
      voucherDate: String(line.VOUCHERDATE || ''),
      voucherNumber: String(line.VOUCHERNUMBER || ''),
      partyName: String(line.PARTYNAME || ''),
      partyGstin: String(line.PARTYGSTIN || ''),
      invoiceNumber: String(line.INVOICENUMBER || ''),
      hsnCode: String(line.HSNCODE || ''),
      taxableAmount: Number(line.TAXABLEAMOUNT || 0),
      cgstRate: Number(line.CGSTRATE || 0),
      cgstAmount: Number(line.CGSTAMOUNT || 0),
      sgstRate: Number(line.SGSTRATE || 0),
      sgstAmount: Number(line.SGSTAMOUNT || 0),
      igstRate: Number(line.IGSTRATE || 0),
      igstAmount: Number(line.IGSTAMOUNT || 0),
      cessAmount: Number(line.CESSAMOUNT || 0),
      totalAmount: Number(line.TOTALAMOUNT || 0),
      placeOfSupply: String(line.PLACEOFSUPPLY || ''),
      reverseCharge: String(line.REVERSECHARGE || '').toLowerCase() === 'yes',
    };
  }

  private parseHsnLine(line: Record<string, unknown>): HsnSummaryLine {
    return {
      hsnCode: String(line.HSNCODE || ''),
      description: String(line.DESCRIPTION || ''),
      totalQuantity: Number(line.TOTALQUANTITY || 0),
      totalValue: Number(line.TOTALVALUE || 0),
      taxableValue: Number(line.TAXABLEVALUE || 0),
    };
  }

  private buildSalesRegisterTdl(): string {
    return this.buildTdlRequest('GST Sales Register', {
      REPORTTYPE: 'Sales',
      DATEFORMAT: 'DD-MMM-YYYY',
      SHOWALLLEDGERS: 'No',
    });
  }

  private buildPurchaseRegisterTdl(): string {
    return this.buildTdlRequest('GST Purchase Register', {
      REPORTTYPE: 'Purchase',
      DATEFORMAT: 'DD-MMM-YYYY',
      SHOWALLLEDGERS: 'No',
    });
  }

  private buildHsnSummaryTdl(): string {
    return this.buildTdlRequest('GST HSN Summary', {
      DATEFORMAT: 'DD-MMM-YYYY',
    });
  }

  private buildB2bSummaryTdl(): string {
    return this.buildTdlRequest('GST B2B Summary', {
      DATEFORMAT: 'DD-MMM-YYYY',
    });
  }

  getExtractionType(): string {
    return 'GST_DATA';
  }
}
