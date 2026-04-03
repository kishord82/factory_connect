/**
 * D5: Cloud sync — sends data from bridge to FC cloud API.
 */
import { enqueue, dequeue, requeueWithError, queueSize } from '../queue/local-queue.js';

export interface SyncResult {
  sent: number;
  failed: number;
  queued: number;
}

export class CloudSync {
  private apiBaseUrl: string;
  private apiToken: string;
  private factoryId: string;

  constructor(apiBaseUrl: string, apiToken: string, factoryId: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiToken = apiToken;
    this.factoryId = factoryId;
  }

  async sendOrders(orders: Record<string, unknown>[]): Promise<SyncResult> {
    let sent = 0;
    let failed = 0;
    for (const order of orders) {
      try {
        await this.post('/api/v1/orders', order);
        sent++;
      } catch (err) {
        enqueue('order', order);
        failed++;
      }
    }
    return { sent, failed, queued: queueSize() };
  }

  async sendShipments(shipments: Record<string, unknown>[]): Promise<SyncResult> {
    let sent = 0;
    let failed = 0;
    for (const shipment of shipments) {
      try {
        await this.post('/api/v1/shipments', shipment);
        sent++;
      } catch (err) {
        enqueue('shipment', shipment);
        failed++;
      }
    }
    return { sent, failed, queued: queueSize() };
  }

  async drainQueue(batchSize: number = 10): Promise<SyncResult> {
    const batch = dequeue(batchSize);
    let sent = 0;
    let failed = 0;
    for (const msg of batch) {
      try {
        const endpoint = msg.type === 'order' ? '/api/v1/orders' : `/api/v1/${msg.type}s`;
        await this.post(endpoint, msg.payload);
        sent++;
      } catch (err) {
        requeueWithError(msg, err instanceof Error ? err.message : 'Unknown error');
        failed++;
      }
    }
    return { sent, failed, queued: queueSize() };
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
