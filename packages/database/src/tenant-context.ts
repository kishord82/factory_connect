/**
 * Tenant context management for RLS.
 * Sets PostgreSQL session variables used by RLS policies.
 *
 * Every query in a tenant-scoped request MUST run inside setTenantContext()
 * or withTenantTransaction() to ensure RLS filters correctly.
 */

import type { RequestContext } from '@fc/shared';
import type pg from 'pg';

/**
 * Set session-level tenant context on a client connection.
 * Must be called before any tenant-scoped query.
 */
export async function setTenantContext(
  client: pg.PoolClient,
  ctx: RequestContext,
): Promise<void> {
  // Use is_local=false (session-level) so the setting persists across
  // multiple client.query() calls on the same connection. is_local=true
  // (transaction-local) reverts between statements when no transaction is active.
  await client.query(
    `SELECT
      set_config('app.current_tenant', $1, false),
      set_config('app.current_user', $2, false),
      set_config('app.correlation_id', $3, false)`,
    [ctx.tenantId, ctx.userId, ctx.correlationId],
  );
}

/**
 * Clear tenant context — resets session variables.
 * Called automatically when client is released.
 */
export async function clearTenantContext(client: pg.PoolClient): Promise<void> {
  await client.query(
    `SELECT
      set_config('app.current_tenant', '', false),
      set_config('app.current_user', '', false),
      set_config('app.correlation_id', '', false)`,
  );
}
