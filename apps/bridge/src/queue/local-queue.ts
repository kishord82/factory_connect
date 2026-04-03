/**
 * D4: Local queue — stores outbound messages when cloud is unreachable.
 * Uses in-memory storage (production uses SQLite).
 */

export interface QueueMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: Date;
  attempts: number;
  last_error?: string;
}

let queue: QueueMessage[] = [];
let messageCounter = 0;

export function enqueue(type: string, payload: Record<string, unknown>): QueueMessage {
  const msg: QueueMessage = {
    id: `msg-${++messageCounter}`,
    type,
    payload,
    created_at: new Date(),
    attempts: 0,
  };
  queue.push(msg);
  return msg;
}

export function dequeue(batchSize: number = 10): QueueMessage[] {
  const batch = queue.slice(0, batchSize);
  queue = queue.slice(batchSize);
  return batch;
}

export function peek(batchSize: number = 10): QueueMessage[] {
  return queue.slice(0, batchSize);
}

export function requeueWithError(msg: QueueMessage, error: string): void {
  msg.attempts++;
  msg.last_error = error;
  queue.push(msg);
}

export function queueSize(): number {
  return queue.length;
}

export function clearQueue(): void {
  queue = [];
  messageCounter = 0;
}

export function getDeadLetters(maxAttempts: number = 5): QueueMessage[] {
  const dead = queue.filter(m => m.attempts >= maxAttempts);
  queue = queue.filter(m => m.attempts < maxAttempts);
  return dead;
}
