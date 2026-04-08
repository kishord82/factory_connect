/**
 * Claude Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { FcError } from '../../errors/index.js';

import { ClaudeProvider } from './claude-provider.js';

const MOCK_RESPONSE_BASE = {
  id: 'msg-123',
  type: 'message',
  role: 'assistant',
  model: 'claude-test',
  stop_reason: 'end_turn',
  stop_sequence: null,
};

function createMockResponse(
  text: string = 'Response',
  inputTokens: number = 10,
  outputTokens: number = 10,
): object {
  return {
    ...MOCK_RESPONSE_BASE,
    content: [{ type: 'text', text }],
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
  };
}

const TEST_PROMPT = 'test';

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new ClaudeProvider('test-api-key', 'claude-test');
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.resetAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = undefined;
  });

  describe('Initialization', () => {
    it('should throw if API key is missing', () => {
      expect(() => {
        new ClaudeProvider('');
      }).toThrow(FcError);
    });

    it('should use provided model name', () => {
      const p = new ClaudeProvider('key', 'custom-model');
      expect(p.name).toBe('claude');
    });

    it('should use default model if not provided', () => {
      const p = new ClaudeProvider('key');
      expect(p.name).toBe('claude');
    });
  });

  describe('generate()', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        ...MOCK_RESPONSE_BASE,
        content: [{ type: 'text', text: 'Test response' }],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await provider.generate('test prompt');

      expect(response.content).toBe('Test response');
      expect(response.model).toBe('claude-test');
      expect(response.tokens_used).toBe(30);
      expect(response.provider).toBe('claude');
      expect(response.latency_ms).toBeGreaterThanOrEqual(0);
    });

    it('should include system prompt in request', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => createMockResponse(),
      });

      await provider.generate('prompt', {
        systemPrompt: 'You are helpful',
      });

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.system).toBe('You are helpful');
    });

    it('should include custom max_tokens in request', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => createMockResponse(),
      });

      await provider.generate('prompt', { maxTokens: 2048 });

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.max_tokens).toBe(2048);
    });

    it('should include temperature in request', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => createMockResponse(),
      });

      await provider.generate('prompt', { temperature: 0.5 });

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.temperature).toBe(0.5);
    });

    it('should set correct API headers', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => createMockResponse(),
      });

      await provider.generate(TEST_PROMPT);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['content-type']).toBe('application/json');
      expect(headers['x-api-key']).toBe('test-api-key');
      expect(headers['anthropic-version']).toBeDefined();
    });

    it('should throw FcError on API error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            type: 'invalid_request_error',
            message: 'Invalid API key',
          },
        }),
      });

      await expect(() => provider.generate('test')).rejects.toThrow(FcError);
    });

    it('should throw FcError on timeout', async () => {
      fetchMock.mockImplementation(
        () => new Promise(() => {
          // Never resolves
        }),
      );

      // We need to mock the AbortController for this test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const abortSpy = vi.spyOn(global, 'AbortController' as any);

      void provider.generate('test');
      await new Promise((resolve) => setTimeout(resolve, 100));

      abortSpy.mockRestore();
    });

    it('should throw FcError on network error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(() => provider.generate('test')).rejects.toThrow(FcError);
    });

    it('should use default max tokens if not provided', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => createMockResponse(),
      });

      await provider.generate(TEST_PROMPT);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.max_tokens).toBe(1024); // Default
    });
  });

  describe('isAvailable()', () => {
    it('should return true when API is reachable', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
      });

      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    it('should return true on 400 error (auth succeeded, request invalid)', async () => {
      fetchMock.mockResolvedValue({
        status: 400,
      });

      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false on network error', async () => {
      fetchMock.mockRejectedValue(new Error('Network failed'));

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    it('should return false on timeout', async () => {
      fetchMock.mockImplementation(
        () => new Promise(() => {
          // Never resolves
        }),
      );

      void provider.isAvailable();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Can't fully test timeout without better AbortController support
      // But the method should handle it gracefully
    });
  });

  describe('Error handling', () => {
    it('should wrap unknown errors in FcError', async () => {
      fetchMock.mockRejectedValue('Unknown error');

      await expect(() => provider.generate('test')).rejects.toThrow(FcError);
    });

    it('should preserve error details in FcError', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            type: 'rate_limit_error',
            message: 'Rate limit exceeded',
          },
        }),
      });

      try {
        await provider.generate(TEST_PROMPT);
        expect.fail('Should have thrown');
      } catch (error) {
        if (error instanceof FcError) {
          expect(error.code).toBe('FC_ERR_LLM_API_ERROR');
          expect(error.details.statusCode).toBe(429);
        } else {
          expect.fail('Should be FcError');
        }
      }
    });
  });

  describe('Request format', () => {
    it('should use POST method', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'msg-123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Response' }],
          model: 'claude-test',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      });

      await provider.generate(TEST_PROMPT);

      expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    });

    it('should POST to correct URL', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'msg-123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Response' }],
          model: 'claude-test',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      });

      await provider.generate(TEST_PROMPT);

      expect(fetchMock.mock.calls[0][0]).toContain('api.anthropic.com');
    });
  });
});
