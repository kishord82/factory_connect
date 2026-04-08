/**
 * Tenant context management for RLS.
 * Sets PostgreSQL session variables used by RLS policies.
 *
 * Every query in a tenant-scoped request MUST run inside setTenantContext()
 * or withTenantTransaction() to ensure RLS filters correctly.
 */
/**
 * Set session-level tenant context on a client connection.
 * Must be called before any tenant-scoped query.
 */
export async function setTenantContext(client, ctx) {
    await client.query(`SELECT
      set_config('app.current_tenant', $1, true),
      set_config('app.current_user', $2, true),
      set_config('app.correlation_id', $3, true)`, [ctx.tenantId, ctx.userId, ctx.correlationId]);
}
/**
 * Clear tenant context — resets session variables.
 * Called automatically when client is released.
 */
export async function clearTenantContext(client) {
    await client.query(`SELECT
      set_config('app.current_tenant', '', true),
      set_config('app.current_user', '', true),
      set_config('app.correlation_id', '', true)`);
}
//# sourceMappingURL=tenant-context.js.map