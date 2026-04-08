/**
 * LLM Provider Registry Types
 * Error-code-only LLM interface (C4): NEVER send factory data, only error codes + language
 */

export interface LlmOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LlmResponse {
  content: string;
  model: string;
  tokens_used?: number;
  latency_ms?: number;
  provider: string;
}

export interface LlmProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  priority: number; // Lower number = higher priority
  isEnabled: boolean;
  circuitBreaker?: {
    threshold: number; // Failure percentage threshold (0-1)
    resetTimeMs: number;
  };
}

export interface LlmProvider {
  name: string;
  generate(prompt: string, options?: LlmOptions): Promise<LlmResponse>;
  isAvailable(): Promise<boolean>;
}

export interface CircuitBreakerState {
  failures: number;
  successCount: number;
  state: 'closed' | 'open' | 'half-open';
  lastFailureTime: number;
}

/**
 * C4: Error-Code-Only LLM Request/Response
 * NEVER send factory data, PII, or sensitive information
 */
export interface ErrorCodeLlmRequest {
  error_code: string;
  language?: string;
  context?: {
    domain?: string;
    timestamp?: number;
  };
}

export interface ErrorCodeLlmResponse {
  summary: string;
  steps?: string[];
  retry_allowed?: boolean;
  error_code: string;
}
