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
/**
 * Create a Pino logger with PII redaction hooks.
 */
export function createLogger(serviceOrOpts) {
    const opts = typeof serviceOrOpts === 'string' ? { service: serviceOrOpts } : serviceOrOpts;
    const level = opts.level ?? process.env.LOG_LEVEL ?? 'info';
    const enableRedaction = !opts.disableRedaction;
    const logger = pino({
        name: opts.service,
        level,
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
            level(label) {
                return { level: label };
            },
            log(obj) {
                if (!enableRedaction)
                    return obj;
                return redactValue(obj);
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
                return method.apply(this, inputArgs);
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
export function createChildLogger(parent, bindings) {
    return parent.child(bindings);
}
//# sourceMappingURL=logger.js.map