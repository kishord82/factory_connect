/**
 * HTTP request/response logger middleware using pino-http.
 * Integrates with Express.js and applies PII redaction.
 */
import type pino from 'pino';
export interface HttpLoggerOptions {
    logger: pino.Logger;
    /** Paths to skip logging (e.g., health checks) */
    ignorePaths?: string[];
}
/**
 * Create pino-http middleware for Express.
 * Logs request/response with correlation ID and tenant context.
 *
 * Uses dynamic import to handle pino-http's CJS export.
 */
export declare function createHttpLogger(opts: HttpLoggerOptions): Promise<unknown>;
//# sourceMappingURL=http-logger.d.ts.map