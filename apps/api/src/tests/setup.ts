/**
 * Global test setup for @fc/api.
 * Initializes config and DB pool before tests run; tears down after.
 */

import { createPool, closePool } from '@fc/database';
import { beforeAll, afterAll } from 'vitest';

import { loadConfig } from '../config.js';

// Provide required env vars for tests before config is loaded.
// Use fc_app_rls (non-superuser) so RLS tenant isolation is enforced.
process.env['DATABASE_URL'] ??=
  'postgres://fc_app_rls:fc_password@localhost:5432/factoryconnect?sslmode=disable';
process.env['NODE_ENV'] ??= 'test';
process.env['REDIS_HOST'] ??= 'localhost';
process.env['REDIS_PORT'] ??= '6379';

beforeAll(() => {
  loadConfig();
  createPool({
    connectionString:
      process.env['DATABASE_URL'] ??
      'postgres://fc_app_rls:fc_password@localhost:5432/factoryconnect?sslmode=disable',
  });
});

afterAll(async () => {
  await closePool();
});
