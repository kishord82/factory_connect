/**
 * Structured error class for FactoryConnect.
 * Format: FC_ERR_{DOMAIN}_{SPECIFIC}
 */
export class FcError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details: Record<string, unknown> = {},
    statusCode = 500,
  ) {
    super(message);
    this.name = 'FcError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Ensure prototype chain is correct
    Object.setPrototypeOf(this, FcError.prototype);
  }

  toJSON(): Record<string, unknown> {
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
export function notFoundError(entity: string, id: string): FcError {
  return new FcError(
    `FC_ERR_${entity.toUpperCase()}_NOT_FOUND`,
    `${entity} with id ${id} not found`,
    { entity, id },
    404,
  );
}

export function validationError(message: string, details: Record<string, unknown> = {}): FcError {
  return new FcError('FC_ERR_VALIDATION_FAILED', message, details, 400);
}

export function authError(message: string): FcError {
  return new FcError('FC_ERR_AUTH_UNAUTHORIZED', message, {}, 401);
}

export function tenantError(): FcError {
  return new FcError('FC_ERR_TENANT_NOT_SET', 'Tenant context is required', {}, 403);
}

export function featureDisabledError(feature: string): FcError {
  return new FcError(
    'FC_ERR_FEATURE_DISABLED',
    `Feature ${feature} is not enabled`,
    { feature },
    403,
  );
}
