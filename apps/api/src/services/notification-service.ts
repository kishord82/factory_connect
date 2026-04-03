/**
 * B19-B20: Notification service — in-memory event bus + notification creation.
 */
import type { RequestContext } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, paginatedQuery } from '@fc/database';
import type { PaginatedResult } from '@fc/database';
import { createLogger } from '@fc/observability';

const logger = createLogger('notifications');

interface NotificationRow {
  id: string;
  factory_id: string;
  user_id: string | null;
  channel: string;
  severity: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: Date;
}

type NotificationListener = (notification: NotificationRow) => void;

const listeners = new Map<string, Set<NotificationListener>>();

export function subscribe(tenantId: string, listener: NotificationListener): () => void {
  if (!listeners.has(tenantId)) {
    listeners.set(tenantId, new Set());
  }
  listeners.get(tenantId)!.add(listener);
  return () => {
    listeners.get(tenantId)?.delete(listener);
  };
}

function broadcast(tenantId: string, notification: NotificationRow): void {
  const subs = listeners.get(tenantId);
  if (subs) {
    for (const listener of subs) {
      try {
        listener(notification);
      } catch (err) {
        logger.error({ err }, 'Notification listener error');
      }
    }
  }
}

export async function createNotification(
  ctx: RequestContext,
  data: {
    channel: string;
    severity: string;
    title: string;
    body: string;
    entity_type?: string;
    entity_id?: string;
    user_id?: string;
  },
): Promise<NotificationRow> {
  const notification = await withTenantTransaction(ctx, async (client) => {
    return insertOne<NotificationRow>(
      client,
      `INSERT INTO notifications (factory_id, user_id, channel, severity, title, body, entity_type, entity_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        ctx.tenantId,
        data.user_id ?? ctx.userId,
        data.channel,
        data.severity,
        data.title,
        data.body,
        data.entity_type ?? null,
        data.entity_id ?? null,
      ],
    );
  });
  broadcast(ctx.tenantId, notification);
  return notification;
}

export async function listNotifications(
  ctx: RequestContext,
  page: number,
  pageSize: number,
  unreadOnly: boolean = false,
): Promise<PaginatedResult<NotificationRow>> {
  return withTenantClient(ctx, async (client) => {
    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: unknown[] = [ctx.userId];
    if (unreadOnly) {
      sql += ' AND is_read = false';
    }
    sql += ' ORDER BY created_at DESC';
    return paginatedQuery<NotificationRow>(client, sql, params, page, pageSize);
  });
}

export async function markAsRead(ctx: RequestContext, notificationIds: string[]): Promise<number> {
  return withTenantTransaction(ctx, async (client) => {
    const result = await client.query(
      'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = ANY($1) AND user_id = $2',
      [notificationIds, ctx.userId],
    );
    return result.rowCount ?? 0;
  });
}
