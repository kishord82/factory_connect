/**
 * Structured error class for FactoryConnect.
 * Format: FC_ERR_{DOMAIN}_{SPECIFIC}
 */
export class FcError extends Error {
    code;
    statusCode;
    details;
    constructor(code, message, details = {}, statusCode = 500) {
        super(message);
        this.name = 'FcError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        // Ensure prototype chain is correct
        Object.setPrototypeOf(this, FcError.prototype);
    }
    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                details: this.details,
            },
        };
    }
}
/**
 * Factory functions for common error types
 */
export function notFoundError(entity, id) {
    return new FcError(`FC_ERR_${entity.toUpperCase()}_NOT_FOUND`, `${entity} with id ${id} not found`, { entity, id }, 404);
}
export function validationError(message, details = {}) {
    return new FcError('FC_ERR_VALIDATION_FAILED', message, details, 400);
}
export function authError(message) {
    return new FcError('FC_ERR_AUTH_UNAUTHORIZED', message, {}, 401);
}
export function tenantError() {
    return new FcError('FC_ERR_TENANT_NOT_SET', 'Tenant context is required', {}, 403);
}
export function featureDisabledError(feature) {
    return new FcError('FC_ERR_FEATURE_DISABLED', `Feature ${feature} is not enabled`, { feature }, 403);
}
//# sourceMappingURL=index.js.map