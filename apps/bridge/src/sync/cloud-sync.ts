/**
 * D5: Cloud sync — sends data from bridge to FC cloud API.
 */
import { enqueue, dequeue, requeueWithError, queueSize } from '../queue/local-queue.js';

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

  async sendOrders(orders: Record<string, unknown>[]): Promise<SyncResult> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ item: string; error: string }> = [];

    for (const order of orders) {
      try {
        await this.post('/api/v1/orders', order);
        sent++;
        this.metrics.itemsSynced++;
      } catch (err) {
        enqueue('order', order);
        failed++;
        this.metrics.totalErrors++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        this.metrics.lastError = errorMsg;
        errors.push({
          item: (order.erp_order_id as string) || 'unknown',
          error: errorMsg,
        });
      }
    }

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

  async sendProducts(products: Record<string, unknown>[]): Promise<SyncResult> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ item: string; error: string }> = [];

    for (const product of products) {
      try {
        await this.post('/api/v1/products', product);
        sent++;
        this.metrics.itemsSynced++;
      } catch (err) {
        enqueue('product', product);
        failed++;
        this.metrics.totalErrors++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        this.metrics.lastError = errorMsg;
        errors.push({
          item: (product.sku as string) || 'unknown',
          error: errorMsg,
        });
      }
    }

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

  async sendInvoices(invoices: Record<string, unknown>[]): Promise<SyncResult> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ item: string; error: string }> = [];

    for (const invoice of invoices) {
      try {
        await this.post('/api/v1/invoices', invoice);
        sent++;
        this.metrics.itemsSynced++;
      } catch (err) {
        enqueue('invoice', invoice);
        failed++;
        this.metrics.totalErrors++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        this.metrics.lastError = errorMsg;
        errors.push({
          item: (invoice.erp_invoice_id as string) || 'unknown',
          error: errorMsg,
        });
      }
    }

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

  async sendShipments(shipments: Record<string, unknown>[]): Promise<SyncResult> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ item: string; error: string }> = [];

    for (const shipment of shipments) {
      try {
        await this.post('/api/v1/shipments', shipment);
        sent++;
        this.metrics.itemsSynced++;
      } catch (err) {
        enqueue('shipment', shipment);
        failed++;
        this.metrics.totalErrors++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        this.metrics.lastError = errorMsg;
        errors.push({
          item: (shipment.shipment_id as string) || 'unknown',
          error: errorMsg,
        });
      }
    }

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

  async drainQueue(batchSize: number = 10): Promise<SyncResult> {
    const batch = dequeue(batchSize);
    let sent = 0;
    let failed = 0;
    const errors: Array<{ item: string; error: string }> = [];

    for (const msg of batch) {
      try {
        const endpoint = msg.type === 'order'
          ? '/api/v1/orders'
          : msg.type === 'product'
            ? '/api/v1/products'
            : msg.type === 'invoice'
              ? '/api/v1/invoices'
              : `/api/v1/${msg.type}s`;

        await this.post(endpoint, msg.payload);
        sent++;
        this.metrics.itemsSynced++;
      } catch (err) {
        requeueWithError(msg, err instanceof Error ? err.message : 'Unknown error');
        failed++;
        this.metrics.totalErrors++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        this.metrics.lastError = errorMsg;
        errors.push({
          item: msg.id,
          error: errorMsg,
        });
      }
    }

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
