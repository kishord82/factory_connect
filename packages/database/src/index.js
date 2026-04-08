/**
 * @fc/database — Database package for FactoryConnect.
 * Provides pool management, tenant context, transactions, and query helpers.
 */
export { createPool, getPool, closePool, healthCheck } from './pool.js';
export { setTenantContext, clearTenantContext } from './tenant-context.js';
export { withTransaction, withTenantTransaction, withTenantClient, } from './transaction.js';
export { paginatedQuery, insertOne, findOne, findMany, buildWhereClause, } from './query.js';
//# sourceMappingURL=index.js.map