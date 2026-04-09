/**
 * Settings routes — users, feature flags, config, notifications, audit log.
 * Provides tenant-scoped settings management for the portal Settings page.
 */

import { Router } from 'express';
import { z } from 'zod';
import { FcError } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantClient, withTenantTransaction, findMany, paginatedQuery, insertOne } from '@fc/database';

export const settingsRouter = Router();
settingsRouter.use(authenticate, tenantContext);

// ═══════════════════════════════════════════════════════════════════
// USERS — dev-mode: returns known dev users for the current tenant
// ═══════════════════════════════════════════════════════════════════

interface DevUser {
  id: string;
  email: string;
  name: string;
  role: string;
  factory_id: string;
  created_at: string;
}

/**
 * Dev-mode user list per tenant.
 * In production, this would query Keycloak or a users table.
 */
const DEV_USER_LIST: DevUser[] = [
  {
    id: 'user-rajesh-admin-001',
    email: 'admin@rajeshtextiles.in',
    name: 'Rajesh Admin',
    role: 'factory_admin',
    factory_id: 'a0000000-0000-0000-0000-000000000001',
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'user-rajesh-operator-001',
    email: 'operator@rajeshtextiles.in',
    name: 'Rajesh Operator',
    role: 'factory_operator',
    factory_id: 'a0000000-0000-0000-0000-000000000001',
    created_at: '2025-01-20T10:00:00Z',
  },
  {
    id: 'user-rajesh-viewer-001',
    email: 'viewer@rajeshtextiles.in',
    name: 'Rajesh Viewer',
    role: 'factory_viewer',
    factory_id: 'a0000000-0000-0000-0000-000000000001',
    created_at: '2025-02-01T10:00:00Z',
  },
  {
    id: 'user-sunrise-admin-001',
    email: 'admin@sunriseauto.in',
    name: 'Sunrise Admin',
    role: 'factory_admin',
    factory_id: 'b0000000-0000-0000-0000-000000000002',
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'user-sunrise-operator-001',
    email: 'operator@sunriseauto.in',
    name: 'Sunrise Operator',
    role: 'factory_operator',
    factory_id: 'b0000000-0000-0000-0000-000000000002',
    created_at: '2025-01-20T10:00:00Z',
  },
  {
    id: 'user-gujpharma-admin-001',
    email: 'admin@gujpharma.in',
    name: 'Gujarat Pharma Admin',
    role: 'factory_admin',
    factory_id: 'c0000000-0000-0000-0000-000000000003',
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'user-fc-admin-001',
    email: 'admin@factoryconnect.io',
    name: 'FC Platform Admin',
    role: 'fc_admin',
    factory_id: 'a0000000-0000-0000-0000-000000000001',
    created_at: '2025-01-01T10:00:00Z',
  },
];

settingsRouter.get('/users', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    // In dev mode, filter by tenant; fc_admin sees all
    const users = ctx.role === 'fc_admin'
      ? DEV_USER_LIST
      : DEV_USER_LIST.filter((u) => u.factory_id === ctx.tenantId);

    res.json({ data: users, total: users.length });
  } catch (err) { next(err); }
});

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.string().min(1),
});

settingsRouter.post('/users/invite', validate({ body: InviteSchema }), async (req, res, next) => {
  try {
    // Dev stub — in production this would call Keycloak to create user
    const { email, role } = req.body as z.infer<typeof InviteSchema>;
    res.status(201).json({
      data: { message: `Invite sent to ${email} with role ${role}` },
    });
  } catch (err) { next(err); }
});

const UserIdParams = z.object({ id: z.string().min(1) });

settingsRouter.delete('/users/:id', validate({ params: UserIdParams }), async (req, res, next) => {
  try {
    // Dev stub — in production this would deactivate user in Keycloak
    res.json({ data: { message: 'User removed' } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════

settingsRouter.get('/feature-flags', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const flags = await withTenantClient(ctx, async (client: PoolClient) => {
      return findMany(
        client,
        `SELECT flag_name, is_enabled, description, updated_at
         FROM platform.feature_flags
         ORDER BY flag_name ASC`,
        [],
      );
    });
    res.json({ data: flags });
  } catch (err) { next(err); }
});

const FlagUpdateSchema = z.object({
  is_enabled: z.boolean(),
});

settingsRouter.put('/feature-flags/:flag', validate({ body: FlagUpdateSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const flagName = req.params.flag;
    const { is_enabled } = req.body as z.infer<typeof FlagUpdateSchema>;
    await withTenantTransaction(ctx, async (client: PoolClient) => {
      await client.query(
        `UPDATE platform.feature_flags SET is_enabled = $1, updated_at = NOW() WHERE flag_name = $2`,
        [is_enabled, flagName],
      );
    });
    res.json({ data: { flag_name: flagName, is_enabled } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════
// TENANT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

settingsRouter.get('/config', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const config = await withTenantClient(ctx, async (client: PoolClient) => {
      return findMany(
        client,
        `SELECT id, config_key AS config_name, config_value::text AS config_value,
                description, created_at, updated_at
         FROM platform.app_config
         ORDER BY config_key ASC`,
        [],
      );
    });
    // Map to include tenant_id for frontend compatibility
    const mapped = config.map((c: Record<string, unknown>) => ({
      ...c,
      tenant_id: ctx.tenantId,
    }));
    res.json({ data: mapped });
  } catch (err) { next(err); }
});

const ConfigCreateSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});

settingsRouter.post('/config', validate({ body: ConfigCreateSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { name, value } = req.body as z.infer<typeof ConfigCreateSchema>;
    const result = await withTenantTransaction(ctx, async (client: PoolClient) => {
      return insertOne(
        client,
        `INSERT INTO platform.app_config (config_key, config_value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (config_key) DO UPDATE SET config_value = $2::jsonb, updated_at = NOW()
         RETURNING id, config_key AS config_name, config_value::text AS config_value, created_at, updated_at`,
        [name, JSON.stringify(value)],
      );
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════════════════════

settingsRouter.get('/notifications', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const prefs = await withTenantClient(ctx, async (client: PoolClient) => {
      return findMany(
        client,
        `SELECT id, event_type, channel, is_enabled AS enabled
         FROM platform.notification_templates
         WHERE factory_id = $1
         ORDER BY event_type ASC`,
        [ctx.tenantId],
      );
    });
    // If no per-tenant preferences exist, return defaults
    if (prefs.length === 0) {
      const defaultPrefs = [
        { id: 'default-1', event_type: 'ORDER_CREATED', channel: 'EMAIL', enabled: true },
        { id: 'default-2', event_type: 'ORDER_CONFIRMED', channel: 'EMAIL', enabled: true },
        { id: 'default-3', event_type: 'SHIPMENT_DISPATCHED', channel: 'EMAIL', enabled: true },
        { id: 'default-4', event_type: 'INVOICE_ISSUED', channel: 'EMAIL', enabled: true },
        { id: 'default-5', event_type: 'PAYMENT_RECEIVED', channel: 'IN_APP', enabled: true },
        { id: 'default-6', event_type: 'SLA_WARNING', channel: 'EMAIL', enabled: true },
        { id: 'default-7', event_type: 'CIRCUIT_BREAKER_OPEN', channel: 'EMAIL', enabled: true },
      ];
      res.json({ data: defaultPrefs });
      return;
    }
    res.json({ data: prefs });
  } catch (err) { next(err); }
});

const NotifUpdateSchema = z.object({
  enabled: z.boolean(),
});

settingsRouter.patch('/notifications/:id', validate({ body: NotifUpdateSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const prefId = req.params.id;
    const { enabled } = req.body as z.infer<typeof NotifUpdateSchema>;

    // Skip update for default (in-memory) preferences
    if (prefId.startsWith('default-')) {
      res.json({ data: { id: prefId, enabled } });
      return;
    }

    await withTenantTransaction(ctx, async (client: PoolClient) => {
      await client.query(
        `UPDATE platform.notification_templates SET is_enabled = $1, updated_at = NOW() WHERE id = $2`,
        [enabled, prefId],
      );
    });
    res.json({ data: { id: prefId, enabled } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════

settingsRouter.get('/audit', async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      return paginatedQuery(
        client,
        `SELECT id, action, user_id AS actor, entity_type AS resource_type,
                entity_id AS resource_id, changes, created_at
         FROM audit.audit_log
         WHERE factory_id = $1
         ORDER BY created_at DESC`,
        [ctx.tenantId],
        page,
        pageSize,
      );
    });
    res.json(result);
  } catch (err) { next(err); }
});
