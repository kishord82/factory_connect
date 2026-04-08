/**
 * Stock Extractor: Pulls stock items, groups, godowns, and movements from TallyPrime.
 */

import { FcError } from '@fc/shared';
import { BaseExtractor, type TallyConfig, type ExtractionResult } from './base-extractor.js';

export interface StockItem {
  name: string;
  group: string;
  godown: string;
  unit: string;
  openingQuantity: number;
  openingValue: number;
  closingQuantity: number;
  closingValue: number;
  hsnCode: string;
  gstRate: number;
}

export interface StockMovement {
  date: string;
  itemName: string;
  voucherType: string;
  quantity: number;
  rate: number;
  value: number;
  godown: string;
}

export interface StockExtractionData {
  items: StockItem[];
  movements: StockMovement[];
}

export class StockExtractor extends BaseExtractor<StockExtractionData> {
  constructor(config: TallyConfig) {
    super(config);
  }

  async extract(): Promise<ExtractionResult<StockExtractionData>> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordCount = 0;

    try {
      // Extract stock items and movements in parallel
      const [items, movements] = await Promise.all([
        this.extractStockItems().catch((err) => {
          errors.push(`Stock Items: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
        this.extractStockMovements().catch((err) => {
          errors.push(`Stock Movements: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }),
      ]);

      recordCount = items.length + movements.length;

      return {
        success: errors.length === 0,
        data: {
          items,
          movements,
        },
        extractedAt: new Date(),
        recordCount,
        errors,
      };
    } catch (error) {
      throw new FcError(
        'FC_ERR_BRIDGE_STOCK_EXTRACTION_FAILED',
        `Stock extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        { duration: Date.now() - startTime },
      );
    }
  }

  private async extractStockItems(): Promise<StockItem[]> {
    const tdlRequest = this.buildStockItemsTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const items: StockItem[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.STOCKITEMS) {
      const itemData = data.STOCKITEMS as Record<string, unknown>;
      const lines = itemData.ITEMLINE;

      if (Array.isArray(lines)) {
        items.push(...lines.map((line) => this.parseStockItemLine(line as Record<string, unknown>)));
      } else if (lines) {
        items.push(this.parseStockItemLine(lines as Record<string, unknown>));
      }
    }

    return items;
  }

  private async extractStockMovements(): Promise<StockMovement[]> {
    const tdlRequest = this.buildStockMovementsTdl();
    const xmlResponse = await this.sendRequest(tdlRequest);
    const parsed = await this.parseXml(xmlResponse);

    this.validateResponse(parsed);

    const movements: StockMovement[] = [];
    const data = parsed.ENVELOPE?.BODY?.DATA as Record<string, unknown>;

    if (data?.STOCKMOVEMENTS) {
      const movementData = data.STOCKMOVEMENTS as Record<string, unknown>;
      const lines = movementData.MOVEMENTLINE;

      if (Array.isArray(lines)) {
        movements.push(...lines.map((line) => this.parseMovementLine(line as Record<string, unknown>)));
      } else if (lines) {
        movements.push(this.parseMovementLine(lines as Record<string, unknown>));
      }
    }

    return movements;
  }

  private parseStockItemLine(line: Record<string, unknown>): StockItem {
    return {
      name: String(line.NAME || ''),
      group: String(line.GROUP || ''),
      godown: String(line.GODOWN || ''),
      unit: String(line.UNIT || ''),
      openingQuantity: Number(line.OPENINGQUANTITY || 0),
      openingValue: Number(line.OPENINGVALUE || 0),
      closingQuantity: Number(line.CLOSINGQUANTITY || 0),
      closingValue: Number(line.CLOSINGVALUE || 0),
      hsnCode: String(line.HSNCODE || ''),
      gstRate: Number(line.GSTRATE || 0),
    };
  }

  private parseMovementLine(line: Record<string, unknown>): StockMovement {
    return {
      date: String(line.DATE || ''),
      itemName: String(line.ITEMNAME || ''),
      voucherType: String(line.VOUCHERTYPE || ''),
      quantity: Number(line.QUANTITY || 0),
      rate: Number(line.RATE || 0),
      value: Number(line.VALUE || 0),
      godown: String(line.GODOWN || ''),
    };
  }

  private buildStockItemsTdl(): string {
    return this.buildTdlRequest('Stock Items Summary', {
      SHOWOPENINGBALANCE: 'Yes',
      SHOWCLOSINGBALANCE: 'Yes',
      SHOWALL: 'Yes',
    });
  }

  private buildStockMovementsTdl(): string {
    return this.buildTdlRequest('Stock Movement Register', {
      DATEFORMAT: 'DD-MMM-YYYY',
      SHOWALLVOUCHERS: 'Yes',
    });
  }

  getExtractionType(): string {
    return 'STOCK_DATA';
  }
}
