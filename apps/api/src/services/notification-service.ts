/**
 * B19-B20: Notification service — in-memory event bus + notification creation.
 */
import type { RequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { withTenantTransaction, withTenantClient, insertOne, paginatedQuery } from '@fc/database';
import type { PaginatedResult } from '@fc/database';
import { buildSearchWhere, buildOrderBy } from '../utils/pagination.js';

const NOTIFICATION_SORT_COLUMNS = ['created_at', 'severity', 'channel'];
const NOTIFICATION_SEARCH_COLUMNS = ['n.title', 'n.body', 'n.channel'];
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
  const notification = await withTenantTransaction(ctx, async (client: PoolClient) => {
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
  search: string = '',
  sort: string = 'created_at',
  order: 'asc' | 'desc' = 'desc',
): Promise<PaginatedResult<NotificationRow>> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const params: unknown[] = [ctx.userId];
    const conditions = ['n.user_id = $1'];
    let idx = 2;

    if (unreadOnly) { conditions.push('n.is_read = false'); }

    const { clause: searchClause, values: searchValues, nextIndex } = buildSearchWhere(
      search, NOTIFICATION_SEARCH_COLUMNS, idx,
    );
    if (searchClause) { conditions.push(searchClause); params.push(...searchValues); idx = nextIndex; }

    const orderBy = buildOrderBy(sort, order, NOTIFICATION_SORT_COLUMNS);

    return paginatedQuery<NotificationRow>(
      client,
      `SELECT n.id, n.factory_id, n.user_id, n.channel, n.severity,
              n.title, n.body, n.entity_type, n.entity_id, n.is_read, n.created_at
       FROM platform.notifications n
       WHERE ${conditions.join(' AND ')} ${orderBy}`,
      params, page, pageSize,
    );
  });
}

export async function markAsRead(ctx: RequestContext, notificationIds: string[]): Promise<number> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const result = await client.query(
      'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = ANY($1) AND user_id = $2',
      [notificationIds, ctx.userId],
    );
    return result.rowCount ?? 0;
  });
}
