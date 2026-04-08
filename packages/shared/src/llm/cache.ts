/**
 * Redis-based LLM Response Cache
 * SHA-256 hash of prompt as key, configurable TTL (default 1 hour)
 */

import { createHash } from 'crypto';

import type { LlmResponse } from './types.js';

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expirySeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class LlmResponseCache {
  private client: CacheClient;
  private ttlSeconds: number;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
  };

  constructor(client: CacheClient, ttlSeconds: number = DEFAULT_TTL_SECONDS) {
    this.client = client;
    this.ttlSeconds = ttlSeconds;
  }

  async get(prompt: string): Promise<LlmResponse | null> {
    try {
      const key = this.getKey(prompt);
      const cached = await this.client.get(key);

      if (!cached) {
        this.metrics.misses += 1;
        this.updateHitRate();
        return null;
      }

      this.metrics.hits += 1;
      this.updateHitRate();

      return JSON.parse(cached) as LlmResponse;
    } catch {
      // Silently fail on cache errors
      return null;
    }
  }

  async set(prompt: string, response: LlmResponse): Promise<void> {
    try {
      const key = this.getKey(prompt);
      const value = JSON.stringify(response);
      await this.client.set(key, value, this.ttlSeconds);
    } catch {
      // Silently fail on cache errors
    }
  }

  async delete(prompt: string): Promise<void> {
    try {
      const key = this.getKey(prompt);
      await this.client.delete(key);
    } catch {
      // Silently fail on cache errors
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.clear();
      this.metrics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
      };
    } catch {
      // Silently fail on cache errors
    }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  private getKey(prompt: string): string {
    const hash = createHash('sha256').update(prompt).digest('hex');
    return `llm:cache:${hash}`;
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }
}
