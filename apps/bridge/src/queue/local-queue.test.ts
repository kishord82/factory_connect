/**
 * Local queue tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalQueue } from './local-queue.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('LocalQueue', () => {
  let queue: LocalQueue;
  const testDataDir = './test-queue-data';

  beforeEach(async () => {
    // Clean up any previous test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
    await fs.mkdir(testDataDir, { recursive: true });

    queue = new LocalQueue(testDataDir);
    await queue.initialize();
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should initialize queue database', async () => {
    expect(queue).toBeDefined();
    expect(queue.getDepth()).toBe(0);
  });

  it('should enqueue messages', async () => {
    const msg = queue.enqueue('order', { order_id: '123' });

    expect(msg.id).toBeDefined();
    expect(msg.type).toBe('order');
    expect(msg.payload).toEqual({ order_id: '123' });
    expect(msg.attempts).toBe(0);
    expect(queue.getDepth()).toBe(1);
  });

  it('should dequeue messages', async () => {
    queue.enqueue('order', { order_id: '1' });
    queue.enqueue('invoice', { invoice_id: '2' });

    const batch = queue.dequeue(1);

    expect(batch).toHaveLength(1);
    expect(batch[0].type).toBe('order');
    expect(queue.getDepth()).toBe(1);
  });

  it('should respect priority ordering', async () => {
    queue.enqueue('low', { data: 'low' }, 0);
    queue.enqueue('high', { data: 'high' }, 10);
    queue.enqueue('medium', { data: 'medium' }, 5);

    const batch = queue.dequeue(3);

    expect(batch).toHaveLength(3);
    expect(batch[0].payload).toEqual({ data: 'high' });
    expect(batch[1].payload).toEqual({ data: 'medium' });
    expect(batch[2].payload).toEqual({ data: 'low' });
  });

  it('should mark message complete', async () => {
    const msg = queue.enqueue('order', { order_id: '123' });
    expect(queue.getDepth()).toBe(1);

    queue.markComplete(msg.id);
    expect(queue.getDepth()).toBe(0);
  });

  it('should mark message failed and requeue', async () => {
    const msg = queue.enqueue('order', { order_id: '123' });
    const originalId = msg.id;

    queue.markFailed(originalId, 'Network timeout', 3);
    expect(queue.getDepth()).toBe(1); // Still in queue for retry

    const batch = queue.dequeue(1);
    expect(batch).toHaveLength(1);
    expect(batch[0].attempts).toBe(1);
    expect(batch[0].last_error).toBe('Network timeout');
  });

  it('should move to dead letter after max retries', async () => {
    const msg = queue.enqueue('order', { order_id: '123' });

    // Fail 5 times (reaching max retries)
    for (let i = 0; i < 5; i++) {
      queue.markFailed(msg.id, 'Persistent error', 5);
    }

    const batch = queue.dequeue(1);
    expect(batch).toHaveLength(0); // No more pending, moved to dead letter

    const deadLetters = queue.getDeadLetters(5);
    expect(deadLetters.length).toBeGreaterThan(0);
  });

  it('should persist queue to disk', async () => {
    queue.enqueue('order', { order_id: '123' });
    await queue.persist();

    // Verify file was created
    const dbPath = path.join(testDataDir, 'queue.db');
    const stat = await fs.stat(dbPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('should recover queue from disk', async () => {
    queue.enqueue('order', { order_id: '123' });
    await queue.persist();

    // Create new queue instance from same path
    const queue2 = new LocalQueue(testDataDir);
    await queue2.initialize();

    const batch = queue2.dequeue(1);
    expect(batch).toHaveLength(1);
    expect(batch[0].payload).toEqual({ order_id: '123' });
  });

  it('should cleanup old completed messages', async () => {
    queue.enqueue('order', { order_id: '123' });
    const msg = queue.dequeue(1)[0];
    queue.markComplete(msg.id);

    // Cleanup should remove old entries (age > 0 days)
    queue.cleanup(0);

    expect(queue.getDepth()).toBe(0);
  });

  it('should retrieve dead letters', async () => {
    const msg = queue.enqueue('order', { order_id: '123' });

    // Force to dead letter by failing 5 times
    for (let i = 0; i < 5; i++) {
      queue.markFailed(msg.id, 'Persistent error', 5);
    }

    const deadLetters = queue.getDeadLetters(5);
    expect(deadLetters.length).toBeGreaterThan(0);
  });
});
