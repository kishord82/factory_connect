/**
 * Transaction helpers for FactoryConnect.
 * All write operations MUST use withTransaction() or withTenantTransaction().
 *
 * withTenantTransaction() combines:
 * 1. Acquire client from pool
 * 2. SET LOCAL tenant context (for RLS)
 * 3. BEGIN transaction
 * 4. Execute callback
 * 5. COMMIT (or ROLLBACK on error)
 * 6. Release client
 */

import type pg from 'pg';
import type { RequestContext } from '@fc/shared';
import { getPool } from './pool.js';
import { setTenantContext, clearTenantContext } from './tenant-context.js';

/**
 * Execute a callback inside a PostgreSQL transaction.
 * No tenant context — use for system-level operations.
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a callback inside a tenant-scoped transaction.
 * Sets RLS context before BEGIN, rolls back on error.
 *
 * Usage:
 * ```ts
 * const order = await withTenantTransaction(ctx, async (client) => {
 *   const res = await client.query('INSERT INTO canonical_orders ...');
 *   return res.rows[0];
 * });
 * ```
 */
export async function withTenantTransaction<T>(
  ctx: RequestContext,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await setTenantContext(client, ctx);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await clearTenantContext(client).catch(() => {
      // Best-effort clear; client is being released anyway
    });
    client.release();
  }
}

/**
 * Execute a read-only query with tenant context (no transaction).
 * Use for SELECT queries that don't need transactional guarantees.
 */
export async function withTenantClient<T>(
  ctx: RequestContext,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await setTenantContext(client, ctx);
    return await fn(client);
  } finally {
    await clearTenantContext(client).catch(() => {});
    client.release();
  }
}
