/**
 * TEST-009: FcError structured error tests
 */

import { describe, it, expect } from 'vitest';
import {
  FcError,
  notFoundError,
  validationError,
  authError,
  tenantError,
  featureDisabledError,
} from './index.js';

describe('FcError', () => {
  describe('TEST-009: Structured errors', () => {
    it('creates error with code and message', () => {
      const err = new FcError('FC_ERR_ORDER_NOT_FOUND', 'Order not found', {}, 404);
      expect(err.code).toBe('FC_ERR_ORDER_NOT_FOUND');
      expect(err.message).toBe('Order not found');
      expect(err.statusCode).toBe(404);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(FcError);
    });

    it('serializes to JSON with error wrapper', () => {
      const err = new FcError('FC_ERR_VALIDATION_FAILED', 'Invalid data', { field: 'email' }, 400);
      const json = err.toJSON();
      const errorObj = json.error as Record<string, unknown>;
      expect(errorObj.code).toBe('FC_ERR_VALIDATION_FAILED');
      expect(errorObj.message).toBe('Invalid data');
      expect(errorObj.details).toEqual({ field: 'email' });
    });

    it('defaults to 500 status code', () => {
      const err = new FcError('FC_ERR_INTERNAL', 'Something went wrong');
      expect(err.statusCode).toBe(500);
    });
  });

  describe('Factory functions', () => {
    it('notFoundError creates 404 with entity-specific code', () => {
      const err = notFoundError('Order', '123');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('FC_ERR_ORDER_NOT_FOUND');
      expect(err.message).toContain('Order');
      expect(err.message).toContain('123');
    });

    it('validationError creates 400', () => {
      const err = validationError('Invalid PO number');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('FC_ERR_VALIDATION_FAILED');
    });

    it('authError creates 401', () => {
      const err = authError('Token expired');
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('FC_ERR_AUTH_UNAUTHORIZED');
    });

    it('tenantError creates 403', () => {
      const err = tenantError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FC_ERR_TENANT_NOT_SET');
    });

    it('featureDisabledError creates 403', () => {
      const err = featureDisabledError('returns_processing');
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FC_ERR_FEATURE_DISABLED');
      expect(err.message).toContain('returns_processing');
    });
  });
});
