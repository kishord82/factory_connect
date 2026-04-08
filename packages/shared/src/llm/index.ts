/**
 * LLM Provider Registry Barrel Export
 */

import type { CacheClient } from './cache.js';
import { LlmResponseCache } from './cache.js';
import { ClaudeProvider } from './providers/claude-provider.js';
import { HeuristicProvider } from './providers/heuristic-provider.js';
import { LlmRegistry } from './registry.js';
import type {
  LlmProvider,
  LlmProviderConfig,
  LlmOptions,
  LlmResponse,
  CircuitBreakerState,
  ErrorCodeLlmRequest,
  ErrorCodeLlmResponse,
} from './types.js';

export type {
  LlmProvider,
  LlmProviderConfig,
  LlmOptions,
  LlmResponse,
  CircuitBreakerState,
  ErrorCodeLlmRequest,
  ErrorCodeLlmResponse,
};

export { LlmRegistry, ClaudeProvider, HeuristicProvider, LlmResponseCache };
export type { CacheClient, CacheMetrics } from './cache.js';

/**
 * Create default LLM registry with Claude + heuristic providers
 * Requires CLAUDE_API_KEY environment variable or explicit apiKey parameter
 */
export function createDefaultRegistry(options?: {
  claudeApiKey?: string;
  claudeModel?: string;
  enableCache?: boolean;
  cacheClient?: CacheClient;
  cacheTtlSeconds?: number;
}): {
  registry: LlmRegistry;
  cache?: LlmResponseCache;
} {
  const claudeApiKey = options?.claudeApiKey || process.env.CLAUDE_API_KEY;

  const registry = new LlmRegistry();

  // Register Claude provider (if API key is available)
  if (claudeApiKey) {
    const claudeProvider = new ClaudeProvider(
      claudeApiKey,
      options?.claudeModel,
    );

    registry.registerProvider(
      {
        name: 'claude',
        apiKey: claudeApiKey,
        model: options?.claudeModel || 'claude-haiku-4-5-20251001',
        priority: 0,
        isEnabled: true,
        circuitBreaker: {
          threshold: 0.6,
          resetTimeMs: 5 * 60 * 1000,
        },
      },
      claudeProvider,
    );
  }

  // Register heuristic provider as fallback
  const heuristicProvider = new HeuristicProvider();
  registry.registerProvider(
    {
      name: 'heuristic',
      apiKey: '',
      model: 'heuristic',
      priority: 100, // Lowest priority — fallback only
      isEnabled: true,
    },
    heuristicProvider,
  );

  let cache: LlmResponseCache | undefined;

  if (options?.enableCache && options?.cacheClient) {
    cache = new LlmResponseCache(
      options.cacheClient,
      options.cacheTtlSeconds,
    );
  }

  return { registry, cache };
}
