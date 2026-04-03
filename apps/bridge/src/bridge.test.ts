import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptivePoller } from './polling/adaptive-poller.js';
import { enqueue, dequeue, clearQueue, queueSize, getDeadLetters, requeueWithError } from './queue/local-queue.js';
import { HealthReporter } from './health/health-reporter.js';
import { createErpAdapter } from './erp/index.js';

describe('Local Queue', () => {
  beforeEach(() => clearQueue());

  it('enqueues and dequeues messages', () => {
    enqueue('order', { id: '1' });
    enqueue('order', { id: '2' });
    expect(queueSize()).toBe(2);
    const batch = dequeue(1);
    expect(batch).toHaveLength(1);
    expect(queueSize()).toBe(1);
  });

  it('handles dead letters', () => {
    enqueue('order', { id: '1' });
    for (let i = 0; i < 5; i++) {
      requeueWithError(dequeue(1)[0], 'fail');
    }
    const dead = getDeadLetters(5);
    expect(dead).toHaveLength(1);
    expect(queueSize()).toBe(0);
  });
});

describe('Adaptive Poller', () => {
  it('creates poller with default options', () => {
    const poller = new AdaptivePoller(async () => 0);
    expect(poller.interval).toBe(30000);
    expect(poller.isRunning).toBe(false);
  });

  it('starts and stops', async () => {
    const poller = new AdaptivePoller(async () => 0, { initialIntervalMs: 100 });
    await poller.start();
    expect(poller.isRunning).toBe(true);
    poller.stop();
    expect(poller.isRunning).toBe(false);
  });
});

describe('Health Reporter', () => {
  it('reports healthy status', () => {
    const reporter = new HealthReporter('bridge-1', 'factory-1');
    reporter.setErpConnected(true);
    reporter.setCloudConnected(true);
    const status = reporter.getStatus();
    expect(status.status).toBe('healthy');
    expect(status.bridge_id).toBe('bridge-1');
  });

  it('reports degraded when ERP disconnected', () => {
    const reporter = new HealthReporter('bridge-1', 'factory-1');
    reporter.setErpConnected(false);
    reporter.setCloudConnected(true);
    const status = reporter.getStatus();
    expect(status.status).toBe('degraded');
  });

  it('reports unhealthy when both disconnected', () => {
    const reporter = new HealthReporter('bridge-1', 'factory-1');
    reporter.setErpConnected(false);
    reporter.setCloudConnected(false);
    const status = reporter.getStatus();
    expect(status.status).toBe('unhealthy');
  });
});

describe('ERP Adapter Factory', () => {
  it('creates Tally adapter', () => {
    const adapter = createErpAdapter('tally');
    expect(adapter.name).toBe('tally');
  });

  it('creates Zoho adapter', () => {
    const adapter = createErpAdapter('zoho');
    expect(adapter.name).toBe('zoho');
  });

  it('creates SAP B1 adapter', () => {
    const adapter = createErpAdapter('sap_b1');
    expect(adapter.name).toBe('sap_b1');
  });

  it('throws for unknown ERP type', () => {
    expect(() => createErpAdapter('unknown')).toThrow('Unknown ERP type');
  });
});
