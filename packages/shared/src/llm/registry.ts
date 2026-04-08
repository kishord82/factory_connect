/**
 * LLM Provider Registry with Circuit Breaker
 * C4: Error-code-only LLM — NEVER send factory data to LLM
 */

import { FcError } from '../errors/index.js';

import type {
  LlmProvider,
  LlmProviderConfig,
  LlmOptions,
  LlmResponse,
  CircuitBreakerState,
} from './types.js';

interface ProviderEntry {
  provider: LlmProvider;
  config: LlmProviderConfig;
  circuitBreaker: CircuitBreakerState;
}

const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 0.6;
const DEFAULT_CIRCUIT_BREAKER_RESET_MS = 5 * 60 * 1000; // 5 minutes

export class LlmRegistry {
  private providers: Map<string, ProviderEntry> = new Map();
  private usageLogger?: (usage: Record<string, unknown>) => Promise<void>;

  constructor(usageLogger?: (usage: Record<string, unknown>) => Promise<void>) {
    this.usageLogger = usageLogger;
  }

  registerProvider(config: LlmProviderConfig, provider: LlmProvider): void {
    if (this.providers.has(config.name)) {
      throw new FcError(
        'FC_ERR_LLM_PROVIDER_EXISTS',
        `Provider ${config.name} is already registered`,
        { providerName: config.name },
      );
    }

    const circuitBreaker: CircuitBreakerState = {
      failures: 0,
      successCount: 0,
      state: 'closed',
      lastFailureTime: 0,
    };

    this.providers.set(config.name, {
      provider,
      config,
      circuitBreaker,
    });
  }

  async generate(prompt: string, options?: LlmOptions): Promise<LlmResponse> {
    const sortedProviders = Array.from(this.providers.values())
      .filter((entry) => entry.config.isEnabled)
      .sort((a, b) => a.config.priority - b.config.priority);

    if (sortedProviders.length === 0) {
      throw new FcError(
        'FC_ERR_LLM_NO_PROVIDERS',
        'No LLM providers available',
        {},
      );
    }

    for (const entry of sortedProviders) {
      if (!this.isCircuitBreakerOpen(entry)) {
        try {
          const startTime = Date.now();
          const response = await entry.provider.generate(prompt, options);
          const latencyMs = Date.now() - startTime;

          this.recordSuccess(entry);

          if (this.usageLogger) {
            await this.usageLogger({
              provider: entry.config.name,
              model: response.model,
              tokens_used: response.tokens_used || 0,
              latency_ms: latencyMs,
              timestamp: new Date().toISOString(),
            }).catch(() => {
              // Silently fail — don't let logging errors break the flow
            });
          }

          return {
            ...response,
            latency_ms: latencyMs,
          };
        } catch {
          this.recordFailure(entry);
          // Continue to next provider
        }
      }
    }

    // All providers failed or circuit breakers are open
    throw new FcError(
      'FC_ERR_LLM_ALL_PROVIDERS_DOWN',
      'All LLM providers are unavailable',
      {
        attempted_providers: sortedProviders.map((e) => e.config.name),
      },
    );
  }

  private isCircuitBreakerOpen(entry: ProviderEntry): boolean {
    const cb = entry.circuitBreaker;

    if (cb.state === 'closed') {
      return false;
    }

    if (cb.state === 'open') {
      const resetTimeMs = entry.config.circuitBreaker?.resetTimeMs ??
        DEFAULT_CIRCUIT_BREAKER_RESET_MS;
      const timeSinceLastFailure = Date.now() - cb.lastFailureTime;

      if (timeSinceLastFailure >= resetTimeMs) {
        cb.state = 'half-open';
        cb.failures = 0;
        return false;
      }

      return true;
    }

    // half-open state: allow one attempt
    return false;
  }

  private recordSuccess(entry: ProviderEntry): void {
    const cb = entry.circuitBreaker;
    cb.successCount += 1;
    cb.failures = 0;

    if (cb.state === 'half-open') {
      cb.state = 'closed';
    }
  }

  private recordFailure(entry: ProviderEntry): void {
    const cb = entry.circuitBreaker;
    cb.failures += 1;
    cb.lastFailureTime = Date.now();

    const totalAttempts = cb.failures + cb.successCount;
    const failureRate = totalAttempts > 0 ? cb.failures / totalAttempts : 1;
    const threshold = entry.config.circuitBreaker?.threshold ??
      DEFAULT_CIRCUIT_BREAKER_THRESHOLD;

    if (failureRate >= threshold && cb.state !== 'open') {
      cb.state = 'open';
    }

    if (cb.state === 'half-open') {
      cb.state = 'open';
    }
  }

  getProvider(name: string): LlmProvider | undefined {
    return this.providers.get(name)?.provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
