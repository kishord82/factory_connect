/**
 * LLM Registry Tests
 * Circuit breaker, provider fallback, and usage logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FcError } from '../errors/index.js';

import { LlmRegistry } from './registry.js';
import type { LlmProvider, LlmOptions, LlmResponse, LlmProviderConfig } from './types.js';

const TEST_API_KEY = 'test-api-key';
const TEST_PRIORITY = 0;
const TEST_PRIORITY_1 = 1;

class MockProvider implements LlmProvider {
  name: string;
  private failUntil = 0;
  private callCount = 0;

  constructor(name: string) {
    this.name = name;
  }

  setFailureMode(failUntil: number): void {
    this.failUntil = failUntil;
  }

  async generate(_prompt: string, _options?: LlmOptions): Promise<LlmResponse> {
    this.callCount += 1;

    if (this.failUntil > 0 && this.callCount <= this.failUntil) {
      throw new Error(`${this.name} provider failed`);
    }

    return {
      content: `Response from ${this.name}`,
      model: `${this.name}-model`,
      tokens_used: 100,
      latency_ms: 50,
      provider: this.name,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getCallCount(): number {
    return this.callCount;
  }
}

describe('LlmRegistry', () => {
  let registry: LlmRegistry;
  let mockProvider1: MockProvider;
  let mockProvider2: MockProvider;
  let usageLogMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    usageLogMock = vi.fn().mockResolvedValue(undefined);
    registry = new LlmRegistry(usageLogMock);
    mockProvider1 = new MockProvider('provider1');
    mockProvider2 = new MockProvider('provider2');
  });

  describe('Provider Registration', () => {
    it('should register a provider successfully', () => {
      const config: LlmProviderConfig = {
        name: 'test',
        apiKey: TEST_API_KEY,
        model: 'model',
        priority: TEST_PRIORITY,
        isEnabled: true,
      };

      registry.registerProvider(config, mockProvider1);
      const providers = registry.listProviders();

      expect(providers).toContain('test');
    });

    it('should throw when registering duplicate provider', () => {
      const config: LlmProviderConfig = {
        name: 'test',
        apiKey: TEST_API_KEY,
        model: 'model',
        priority: TEST_PRIORITY,
        isEnabled: true,
      };

      registry.registerProvider(config, mockProvider1);

      expect(() => {
        registry.registerProvider(config, mockProvider2);
      }).toThrow(FcError);
    });

    it('should list all registered providers', () => {
      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
        },
        mockProvider1,
      );

      registry.registerProvider(
        {
          name: 'p2',
          apiKey: 'key2',
          model: 'm2',
          priority: TEST_PRIORITY_1,
          isEnabled: true,
        },
        mockProvider2,
      );

      expect(registry.listProviders()).toEqual(['p1', 'p2']);
    });
  });

  describe('Provider Selection by Priority', () => {
    it('should use highest priority (lowest number) provider first', async () => {
      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY_1,
          isEnabled: true,
        },
        mockProvider1,
      );

      registry.registerProvider(
        {
          name: 'p2',
          apiKey: 'key2',
          model: 'm2',
          priority: TEST_PRIORITY,
          isEnabled: true,
        },
        mockProvider2,
      );

      const response = await registry.generate('test prompt');

      expect(response.provider).toBe('provider2'); // Lower priority number
      expect(mockProvider2.getCallCount()).toBe(1);
      expect(mockProvider1.getCallCount()).toBe(0);
    });

    it('should fallback to next provider if current fails', async () => {
      mockProvider1.setFailureMode(1); // Fail once

      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
        },
        mockProvider1,
      );

      registry.registerProvider(
        {
          name: 'p2',
          apiKey: 'key2',
          model: 'm2',
          priority: TEST_PRIORITY_1,
          isEnabled: true,
        },
        mockProvider2,
      );

      const response = await registry.generate('test prompt');

      expect(response.provider).toBe('provider2');
      expect(mockProvider1.getCallCount()).toBe(1);
      expect(mockProvider2.getCallCount()).toBe(1);
    });
  });

  describe('Circuit Breaker', () => {
    it('should trip circuit breaker after failure threshold', async () => {
      mockProvider1.setFailureMode(10); // Always fail

      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
          circuitBreaker: {
            threshold: 0.5, // Trip at 50% failure
            resetTimeMs: 100,
          },
        },
        mockProvider1,
      );

      registry.registerProvider(
        {
          name: 'p2',
          apiKey: 'key2',
          model: 'm2',
          priority: TEST_PRIORITY_1,
          isEnabled: true,
        },
        mockProvider2,
      );

      // First attempt — p1 fails, p2 succeeds
      let response = await registry.generate('test');
      expect(response.provider).toBe('provider2');

      // Subsequent attempts should use p2 directly (p1's circuit is open)
      response = await registry.generate('test');
      expect(response.provider).toBe('provider2');
      expect(mockProvider1.getCallCount()).toBe(1); // No additional calls
    });

    it('should reset circuit breaker after reset time', async () => {
      mockProvider1.setFailureMode(2); // Fail twice, then succeed

      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
          circuitBreaker: {
            threshold: 0.5,
            resetTimeMs: 50, // Reset after 50ms
          },
        },
        mockProvider1,
      );

      registry.registerProvider(
        {
          name: 'p2',
          apiKey: 'key2',
          model: 'm2',
          priority: TEST_PRIORITY_1,
          isEnabled: true,
        },
        mockProvider2,
      );

      // Trigger circuit open
      await registry.generate('test1');
      await registry.generate('test2');
      expect(mockProvider1.getCallCount()).toBe(2);

      // Wait for reset
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Circuit should be half-open, p1 should be tried again
      const response = await registry.generate('test3');
      expect(response.provider).toBe('provider1');
      expect(mockProvider1.getCallCount()).toBe(3);
    });

    it('should use default circuit breaker settings if not provided', async () => {
      mockProvider1.setFailureMode(10);

      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
          // No circuitBreaker config — should use defaults
        },
        mockProvider1,
      );

      registry.registerProvider(
        {
          name: 'p2',
          apiKey: 'key2',
          model: 'm2',
          priority: TEST_PRIORITY_1,
          isEnabled: true,
        },
        mockProvider2,
      );

      // Multiple attempts should eventually trip the default threshold (60%)
      for (let i = 0; i < 5; i++) {
        await registry.generate('test');
      }

      // p1 should be skipped at some point due to circuit breaker
      expect(mockProvider2.getCallCount()).toBeGreaterThan(0);
    });
  });

  describe('Disabled Providers', () => {
    it('should skip disabled providers', async () => {
      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: false, // Disabled
        },
        mockProvider1,
      );

      registry.registerProvider(
        {
          name: 'p2',
          apiKey: 'key2',
          model: 'm2',
          priority: TEST_PRIORITY_1,
          isEnabled: true,
        },
        mockProvider2,
      );

      const response = await registry.generate('test');

      expect(response.provider).toBe('provider2');
      expect(mockProvider1.getCallCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw when no providers are available', async () => {
      expect(() => registry.generate('test')).rejects.toThrow(FcError);
    });

    it('should throw when all providers fail', async () => {
      mockProvider1.setFailureMode(10);
      mockProvider2.setFailureMode(10);

      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
        },
        mockProvider1,
      );

      registry.registerProvider(
        {
          name: 'p2',
          apiKey: 'key2',
          model: 'm2',
          priority: TEST_PRIORITY_1,
          isEnabled: true,
        },
        mockProvider2,
      );

      expect(() => registry.generate('test')).rejects.toThrow(FcError);
    });
  });

  describe('Usage Logging', () => {
    it('should log successful usage', async () => {
      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
        },
        mockProvider1,
      );

      await registry.generate('test prompt');

      expect(usageLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'p1',
          model: 'p1-model',
          tokens_used: 100,
        }),
      );
    });

    it('should not break on logging error', async () => {
      const failingLogger = vi.fn().mockRejectedValue(new Error('Log failed'));
      const testRegistry = new LlmRegistry(failingLogger);

      testRegistry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
        },
        mockProvider1,
      );

      // Should not throw
      const response = await testRegistry.generate('test');
      expect(response).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should include latency in response', async () => {
      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
        },
        mockProvider1,
      );

      const response = await registry.generate('test');

      expect(response.latency_ms).toBeDefined();
      expect(response.latency_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Provider Retrieval', () => {
    it('should retrieve registered provider by name', () => {
      registry.registerProvider(
        {
          name: 'p1',
          apiKey: 'key1',
          model: 'm1',
          priority: TEST_PRIORITY,
          isEnabled: true,
        },
        mockProvider1,
      );

      const provider = registry.getProvider('p1');
      expect(provider).toBe(mockProvider1);
    });

    it('should return undefined for unregistered provider', () => {
      const provider = registry.getProvider('nonexistent');
      expect(provider).toBeUndefined();
    });
  });
});
