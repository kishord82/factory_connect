/**
 * Claude API Provider
 * Uses Anthropic's Claude model via fetch-based HTTP client
 * C4: Error-code-only LLM — NEVER send factory data
 */

import { FcError } from '../../errors/index.js';
import type { LlmProvider, LlmOptions, LlmResponse } from '../types.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2024-06-01';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  temperature?: number;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicErrorResponse {
  error: {
    type: string;
    message: string;
  };
}

export class ClaudeProvider implements LlmProvider {
  name = 'claude';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    if (!apiKey) {
      throw new FcError(
        'FC_ERR_LLM_CONFIG_INVALID',
        'Claude API key is required',
        { provider: 'claude' },
      );
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(prompt: string, options?: LlmOptions): Promise<LlmResponse> {
    const startTime = Date.now();

    const request: AnthropicRequest = {
      model: this.model,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    if (options?.systemPrompt) {
      request.system = options.systemPrompt;
    }

    if (options?.temperature !== undefined) {
      request.temperature = options.temperature;
    }

    try {
      const response = await this.makeRequest(request);
      const latencyMs = Date.now() - startTime;

      return {
        content: response.content[0].text,
        model: response.model,
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        latency_ms: latencyMs,
        provider: this.name,
      };
    } catch (error) {
      if (error instanceof FcError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new FcError(
          'FC_ERR_LLM_REQUEST_FAILED',
          `Claude API request failed: ${error.message}`,
          { provider: 'claude', originalError: error.message },
        );
      }

      throw new FcError(
        'FC_ERR_LLM_REQUEST_FAILED',
        'Claude API request failed with unknown error',
        { provider: 'claude' },
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const testRequest: AnthropicRequest = {
        model: this.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'ok',
          },
        ],
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(CLAUDE_API_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': ANTHROPIC_API_VERSION,
          },
          body: JSON.stringify(testRequest),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return response.status === 200 || response.status === 400;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      return false;
    }
  }

  private async makeRequest(request: AnthropicRequest): Promise<AnthropicResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as AnthropicErrorResponse;
        throw new FcError(
          'FC_ERR_LLM_API_ERROR',
          `Claude API error: ${errorData.error.message}`,
          {
            provider: 'claude',
            statusCode: response.status,
            errorType: errorData.error.type,
          },
        );
      }

      return (await response.json()) as AnthropicResponse;
    } catch (error) {
      if (error instanceof FcError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new FcError(
            'FC_ERR_LLM_TIMEOUT',
            `Claude API request timed out after ${REQUEST_TIMEOUT_MS}ms`,
            { provider: 'claude' },
          );
        }

        throw new FcError(
          'FC_ERR_LLM_NETWORK_ERROR',
          `Network error: ${error.message}`,
          { provider: 'claude' },
        );
      }

      throw new FcError(
        'FC_ERR_LLM_UNKNOWN_ERROR',
        'Unknown error calling Claude API',
        { provider: 'claude' },
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
