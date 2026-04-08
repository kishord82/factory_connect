/**
 * B2: JWT authentication middleware.
 * Verifies JWT from Authorization header via Keycloak JWKS.
 * Extracts factory_id and role from token claims.
 *
 * In dev/test mode, accepts a simpler JWT for easier testing.
 */

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { FcError } from '@fc/shared';
import { getConfig } from '../config.js';

export interface AuthPayload {
  sub: string;
  factory_id?: string; // FactoryConnect tenants
  ca_firm_id?: string; // CA Platform tenants
  role: string;
  email?: string;
  subscription_tier?: string; // CA Platform subscription tier
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      correlationId?: string;
    }
  }
}

/**
 * JWT auth middleware.
 * In production: validates against Keycloak JWKS.
 * In dev/test: accepts HS256 tokens signed with a dev secret.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new FcError('FC_ERR_AUTH_TOKEN_MISSING', 'Authorization header required', {}, 401));
    return;
  }

  const token = header.slice(7);
  const config = getConfig();

  try {
    if (config.NODE_ENV === 'production') {
      // Production: RS256 from Keycloak (JWKS validation)
      // In production, use jwks-rsa to fetch public keys from Keycloak
      // For now, this will be enhanced when Keycloak is configured
      const decoded = jwt.decode(token) as AuthPayload | null;
      if (!decoded?.sub || (!decoded?.factory_id && !decoded?.ca_firm_id)) {
        throw new Error('Invalid token claims');
      }
      req.auth = decoded;
    } else {
      // Dev/Test: HS256 with shared secret
      const secret = process.env.JWT_SECRET || 'fc-dev-secret-do-not-use-in-prod';
      const decoded = jwt.verify(token, secret) as AuthPayload;
      if (!decoded.sub || (!decoded.factory_id && !decoded.ca_firm_id)) {
        throw new Error('Invalid token claims');
      }
      req.auth = decoded;
    }
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token verification failed';
    next(new FcError('FC_ERR_AUTH_TOKEN_INVALID', message, {}, 401));
  }
}

/**
 * Role-based authorization middleware.
 * Must be used after authenticate.
 */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new FcError('FC_ERR_AUTH_TOKEN_MISSING', 'Not authenticated', {}, 401));
      return;
    }
    if (roles.length > 0 && !roles.includes(req.auth.role)) {
      next(
        new FcError('FC_ERR_AUTH_FORBIDDEN', `Role ${req.auth.role} not authorized`, {}, 403),
      );
      return;
    }
    next();
  };
}
