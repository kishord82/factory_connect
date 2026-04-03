/**
 * HTTP request/response logger middleware using pino-http.
 * Integrates with Express.js and applies PII redaction.
 */

import type pino from 'pino';
import type { IncomingMessage, ServerResponse } from 'node:http';

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
export async function createHttpLogger(opts: HttpLoggerOptions) {
  // pino-http uses `export =` which requires this import pattern in ESM
  const pinoHttpModule = await import('pino-http');
  const pinoHttp = pinoHttpModule.default ?? pinoHttpModule;

  const ignorePaths = new Set(opts.ignorePaths ?? ['/health', '/ready']);

  return (pinoHttp as unknown as (...args: unknown[]) => unknown)({
    logger: opts.logger,
    autoLogging: {
      ignore(req: IncomingMessage) {
        return ignorePaths.has(req.url ?? '');
      },
    },
    customProps(req: IncomingMessage) {
      const props: Record<string, unknown> = {};
      const anyReq = req as unknown as Record<string, unknown>;
      if (anyReq.correlationId) props.correlationId = anyReq.correlationId;
      if (anyReq.tenantId) props.tenantId = anyReq.tenantId;
      return props;
    },
    customLogLevel(_req: IncomingMessage, res: ServerResponse, err: Error | undefined) {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage(req: IncomingMessage, res: ServerResponse) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage(req: IncomingMessage, _res: ServerResponse, err: Error) {
      return `${req.method} ${req.url} failed: ${err.message}`;
    },
    serializers: {
      req(req: Record<string, unknown>) {
        const headers = (req.headers ?? {}) as Record<string, unknown>;
        return {
          method: req.method,
          url: req.url,
          headers: {
            'content-type': headers['content-type'],
            'user-agent': headers['user-agent'],
            'x-correlation-id': headers['x-correlation-id'],
          },
        };
      },
      res(res: Record<string, unknown>) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  });
}
