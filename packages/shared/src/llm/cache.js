/**
 * Redis-based LLM Response Cache
 * SHA-256 hash of prompt as key, configurable TTL (default 1 hour)
 */
import { createHash } from 'crypto';
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
export class LlmResponseCache {
    client;
    ttlSeconds;
    metrics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
    };
    constructor(client, ttlSeconds = DEFAULT_TTL_SECONDS) {
        this.client = client;
        this.ttlSeconds = ttlSeconds;
    }
    async get(prompt) {
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
            return JSON.parse(cached);
        }
        catch {
            // Silently fail on cache errors
            return null;
        }
    }
    async set(prompt, response) {
        try {
            const key = this.getKey(prompt);
            const value = JSON.stringify(response);
            await this.client.set(key, value, this.ttlSeconds);
        }
        catch {
            // Silently fail on cache errors
        }
    }
    async delete(prompt) {
        try {
            const key = this.getKey(prompt);
            await this.client.delete(key);
        }
        catch {
            // Silently fail on cache errors
        }
    }
    async clear() {
        try {
            await this.client.clear();
            this.metrics = {
                hits: 0,
                misses: 0,
                hitRate: 0,
            };
        }
        catch {
            // Silently fail on cache errors
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getKey(prompt) {
        const hash = createHash('sha256').update(prompt).digest('hex');
        return `llm:cache:${hash}`;
    }
    updateHitRate() {
        const total = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
    }
}
//# sourceMappingURL=cache.js.map