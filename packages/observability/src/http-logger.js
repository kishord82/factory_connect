/**
 * HTTP request/response logger middleware using pino-http.
 * Integrates with Express.js and applies PII redaction.
 */
/**
 * Create pino-http middleware for Express.
 * Logs request/response with correlation ID and tenant context.
 *
 * Uses dynamic import to handle pino-http's CJS export.
 */
export async function createHttpLogger(opts) {
    // pino-http uses `export =` which requires this import pattern in ESM
    const pinoHttpModule = await import('pino-http');
    const pinoHttp = pinoHttpModule.default ?? pinoHttpModule;
    const ignorePaths = new Set(opts.ignorePaths ?? ['/health', '/ready']);
    return pinoHttp({
        logger: opts.logger,
        autoLogging: {
            ignore(req) {
                return ignorePaths.has(req.url ?? '');
            },
        },
        customProps(req) {
            const props = {};
            const anyReq = req;
            if (anyReq.correlationId)
                props.correlationId = anyReq.correlationId;
            if (anyReq.tenantId)
                props.tenantId = anyReq.tenantId;
            return props;
        },
        customLogLevel(_req, res, err) {
            if (res.statusCode >= 500 || err)
                return 'error';
            if (res.statusCode >= 400)
                return 'warn';
            return 'info';
        },
        customSuccessMessage(req, res) {
            return `${req.method} ${req.url} ${res.statusCode}`;
        },
        customErrorMessage(req, _res, err) {
            return `${req.method} ${req.url} failed: ${err.message}`;
        },
        serializers: {
            req(req) {
                const headers = (req.headers ?? {});
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
            res(res) {
                return {
                    statusCode: res.statusCode,
                };
            },
        },
    });
}
//# sourceMappingURL=http-logger.js.map