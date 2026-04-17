/**
 * FactoryConnect Logger — Pino-based with PII redaction.
 * All log output passes through the PII redactor before writing.
 *
 * Usage:
 *   import { createLogger } from '@fc/observability';
 *   const logger = createLogger('api');
 *   logger.info({ orderId: '...' }, 'Order created');
 */
import pino from 'pino';
export interface LoggerOptions {
    /** Service name (e.g., 'api', 'bridge', 'portal') */
    service: string;
    /** Log level — defaults to process.env.LOG_LEVEL or 'info' */
    level?: string;
    /** Disable PII redaction (for testing only) */
    disableRedaction?: boolean;
}
/**
 * Create a Pino logger with PII redaction hooks.
 */
export declare function createLogger(serviceOrOpts: string | LoggerOptions): pino.Logger;
/**
 * Create a child logger with additional context bindings.
 */
export declare function createChildLogger(parent: pino.Logger, bindings: Record<string, unknown>): pino.Logger;
//# sourceMappingURL=logger.d.ts.map