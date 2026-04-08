/**
 * D4: Local queue — stores outbound messages when cloud is unreachable.
 * Uses SQLite (sql.js) for persistence.
 */
import initSqlJs from 'sql.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface QueueMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: Date;
  attempts: number;
  last_error?: string;
  priority: number;
}

export class LocalQueue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any = null;
  private dbPath: string;
  private initialized = false;

  constructor(dataDir: string = './data') {
    this.dbPath = path.join(dataDir, 'queue.db');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SQL = await (initSqlJs as any)();
    let data: Uint8Array | undefined;

    try {
      const buffer = await fs.readFile(this.dbPath);
      data = new Uint8Array(buffer);
    } catch {
      // File doesn't exist yet
    }

    this.db = new SQL.Database(data);
    this.createTables();
    this.initialized = true;
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS queue_messages (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        priority INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_queue_priority_created
      ON queue_messages(priority DESC, created_at ASC)
      WHERE completed_at IS NULL
    `);
  }

  async persist(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const data = this.db.export();
    const buffer = Buffer.from(data);
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.writeFile(this.dbPath, buffer);
  }

  enqueue(type: string, payload: Record<string, unknown>, priority: number = 0): QueueMessage {
    if (!this.db) throw new Error('Database not initialized');

    const id = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const createdAt = Date.now();
    const payloadJson = JSON.stringify(payload);

    this.db.run(
      `INSERT INTO queue_messages (id, type, payload, created_at, attempts, priority)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [id, type, payloadJson, createdAt, priority]
    );

    return {
      id,
      type,
      payload,
      created_at: new Date(createdAt),
      attempts: 0,
      priority,
    };
  }

  dequeue(batchSize: number = 10): QueueMessage[] {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      `SELECT id, type, payload, created_at, attempts, last_error, priority
       FROM queue_messages
       WHERE completed_at IS NULL
       ORDER BY priority DESC, created_at ASC
       LIMIT ?`,
      [batchSize]
    );

    if (result.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = result[0].values as Array<Array<any>>;
    return rows.map(row => ({
      id: row[0] as string,
      type: row[1] as string,
      payload: JSON.parse(row[2] as string) as Record<string, unknown>,
      created_at: new Date(row[3] as number),
      attempts: row[4] as number,
      last_error: (row[5] as string | null) || undefined,
      priority: row[6] as number,
    }));
  }

  markComplete(id: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `UPDATE queue_messages SET completed_at = ? WHERE id = ?`,
      [Date.now(), id]
    );
  }

  markFailed(id: string, error: string, maxRetries: number = 5): void {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      `SELECT attempts FROM queue_messages WHERE id = ?`,
      [id]
    );

    if (result.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attempts = ((result[0].values[0] as Array<any>)[0] as number) + 1;

    if (attempts >= maxRetries) {
      // Move to dead letter
      this.db.run(
        `UPDATE queue_messages SET attempts = ?, last_error = ?, completed_at = ? WHERE id = ?`,
        [attempts, error, Date.now(), id]
      );
    } else {
      // Requeue with backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), 60000); // Cap at 60s
      const nextAttemptAt = Date.now() + backoffMs;

      this.db.run(
        `UPDATE queue_messages SET attempts = ?, last_error = ?, created_at = ? WHERE id = ?`,
        [attempts, error, nextAttemptAt, id]
      );
    }
  }

  getDepth(): number {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      `SELECT COUNT(*) FROM queue_messages WHERE completed_at IS NULL`
    );

    if (result.length === 0) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result[0].values[0] as Array<any>)[0] as number;
  }

  cleanup(olderThanDays: number = 7): number {
    if (!this.db) throw new Error('Database not initialized');

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Delete old completed messages
    this.db.run(
      `DELETE FROM queue_messages WHERE completed_at IS NOT NULL AND completed_at < ?`,
      [cutoffTime]
    );

    // Return affected row count (approximate, sql.js doesn't expose this directly)
    return 0;
  }

  getDeadLetters(maxAttempts: number = 5): QueueMessage[] {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      `SELECT id, type, payload, created_at, attempts, last_error, priority
       FROM queue_messages
       WHERE attempts >= ? AND completed_at IS NOT NULL
       ORDER BY created_at DESC`,
      [maxAttempts]
    );

    if (result.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = result[0].values as Array<Array<any>>;
    return rows.map(row => ({
      id: row[0] as string,
      type: row[1] as string,
      payload: JSON.parse(row[2] as string) as Record<string, unknown>,
      created_at: new Date(row[3] as number),
      attempts: row[4] as number,
      last_error: (row[5] as string | null) || undefined,
      priority: row[6] as number,
    }));
  }
}

// Global instance
let globalQueue: LocalQueue | null = null;

export async function initializeQueue(dataDir?: string): Promise<LocalQueue> {
  if (globalQueue) return globalQueue;

  globalQueue = new LocalQueue(dataDir);
  await globalQueue.initialize();
  return globalQueue;
}

export function getQueue(): LocalQueue {
  if (!globalQueue) throw new Error('Queue not initialized — call initializeQueue() first');
  return globalQueue;
}

// Legacy convenience functions (for backward compatibility)
export function enqueue(type: string, payload: Record<string, unknown>): QueueMessage {
  return getQueue().enqueue(type, payload);
}

export function dequeue(batchSize?: number): QueueMessage[] {
  return getQueue().dequeue(batchSize);
}

export function peek(batchSize?: number): QueueMessage[] {
  return getQueue().dequeue(batchSize ?? 10);
}

export function requeueWithError(msg: QueueMessage, error: string): void {
  getQueue().markFailed(msg.id, error);
}

export function queueSize(): number {
  return getQueue().getDepth();
}

export function clearQueue(): void {
  if (!globalQueue) return;
  globalQueue = null;
}

export function getDeadLetters(maxAttempts?: number): QueueMessage[] {
  return getQueue().getDeadLetters(maxAttempts);
}
