/**
 * @fc/database — Database package for FactoryConnect.
 * Provides pool management, tenant context, transactions, and query helpers.
 */

export { createPool, getPool, closePool, healthCheck } from './pool.js';
export type { PoolConfig } from './pool.js';

export { setTenantContext, clearTenantContext } from './tenant-context.js';

export {
  withTransaction,
  withTenantTransaction,
  withTenantClient,
} from './transaction.js';

export {
  paginatedQuery,
  insertOne,
  findOne,
  findMany,
  buildWhereClause,
} from './query.js';
export type { PaginatedResult } from './query.js';

// Re-export pg types for consumers
export type { PoolClient } from 'pg';
