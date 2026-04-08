/**
 * Query helpers for FactoryConnect.
 * Thin wrappers around pg for common patterns.
 * NOT an ORM — raw SQL with parameterized queries only.
 */
/**
 * Execute a paginated query.
 * Wraps a base query with COUNT(*) OVER() for total.
 *
 * @param client - pg PoolClient
 * @param baseQuery - SQL without LIMIT/OFFSET (must not end with semicolon)
 * @param params - Query parameters (positional $1, $2, etc.)
 * @param page - 1-based page number
 * @param pageSize - Items per page
 */
export async function paginatedQuery(client, baseQuery, params, page, pageSize) {
    const offset = (page - 1) * pageSize;
    const paramIndex = params.length;
    // Wrap with window function for total count
    const wrappedQuery = `
    SELECT *, COUNT(*) OVER() AS _total_count
    FROM (${baseQuery}) AS _base
    LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
  `;
    const result = await client.query(wrappedQuery, [
        ...params,
        pageSize,
        offset,
    ]);
    const total = result.rows.length > 0 ? parseInt(result.rows[0]._total_count, 10) : 0;
    // Strip _total_count from results
    const data = result.rows.map((row) => {
        const { _total_count, ...rest } = row;
        return rest;
    });
    return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}
/**
 * Execute INSERT and return the first row.
 */
export async function insertOne(client, query, params) {
    const result = await client.query(query, params);
    return result.rows[0];
}
/**
 * Execute SELECT and return first row or null.
 */
export async function findOne(client, query, params) {
    const result = await client.query(query, params);
    return result.rows[0] ?? null;
}
/**
 * Execute SELECT and return all rows.
 */
export async function findMany(client, query, params) {
    const result = await client.query(query, params);
    return result.rows;
}
/**
 * Build a simple WHERE clause from a filter object.
 * Skips undefined values. Returns { clause, params, nextIndex }.
 */
export function buildWhereClause(filters, startIndex = 1) {
    const conditions = [];
    const params = [];
    let idx = startIndex;
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined)
            continue;
        conditions.push(`${key} = $${idx}`);
        params.push(value);
        idx++;
    }
    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params, nextIndex: idx };
}
//# sourceMappingURL=query.js.map