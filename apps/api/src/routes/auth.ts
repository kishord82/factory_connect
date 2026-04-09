/**
 * Auth routes — dev-mode login endpoint.
 * In production, authentication is handled by Keycloak.
 * In dev/test, this provides a simple login endpoint that issues HS256 JWTs.
 */

import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validate.js';
import { getPool } from '@fc/database';
import { FcError } from '@fc/shared';
import { getConfig } from '../config.js';

export const authRouter = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Dev-mode user mapping.
 * Maps email to factory_id and role for JWT generation.
 * In production, Keycloak handles authentication and role assignment.
 */
const DEV_USERS: Record<
  string,
  { password: string; role: string; factory_id: string; sub: string }
> = {
  // Factory Admin users (one per test tenant)
  'admin@rajeshtextiles.in': {
    password: 'factory123',
    role: 'factory_admin',
    factory_id: 'a0000000-0000-0000-0000-000000000001',
    sub: 'user-rajesh-admin-001',
  },
  'admin@sunriseauto.in': {
    password: 'factory123',
    role: 'factory_admin',
    factory_id: 'b0000000-0000-0000-0000-000000000002',
    sub: 'user-sunrise-admin-001',
  },
  'admin@gujpharma.in': {
    password: 'factory123',
    role: 'factory_admin',
    factory_id: 'c0000000-0000-0000-0000-000000000003',
    sub: 'user-gujpharma-admin-001',
  },
  // Factory Operator users (read + limited write)
  'operator@rajeshtextiles.in': {
    password: 'operator123',
    role: 'factory_operator',
    factory_id: 'a0000000-0000-0000-0000-000000000001',
    sub: 'user-rajesh-operator-001',
  },
  'operator@sunriseauto.in': {
    password: 'operator123',
    role: 'factory_operator',
    factory_id: 'b0000000-0000-0000-0000-000000000002',
    sub: 'user-sunrise-operator-001',
  },
  // Factory Viewer users (read-only)
  'viewer@rajeshtextiles.in': {
    password: 'viewer123',
    role: 'factory_viewer',
    factory_id: 'a0000000-0000-0000-0000-000000000001',
    sub: 'user-rajesh-viewer-001',
  },
  // FC Platform Admin (cross-tenant)
  'admin@factoryconnect.io': {
    password: 'fcadmin123',
    role: 'fc_admin',
    factory_id: 'a0000000-0000-0000-0000-000000000001', // Default context; can impersonate any
    sub: 'user-fc-admin-001',
  },
  // CA Firm Admin (compliance platform)
  'ca_admin@demo.in': {
    password: 'cademo123',
    role: 'ca_admin',
    factory_id: 'ca000000-0000-0000-0000-000000000001', // ca_firm_id used as factory_id for RLS
    sub: 'user-ca-admin-001',
  },
  // CA Firm Staff
  'ca_staff@demo.in': {
    password: 'cademo123',
    role: 'ca_staff',
    factory_id: 'ca000000-0000-0000-0000-000000000001',
    sub: 'user-ca-staff-001',
  },
};

/** POST /auth/login — issue dev JWT */
authRouter.post('/login', validate({ body: LoginSchema }), async (req, res, next) => {
  try {
    const config = getConfig();

    if (config.NODE_ENV === 'production') {
      throw new FcError(
        'FC_ERR_AUTH_NOT_SUPPORTED',
        'Direct login not supported in production. Use Keycloak SSO.',
        {},
        400,
      );
    }

    const { email, password } = req.body as z.infer<typeof LoginSchema>;
    const devUser = DEV_USERS[email];

    if (!devUser || devUser.password !== password) {
      throw new FcError('FC_ERR_AUTH_INVALID_CREDENTIALS', 'Invalid email or password', {}, 401);
    }

    // Check if this is a CA user
    const isCaUser = devUser.role === 'ca_admin' || devUser.role === 'ca_staff';

    // Lookup name — use SET LOCAL to satisfy RLS
    let displayName = 'Unknown';
    try {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', devUser.factory_id]);
        if (isCaUser) {
          const caResult = await client.query(
            'SELECT id, name FROM compliance.ca_firms WHERE id = $1',
            [devUser.factory_id],
          );
          displayName = caResult.rows[0]?.name || 'CA Firm';
        } else {
          const factoryResult = await client.query(
            'SELECT id, name, slug FROM core.factories WHERE id = $1',
            [devUser.factory_id],
          );
          displayName = factoryResult.rows[0]?.name || 'Factory';
        }
        await client.query('COMMIT');
      } catch (innerErr) {
        console.error('[auth] DB name lookup inner error:', innerErr);
        await client.query('ROLLBACK').catch(() => {});
      } finally {
        client.release();
      }
    } catch (outerErr) {
      console.error('[auth] DB name lookup outer error:', outerErr);
      // DB lookup is non-critical for auth; proceed with default name
    }

    const secret = process.env.JWT_SECRET || 'fc-dev-secret-do-not-use-in-prod';
    const tokenPayload: Record<string, unknown> = {
      sub: devUser.sub,
      factory_id: devUser.factory_id,
      role: devUser.role,
      email,
      factory_name: displayName,
      iss: 'http://localhost:8080/realms/factoryconnect',
      aud: 'fc-api',
    };
    if (isCaUser) {
      tokenPayload.ca_firm_id = devUser.factory_id;
    }
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '8h' });

    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 28800,
      role: devUser.role,
      factory_name: displayName,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /auth/me — return current user info */
authRouter.get('/me', async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new FcError('FC_ERR_AUTH_TOKEN_MISSING', 'Authorization header required', {}, 401);
    }
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET || 'fc-dev-secret-do-not-use-in-prod';
    const decoded = jwt.verify(token, secret) as Record<string, unknown>;
    res.json({ data: decoded });
  } catch (err) {
    next(err);
  }
});
