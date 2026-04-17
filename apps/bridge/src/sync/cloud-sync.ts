/**
 * D5: Cloud sync — sends data from bridge to FC cloud API.
 */
import { enqueue, dequeue, requeueWithError, queueSize } from '../queue/local-queue.js';

const UNKNOWN_ERROR = 'Unknown error';

export interface SyncResult {
  sent: number;
  failed: number;
  queued: number;
  lastSyncAt?: Date;
  itemsSynced?: number;
  errors?: Array<{ item: string; error: string }>;
}

export interface SyncMetrics {
  lastSyncAt: Date | null;
  itemsSynced: number;
  totalErrors: number;
  lastError?: string;
}

export class CloudSync {
  private apiBaseUrl: string;
  private apiToken: string;
  private factoryId: string;
  private metrics: SyncMetrics = {
    lastSyncAt: null,
    itemsSynced: 0,
    totalErrors: 0,
  };

  constructor(apiBaseUrl: string, apiToken: string, factoryId: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiToken = apiToken;
    this.factoryId = factoryId;
  }

  private recordError(err: unknown): string {
    const errorMsg = err instanceof Error ? err.message : UNKNOWN_ERROR;
    this.metrics.totalErrors++;
    this.metrics.lastError = errorMsg;
    return errorMsg;
  }

  private buildResult(sent: number, failed: number, errors: Array<{ item: string; error: string }>): SyncResult {
    this.metrics.lastSyncAt = new Date();
    return {
      sent,
      failed,
      queued: queueSize(),
      lastSyncAt: this.metrics.lastSyncAt,
      itemsSynced: this.metrics.itemsSynced,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async sendItems(
    apiPath: string,
    queueType: string,
    items: Record<string, unknown>[],
    getItemId: (item: Record<string, unknown>) => string,
  ): Promise<SyncResult> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ item: string; error: string }> = [];

    for (const item of items) {
      try {
        await this.post(apiPath, item);
        sent++;
        this.metrics.itemsSynced++;
      } catch (err) {
        enqueue(queueType, item);
        failed++;
        const errorMsg = this.recordError(err);
        errors.push({ item: getItemId(item), error: errorMsg });
      }
    }

    return this.buildResult(sent, failed, errors);
  }

  async sendOrders(orders: Record<string, unknown>[]): Promise<SyncResult> {
    return this.sendItems(
      '/api/v1/orders',
      'order',
      orders,
      (o) => (o.erp_order_id as string) || 'unknown',
    );
  }

  async sendProducts(products: Record<string, unknown>[]): Promise<SyncResult> {
    return this.sendItems(
      '/api/v1/products',
      'product',
      products,
      (p) => (p.sku as string) || 'unknown',
    );
  }

  async sendInvoices(invoices: Record<string, unknown>[]): Promise<SyncResult> {
    return this.sendItems(
      '/api/v1/invoices',
      'invoice',
      invoices,
      (i) => (i.erp_invoice_id as string) || 'unknown',
    );
  }

  async sendShipments(shipments: Record<string, unknown>[]): Promise<SyncResult> {
    return this.sendItems(
      '/api/v1/shipments',
      'shipment',
      shipments,
      (s) => (s.shipment_id as string) || 'unknown',
    );
  }

  private resolveQueueEndpoint(type: string): string {
    const knownEndpoints: Record<string, string> = {
      order: '/api/v1/orders',
      product: '/api/v1/products',
      invoice: '/api/v1/invoices',
      shipment: '/api/v1/shipments',
    };
    return knownEndpoints[type] ?? `/api/v1/${type}s`;
  }

  async drainQueue(batchSize: number = 10): Promise<SyncResult> {
    const batch = dequeue(batchSize);
    let sent = 0;
    let failed = 0;
    const errors: Array<{ item: string; error: string }> = [];

    for (const msg of batch) {
      try {
        const endpoint = this.resolveQueueEndpoint(msg.type);
        await this.post(endpoint, msg.payload);
        sent++;
        this.metrics.itemsSynced++;
      } catch (err) {
        requeueWithError(msg, err instanceof Error ? err.message : UNKNOWN_ERROR);
        failed++;
        const errorMsg = this.recordError(err);
        errors.push({ item: msg.id, error: errorMsg });
      }
    }

    return this.buildResult(sent, failed, errors);
  }

  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const url = `${this.apiBaseUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
        'X-Factory-ID': this.factoryId,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json() as Promise<Record<string, unknown>>;
  }
}
