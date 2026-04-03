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
import { redactString, redactValue } from './pii-redactor.js';

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
export function createLogger(serviceOrOpts: string | LoggerOptions): pino.Logger {
  const opts: LoggerOptions =
    typeof serviceOrOpts === 'string' ? { service: serviceOrOpts } : serviceOrOpts;

  const level = opts.level ?? process.env.LOG_LEVEL ?? 'info';
  const enableRedaction = !opts.disableRedaction;

  const logger = pino({
    name: opts.service,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label: string) {
        return { level: label };
      },
      log(obj: Record<string, unknown>) {
        if (!enableRedaction) return obj;
        return redactValue(obj) as Record<string, unknown>;
      },
    },
    hooks: {
      logMethod(inputArgs, method) {
        if (enableRedaction) {
          // inputArgs can be [msg], [obj, msg], or [obj, msg, ...interpolation]
          if (typeof inputArgs[0] === 'string') {
            inputArgs[0] = redactString(inputArgs[0]);
          }
          if (inputArgs.length >= 2 && typeof inputArgs[1] === 'string') {
            inputArgs[1] = redactString(inputArgs[1]);
          }
        }
        return method.apply(this, inputArgs as Parameters<typeof method>);
      },
    },
    base: {
      service: opts.service,
      pid: process.pid,
    },
  });

  return logger;
}

/**
 * Create a child logger with additional context bindings.
 */
export function createChildLogger(
  parent: pino.Logger,
  bindings: Record<string, unknown>,
): pino.Logger {
  return parent.child(bindings);
}
