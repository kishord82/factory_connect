/**
 * Heuristic Fallback Provider
 * Returns canned error explanations for known FC_ERR codes
 * Always available — final fallback when all LLM providers fail
 * C4: Error-code-only format — maps FC_ERR codes to user-friendly explanations
 */

import type { LlmProvider, LlmOptions, LlmResponse } from '../types.js';

const ERROR_EXPLANATIONS: Record<string, { summary: string; steps: string[] }> = {
  FC_ERR_AUTH_TOKEN_EXPIRED: {
    summary: 'Your authentication token has expired. Please log in again.',
    steps: [
      'Go to the login page',
      'Enter your credentials',
      'Complete multi-factor authentication if enabled',
      'You will be logged back in',
    ],
  },
  FC_ERR_TENANT_NOT_SET: {
    summary: 'Tenant context is missing. This is typically a configuration error.',
    steps: [
      'Verify you are accessing the system through the correct organization',
      'Check that your API request includes valid tenant credentials',
      'If using a custom integration, ensure tenant ID is properly configured',
    ],
  },
  FC_ERR_SAGA_INVALID_TRANSITION: {
    summary: 'The order cannot transition to this state at this time.',
    steps: [
      'Verify the order is in a valid state for this operation',
      'Check the order processing history to understand current progress',
      'If the order is stuck, contact support to review the saga state',
      'Some transitions require previous steps to complete first',
    ],
  },
  FC_ERR_EDI_ENVELOPE_FAIL: {
    summary: 'The EDI message envelope could not be generated.',
    steps: [
      'Verify all required EDI fields are populated in the order',
      'Check that the order format matches the expected schema',
      'Ensure all mandatory segments are present',
      'Try submitting the order again',
    ],
  },
  FC_ERR_MAPPING_FIELD_NOT_FOUND: {
    summary: 'A required field is missing from the source data.',
    steps: [
      'Verify the source system is returning all expected fields',
      'Check the mapping configuration for this field',
      'Ensure the field name matches the source schema exactly',
      'Review the integration logs for data quality issues',
    ],
  },
  FC_ERR_LLM_ALL_PROVIDERS_DOWN: {
    summary: 'All AI services are currently unavailable.',
    steps: [
      'This is a temporary service disruption',
      'Your order will continue processing with rule-based matching',
      'Core functionality is not affected',
      'Please try again in a few moments',
    ],
  },
  FC_ERR_FEATURE_DISABLED: {
    summary: 'This feature is not currently enabled for your organization.',
    steps: [
      'Contact your administrator to enable this feature',
      'Check your plan level — some features require higher tiers',
      'You may need to upgrade your subscription',
    ],
  },
  FC_ERR_VALIDATION_FAILED: {
    summary: 'The data provided failed validation checks.',
    steps: [
      'Review the error details to see which field(s) are invalid',
      'Correct the data according to the field requirements',
      'Ensure all mandatory fields are provided',
      'Try submitting again',
    ],
  },
  FC_ERR_ORDER_NOT_FOUND: {
    summary: 'The requested order could not be found.',
    steps: [
      'Verify the order ID is correct',
      'Check that you have access to this order',
      'Confirm the order has not been deleted',
      'Try refreshing and searching again',
    ],
  },
  FC_ERR_FACTORY_NOT_FOUND: {
    summary: 'The requested factory/organization could not be found.',
    steps: [
      'Verify the organization ID or name is correct',
      'Check that the organization exists in the system',
      'Confirm you have access to this organization',
      'Contact support if the organization should exist',
    ],
  },
  FC_ERR_LLM_REQUEST_FAILED: {
    summary: 'An AI service request encountered an error.',
    steps: [
      'The system will continue with standard processing',
      'Check your internet connection',
      'Try the operation again',
      'If the problem persists, contact support',
    ],
  },
  FC_ERR_LLM_TIMEOUT: {
    summary: 'An AI service request took too long to complete.',
    steps: [
      'The system will retry with a standard fallback',
      'Check your network connection',
      'Try again after a moment',
      'Large requests may take longer to process',
    ],
  },
};

const DEFAULT_EXPLANATION = {
  summary: 'An error occurred processing your request.',
  steps: [
    'Review the error code and details provided',
    'Check if your data is in the correct format',
    'Try the operation again',
    'Contact support if the problem persists',
  ],
};

export class HeuristicProvider implements LlmProvider {
  name = 'heuristic';

  async generate(prompt: string, _options?: LlmOptions): Promise<LlmResponse> {
    const startTime = Date.now();

    // Extract error code from prompt (format: "FC_ERR_XXX_YYY")
    const errorCodeMatch = prompt.match(/FC_ERR_[A-Z_]+/);
    const errorCode = errorCodeMatch?.[0] || 'FC_ERR_UNKNOWN';

    const explanation = ERROR_EXPLANATIONS[errorCode] || DEFAULT_EXPLANATION;

    const stepsFormatted = explanation.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const content = `${explanation.summary}\n\nSteps to resolve:\n${stepsFormatted}`;

    const latencyMs = Date.now() - startTime;

    return {
      content,
      model: 'heuristic',
      tokens_used: content.split(/\s+/).length, // Rough approximation
      latency_ms: latencyMs,
      provider: this.name,
    };
  }

  async isAvailable(): Promise<boolean> {
    // Heuristic provider is always available
    return true;
  }
}
