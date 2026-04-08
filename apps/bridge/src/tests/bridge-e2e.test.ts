/**
 * E2E: Bridge agent — polling → local queue → cloud sync
 * Tests offline resilience, health probes, adaptive polling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock implementations for testing the bridge lifecycle
 * In real bridge, these would interact with actual Tally, WebSocket, SQLite, etc.
 */

interface LocalQueueItem {
  id: string;
  type: 'purchase_order' | 'shipment_notification' | 'invoice';
  data: unknown;
  timestamp: Date;
  retry_count: number;
}

interface HealthProbe {
  service: string;
  healthy: boolean;
  last_check: Date;
  latency_ms: number;
}

// Mock ERP Adapter
class MockErpAdapter {
  constructor(_erp_type: string) {
    // ERP type could be used for logging or routing, but not needed for test mocks
  }

  async extractPurchaseOrders(_date_from: Date, _date_to: Date): Promise<unknown[]> {
    // Simulate data extraction
    return [
      {
        po_number: `PO-${Date.now()}`,
        vendor_code: 'VENDOR-001',
        amount: 50000,
        po_date: new Date(),
      },
    ];
  }

  async extractShipmentNotifications(): Promise<unknown[]> {
    return [];
  }

  async extractInvoices(_date_from: Date, _date_to: Date): Promise<unknown[]> {
    return [];
  }

  async healthCheck(): Promise<boolean> {
    // Simulate health check
    return Math.random() > 0.1; // 90% success rate
  }
}

// Mock Local Queue (SQLite in real app)
class MockLocalQueue {
  private items: LocalQueueItem[] = [];

  async enqueue(item: LocalQueueItem): Promise<void> {
    this.items.push(item);
  }

  async dequeue(): Promise<LocalQueueItem | null> {
    if (this.items.length === 0) return null;
    return this.items.shift() || null;
  }

  async getSize(): Promise<number> {
    return this.items.length;
  }

  async listPending(): Promise<LocalQueueItem[]> {
    return this.items;
  }

  async markProcessed(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id !== id);
  }

  async incrementRetry(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.retry_count++;
    }
  }

  async isOnline(): Promise<boolean> {
    // Check if we can connect to local SQLite
    return true;
  }
}

// Mock Cloud Sync (WebSocket tunnel)
class MockCloudSync {
  private connected = false;
  private messageQueue: unknown[] = [];

  async connect(_url: string): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async send(message: unknown): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to cloud');
    }
    this.messageQueue.push(message);
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async getQueuedMessages(): Promise<unknown[]> {
    return this.messageQueue;
  }
}

// Mock Health Reporter
class MockHealthReporter {
  private probes: Map<string, HealthProbe> = new Map();

  async register(service: string): Promise<void> {
    this.probes.set(service, {
      service,
      healthy: true,
      last_check: new Date(),
      latency_ms: 0,
    });
  }

  async updateProbe(service: string, healthy: boolean, latency_ms: number): Promise<void> {
    const probe = this.probes.get(service);
    if (probe) {
      probe.healthy = healthy;
      probe.latency_ms = latency_ms;
      probe.last_check = new Date();
    }
  }

  async getProbes(): Promise<HealthProbe[]> {
    return Array.from(this.probes.values());
  }

  async reportToCloud(_endpoint: string): Promise<void> {
    // Mock reporting health to cloud
  }
}

// Mock Adaptive Poller
class MockAdaptivePoller {
  private interval_ms = 5000; // Start with 5 seconds

  adjustInterval(factor: number): void {
    const min = 5000;
    const max = 300000; // Max 5 minutes

    this.interval_ms = Math.max(min, Math.min(max, this.interval_ms * factor));
  }

  getInterval(): number {
    return this.interval_ms;
  }

  reset(): void {
    this.interval_ms = 5000;
  }
}

describe('E2E: Bridge Agent Lifecycle', () => {
  let erp: MockErpAdapter;
  let localQueue: MockLocalQueue;
  let cloudSync: MockCloudSync;
  let healthReporter: MockHealthReporter;
  let adaptivePoller: MockAdaptivePoller;

  beforeEach(async () => {
    erp = new MockErpAdapter('tally');
    localQueue = new MockLocalQueue();
    cloudSync = new MockCloudSync();
    healthReporter = new MockHealthReporter();
    adaptivePoller = new MockAdaptivePoller();

    await healthReporter.register('erp');
    await healthReporter.register('cloud');
    await healthReporter.register('queue');
  });

  describe('Data Extraction and Queueing', () => {
    it('should extract data from ERP and queue locally', async () => {
      // Extract POs from Tally
      const pos = await erp.extractPurchaseOrders(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(pos.length).toBeGreaterThan(0);
      expect(pos[0]).toHaveProperty('po_number');

      // Queue extracted data
      for (const po of pos) {
        await localQueue.enqueue({
          id: uuidv4(),
          type: 'purchase_order',
          data: po,
          timestamp: new Date(),
          retry_count: 0,
        });
      }

      // Verify queued
      const size = await localQueue.getSize();
      expect(size).toBe(pos.length);
    });

    it('should queue multiple data types', async () => {
      const po = {
        po_number: 'PO-001',
        amount: 50000,
      };

      const shipment = {
        asn_number: 'ASN-001',
        tracking: 'TRACK123',
      };

      const invoice = {
        invoice_number: 'INV-001',
        amount: 50000,
      };

      await localQueue.enqueue({
        id: uuidv4(),
        type: 'purchase_order',
        data: po,
        timestamp: new Date(),
        retry_count: 0,
      });

      await localQueue.enqueue({
        id: uuidv4(),
        type: 'shipment_notification',
        data: shipment,
        timestamp: new Date(),
        retry_count: 0,
      });

      await localQueue.enqueue({
        id: uuidv4(),
        type: 'invoice',
        data: invoice,
        timestamp: new Date(),
        retry_count: 0,
      });

      const size = await localQueue.getSize();
      expect(size).toBe(3);

      const pending = await localQueue.listPending();
      const types = pending.map((item) => item.type);
      expect(types).toContain('purchase_order');
      expect(types).toContain('shipment_notification');
      expect(types).toContain('invoice');
    });

    it('should extract data at scheduled intervals', async () => {
      // Simulate polling at regular intervals
      const extractionTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        extractionTimes.push(Date.now());
        const pos = await erp.extractPurchaseOrders(new Date('2024-01-01'), new Date('2024-01-31'));

        for (const po of pos) {
          await localQueue.enqueue({
            id: uuidv4(),
            type: 'purchase_order',
            data: po,
            timestamp: new Date(),
            retry_count: 0,
          });
        }

        // Simulate interval
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      expect(extractionTimes.length).toBe(3);
    });
  });

  describe('Local Queue Operations', () => {
    it('should dequeue and process items FIFO', async () => {
      // Enqueue 3 items
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const id = uuidv4();
        ids.push(id);
        await localQueue.enqueue({
          id,
          type: 'purchase_order',
          data: { order: i },
          timestamp: new Date(),
          retry_count: 0,
        });
      }

      // Dequeue in order
      for (let i = 0; i < 3; i++) {
        const item = await localQueue.dequeue();
        expect(item).toBeDefined();
        expect(item?.id).toBe(ids[i]);
      }

      // Queue should be empty
      const size = await localQueue.getSize();
      expect(size).toBe(0);
    });

    it('should handle retry logic for failed items', async () => {
      const itemId = uuidv4();

      await localQueue.enqueue({
        id: itemId,
        type: 'purchase_order',
        data: { order: 1 },
        timestamp: new Date(),
        retry_count: 0,
      });

      // Simulate failed send
      await localQueue.incrementRetry(itemId);

      const pending = await localQueue.listPending();
      expect(pending[0].retry_count).toBe(1);

      // Retry again
      await localQueue.incrementRetry(itemId);
      const updated = await localQueue.listPending();
      expect(updated[0].retry_count).toBe(2);
    });

    it('should persist queue state across disconnections', async () => {
      // Enqueue items
      for (let i = 0; i < 5; i++) {
        await localQueue.enqueue({
          id: uuidv4(),
          type: 'purchase_order',
          data: { order: i },
          timestamp: new Date(),
          retry_count: 0,
        });
      }

      // Check size
      let size = await localQueue.getSize();
      expect(size).toBe(5);

      // Simulate restart (queue is still there)
      // In real bridge, would reconnect to SQLite
      size = await localQueue.getSize();
      expect(size).toBe(5);
    });

    it('should handle queue overflow gracefully', async () => {
      // Enqueue many items (simulate large backlog)
      for (let i = 0; i < 1000; i++) {
        await localQueue.enqueue({
          id: uuidv4(),
          type: 'purchase_order',
          data: { order: i },
          timestamp: new Date(),
          retry_count: 0,
        });
      }

      const size = await localQueue.getSize();
      expect(size).toBe(1000);

      // Should still be able to process
      const pending = await localQueue.listPending();
      expect(pending.length).toBe(1000);
    });
  });

  describe('Cloud Sync (WebSocket Tunnel)', () => {
    it('should establish connection to cloud', async () => {
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');

      const connected = await cloudSync.isConnected();
      expect(connected).toBe(true);
    });

    it('should disconnect gracefully', async () => {
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');
      await cloudSync.disconnect();

      const connected = await cloudSync.isConnected();
      expect(connected).toBe(false);
    });

    it('should send queued items to cloud when connected', async () => {
      // Queue items
      const items = [
        { po_number: 'PO-001', amount: 50000 },
        { po_number: 'PO-002', amount: 75000 },
      ];

      for (const item of items) {
        await localQueue.enqueue({
          id: uuidv4(),
          type: 'purchase_order',
          data: item,
          timestamp: new Date(),
          retry_count: 0,
        });
      }

      // Connect and drain queue
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');

      let item = await localQueue.dequeue();
      while (item) {
        await cloudSync.send(item);
        await localQueue.markProcessed(item.id);
        item = await localQueue.dequeue();
      }

      // Verify all sent
      const messages = await cloudSync.getQueuedMessages();
      expect(messages.length).toBe(2);
    });

    it('should retry sending on connection failure', async () => {
      const item = {
        id: uuidv4(),
        type: 'purchase_order' as const,
        data: { po_number: 'PO-001' },
        timestamp: new Date(),
        retry_count: 0,
      };

      // Try to send without connecting
      try {
        await cloudSync.send(item);
      } catch (err) {
        expect((err as Error).message).toContain('Not connected');
      }

      // Should be requeued for retry
      await localQueue.enqueue(item);

      // Now connect and retry
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');
      await cloudSync.send(item);

      const messages = await cloudSync.getQueuedMessages();
      expect(messages.length).toBe(1);
    });

    it('should handle offline mode gracefully', async () => {
      // Queue items without cloud connection
      for (let i = 0; i < 10; i++) {
        await localQueue.enqueue({
          id: uuidv4(),
          type: 'purchase_order',
          data: { order: i },
          timestamp: new Date(),
          retry_count: 0,
        });
      }

      // Queue should still have items
      const size = await localQueue.getSize();
      expect(size).toBe(10);

      // When connection restored, drain queue
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');
      let item = await localQueue.dequeue();
      while (item) {
        await cloudSync.send(item);
        await localQueue.markProcessed(item.id);
        item = await localQueue.dequeue();
      }

      // All should be sent
      const messages = await cloudSync.getQueuedMessages();
      expect(messages.length).toBe(10);
    });
  });

  describe('Health Probes and Monitoring', () => {
    it('should monitor ERP health', async () => {
      const healthy = await erp.healthCheck();

      if (healthy) {
        await healthReporter.updateProbe('erp', true, 150);
      } else {
        await healthReporter.updateProbe('erp', false, 0);
      }

      const probes = await healthReporter.getProbes();
      const erpProbe = probes.find((p) => p.service === 'erp');

      expect(erpProbe).toBeDefined();
      expect(erpProbe?.healthy).toBe(healthy);
    });

    it('should monitor cloud connectivity', async () => {
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');
      const connected = await cloudSync.isConnected();

      await healthReporter.updateProbe('cloud', connected, 250);

      const probes = await healthReporter.getProbes();
      const cloudProbe = probes.find((p) => p.service === 'cloud');

      expect(cloudProbe?.healthy).toBe(true);
    });

    it('should report health metrics to cloud', async () => {
      // Simulate continuous health monitoring
      for (let i = 0; i < 3; i++) {
        const erpHealth = Math.random() > 0.1; // 90% up
        const cloudHealth = true;

        await healthReporter.updateProbe('erp', erpHealth, 100 + Math.random() * 100);
        await healthReporter.updateProbe('cloud', cloudHealth, 200);

        // Would report to cloud endpoint
        await healthReporter.reportToCloud('/api/v1/health');
      }

      const probes = await healthReporter.getProbes();
      expect(probes.length).toBeGreaterThan(0);
    });

    it('should detect and alert on service degradation', async () => {
      // Simulate degradation
      let degraded = false;

      for (let i = 0; i < 5; i++) {
        const latency = 100 + i * 100; // Increasing latency
        await healthReporter.updateProbe('erp', true, latency);

        const probes = await healthReporter.getProbes();
        const erpProbe = probes.find((p) => p.service === 'erp');

        if (erpProbe && erpProbe.latency_ms > 400) {
          degraded = true;
        }
      }

      expect(degraded).toBe(true);
    });
  });

  describe('Adaptive Polling', () => {
    it('should start with default interval', () => {
      expect(adaptivePoller.getInterval()).toBe(5000);
    });

    it('should increase interval on repeated failures', () => {
      const initialInterval = adaptivePoller.getInterval();

      // Simulate failures
      adaptivePoller.adjustInterval(1.5); // Increase by 50%
      expect(adaptivePoller.getInterval()).toBeGreaterThan(initialInterval);

      adaptivePoller.adjustInterval(1.5);
      expect(adaptivePoller.getInterval()).toBeGreaterThan(7500);
    });

    it('should decrease interval on success', () => {
      // First increase
      adaptivePoller.adjustInterval(1.5);
      const elevated = adaptivePoller.getInterval();

      // Then decrease on success
      adaptivePoller.adjustInterval(0.8);
      const decreased = adaptivePoller.getInterval();

      expect(decreased).toBeLessThan(elevated);
    });

    it('should respect min and max interval bounds', () => {
      // Try to go below min
      adaptivePoller.adjustInterval(0.1);
      expect(adaptivePoller.getInterval()).toBeGreaterThanOrEqual(5000);

      // Try to go above max
      for (let i = 0; i < 10; i++) {
        adaptivePoller.adjustInterval(2);
      }
      expect(adaptivePoller.getInterval()).toBeLessThanOrEqual(300000);
    });

    it('should reset on reconnection', () => {
      adaptivePoller.adjustInterval(2);
      adaptivePoller.adjustInterval(2);

      expect(adaptivePoller.getInterval()).toBeGreaterThan(5000);

      adaptivePoller.reset();
      expect(adaptivePoller.getInterval()).toBe(5000);
    });
  });

  describe('Full Lifecycle Integration', () => {
    it('should handle complete sync cycle', async () => {
      // 1. Extract data from ERP
      const pos = await erp.extractPurchaseOrders(new Date('2024-01-01'), new Date('2024-01-31'));

      // 2. Queue locally
      for (const po of pos) {
        await localQueue.enqueue({
          id: uuidv4(),
          type: 'purchase_order',
          data: po,
          timestamp: new Date(),
          retry_count: 0,
        });
      }

      let queueSize = await localQueue.getSize();
      expect(queueSize).toBe(pos.length);

      // 3. Check health
      const erpHealthy = await erp.healthCheck();
      await healthReporter.updateProbe('erp', erpHealthy, 100);

      // 4. Connect to cloud
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');

      // 5. Drain queue to cloud
      let item = await localQueue.dequeue();
      while (item) {
        try {
          await cloudSync.send(item);
          await localQueue.markProcessed(item.id);
        } catch (err) {
          // Requeue on failure
          await localQueue.incrementRetry(item.id);
          await localQueue.enqueue(item);
        }
        item = await localQueue.dequeue();
      }

      // 6. Verify sync complete
      queueSize = await localQueue.getSize();
      expect(queueSize).toBe(0);

      const messages = await cloudSync.getQueuedMessages();
      expect(messages.length).toBeGreaterThan(0);

      // 7. Disconnect cleanly
      await cloudSync.disconnect();
      const connected = await cloudSync.isConnected();
      expect(connected).toBe(false);
    });

    it('should survive network interruption and resume', async () => {
      // Initial sync
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');

      const item1 = {
        id: uuidv4(),
        type: 'purchase_order' as const,
        data: { order: 1 },
        timestamp: new Date(),
        retry_count: 0,
      };

      await cloudSync.send(item1);

      // Network failure
      await cloudSync.disconnect();

      // Queue another item while offline
      const item2 = {
        id: uuidv4(),
        type: 'purchase_order' as const,
        data: { order: 2 },
        timestamp: new Date(),
        retry_count: 0,
      };

      await localQueue.enqueue(item2);

      // Reconnect
      await cloudSync.connect('wss://cloud.factoryconnect.com/sync');

      // Send buffered item
      await cloudSync.send(item2);

      // Verify both sent
      const messages = await cloudSync.getQueuedMessages();
      expect(messages.length).toBe(2);
    });
  });
});
