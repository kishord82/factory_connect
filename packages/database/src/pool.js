/**
 * PostgreSQL connection pool for FactoryConnect.
 * Singleton pool with health check support.
 */
import pg from 'pg';
const { Pool } = pg;
const DEFAULT_CONFIG = {
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statementTimeout: 30_000,
};
let pool = null;
export function createPool(config) {
    if (pool)
        return pool;
    pool = new Pool({
        connectionString: config.connectionString,
        max: config.max ?? DEFAULT_CONFIG.max,
        idleTimeoutMillis: config.idleTimeoutMillis ?? DEFAULT_CONFIG.idleTimeoutMillis,
        connectionTimeoutMillis: config.connectionTimeoutMillis ?? DEFAULT_CONFIG.connectionTimeoutMillis,
        statement_timeout: config.statementTimeout ?? DEFAULT_CONFIG.statementTimeout,
    });
    pool.on('error', (err) => {
        // Pool-level errors are logged by the observability layer
        console.error('Unexpected pool error:', err.message);
    });
    return pool;
}
export function getPool() {
    if (!pool) {
        throw new Error('Database pool not initialized. Call createPool() first.');
    }
    return pool;
}
export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
export async function healthCheck() {
    try {
        const p = getPool();
        const result = await p.query('SELECT 1 AS ok');
        return result.rows[0]?.ok === 1;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=pool.js.map