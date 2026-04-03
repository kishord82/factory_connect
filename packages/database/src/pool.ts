/**
 * PostgreSQL connection pool for FactoryConnect.
 * Singleton pool with health check support.
 */

import pg from 'pg';

const { Pool } = pg;

export interface PoolConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statementTimeout?: number;
}

const DEFAULT_CONFIG: Partial<PoolConfig> = {
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statementTimeout: 30_000,
};

let pool: pg.Pool | null = null;

export function createPool(config: PoolConfig): pg.Pool {
  if (pool) return pool;

  pool = new Pool({
    connectionString: config.connectionString,
    max: config.max ?? DEFAULT_CONFIG.max,
    idleTimeoutMillis: config.idleTimeoutMillis ?? DEFAULT_CONFIG.idleTimeoutMillis,
    connectionTimeoutMillis:
      config.connectionTimeoutMillis ?? DEFAULT_CONFIG.connectionTimeoutMillis,
    statement_timeout: config.statementTimeout ?? DEFAULT_CONFIG.statementTimeout,
  });

  pool.on('error', (err: Error) => {
    // Pool-level errors are logged by the observability layer
    console.error('Unexpected pool error:', err.message);
  });

  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createPool() first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const p = getPool();
    const result = await p.query('SELECT 1 AS ok');
    return result.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}
