/**
 * CA-C3: Document collection and auto-chase service.
 * Manages document requests, verification, and reminder scheduling.
 */

import type { RequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import {
  withTenantTransaction,
  withTenantClient,
  insertOne,
  findOne,
  findMany,
  paginatedQuery,
  buildWhereClause,
} from '@fc/database';
import type { PaginatedResult, PoolClient } from '@fc/database';
import { createLogger } from '@fc/observability';

const logger = createLogger('doc-request-service');

interface DocumentRequest {
  id: string;
  ca_firm_id: string;
  client_id: string;
  document_type: string;
  period: string;
  due_date: Date;
  channel: string;
  status: string;
  received_at: Date | null;
  verified_at: Date | null;
  verified_by: string | null;
  reminder_count: number;
  last_reminder_at: Date | null;
  max_reminders: number;
  created_at: Date;
  updated_at: Date;
}

interface DocumentRequestCreateInput {
  client_id: string;
  document_type: string;
  period: string;
  due_date: Date;
  channel?: 'whatsapp' | 'email';
  description?: string;
}

interface DocumentCollectionDashboard {
  total: number;
  pending: number;
  sent: number;
  received: number;
  verified: number;
  expired: number;
  overdueCount: number;
}

interface DocumentRequestFilters {
  status?: string;
  client_id?: string;
  document_type?: string;
  due_date_from?: Date;
  due_date_to?: Date;
}

/**
 * Create a new document request for a client.
 * Sends initial notification via WhatsApp/email.
 */
export async function createDocumentRequest(
  ctx: RequestContext,
  data: DocumentRequestCreateInput,
): Promise<DocumentRequest> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Verify client exists and belongs to firm
    const clientExists = await findOne<{ id: string }>(
      client,
      `SELECT id FROM clients WHERE ca_firm_id = $1 AND id = $2`,
      [(ctx as any).caFirmId, data.client_id],
    );

    if (!clientExists) {
      throw new FcError(
        'FC_ERR_CLIENT_NOT_FOUND',
        `Client ${data.client_id} not found`,
        { clientId: data.client_id },
        404,
      );
    }

    // Check for duplicate request (same client + type + period)
    const existing = await findOne<DocumentRequest>(
      client,
      `SELECT * FROM document_requests
       WHERE ca_firm_id = $1 AND client_id = $2 AND document_type = $3 AND period = $4`,
      [(ctx as any).caFirmId, data.client_id, data.document_type, data.period],
    );

    if (existing) {
      throw new FcError(
        'FC_ERR_DOCUMENT_REQUEST_DUPLICATE',
        `Document request already exists for ${data.document_type}/${data.period}`,
        { documentType: data.document_type, period: data.period },
        409,
      );
    }

    const request = await insertOne<DocumentRequest>(
      client,
      `INSERT INTO document_requests (
        ca_firm_id, client_id, document_type, period, due_date, channel,
        status, reminder_count, max_reminders
      ) VALUES ($1, $2, $3, $4, $5, $6, 'sent', 0, 3)
      RETURNING *`,
      [
        (ctx as any).caFirmId,
        data.client_id,
        data.document_type,
        data.period,
        data.due_date,
        data.channel || 'whatsapp',
      ],
    );

    logger.info(
      { requestId: request.id, clientId: data.client_id, documentType: data.document_type },
      'Document request created',
    );

    return request;
  });
}

/**
 * List document requests with pagination and filters.
 */
export async function listDocumentRequests(
  ctx: RequestContext,
  filters: DocumentRequestFilters = {},
  page: number = 1,
  pageSize: number = 20,
): Promise<PaginatedResult<DocumentRequest>> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const dbFilters: Record<string, unknown> = {
      ca_firm_id: (ctx as any).caFirmId,
    };

    if (filters.status) dbFilters.status = filters.status;
    if (filters.client_id) dbFilters.client_id = filters.client_id;
    if (filters.document_type) dbFilters.document_type = filters.document_type;

    const { clause, params, nextIndex } = buildWhereClause(dbFilters);
    let sql = `SELECT * FROM document_requests ${clause}`;

    if (filters.due_date_from && filters.due_date_to) {
      const and = clause ? ' AND' : ' WHERE';
      sql += `${and} due_date >= $${nextIndex} AND due_date <= $${nextIndex + 1}`;
      params.push(filters.due_date_from, filters.due_date_to);
    }

    sql += ' ORDER BY created_at DESC';

    return paginatedQuery<DocumentRequest>(client, sql, params, page, pageSize);
  });
}

/**
 * Mark a document request as verified.
 */
export async function verifyDocument(
  ctx: RequestContext,
  requestId: string,
  verifiedBy: string,
): Promise<DocumentRequest> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const existing = await findOne<DocumentRequest>(
      client,
      `SELECT * FROM document_requests WHERE id = $1 AND ca_firm_id = $2`,
      [requestId, (ctx as any).caFirmId],
    );

    if (!existing) {
      throw new FcError(
        'FC_ERR_DOCUMENT_REQUEST_NOT_FOUND',
        `Document request ${requestId} not found`,
        { requestId },
        404,
      );
    }

    if (existing.status === 'verified') {
      throw new FcError(
        'FC_ERR_DOCUMENT_ALREADY_VERIFIED',
        'Document is already verified',
        { requestId },
        400,
      );
    }

    if (existing.received_at === null) {
      throw new FcError(
        'FC_ERR_DOCUMENT_NOT_RECEIVED',
        'Cannot verify document that has not been received',
        { requestId },
        400,
      );
    }

    const updated = await insertOne<DocumentRequest>(
      client,
      `UPDATE document_requests SET status = 'verified', verified_at = NOW(), verified_by = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [requestId, verifiedBy],
    );

    logger.info({ requestId, verifiedBy }, 'Document verified');
    return updated;
  });
}

/**
 * Get overdue requests that need reminders.
 * Returns requests where:
 * - status = 'sent' (not yet received)
 * - due_date < NOW()
 * - reminder_count < max_reminders
 * - (last_reminder_at IS NULL OR last_reminder_at < NOW() - 24 hours)
 */
export async function getOverdueRequests(ctx: RequestContext): Promise<DocumentRequest[]> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findMany<DocumentRequest>(
      client,
      `SELECT * FROM document_requests
       WHERE ca_firm_id = $1
       AND status = 'sent'
       AND due_date < NOW()
       AND reminder_count < max_reminders
       AND (last_reminder_at IS NULL OR last_reminder_at < NOW() - INTERVAL '24 hours')
       ORDER BY due_date ASC`,
      [(ctx as any).caFirmId],
    );
  });
}

/**
 * Update document request status and reminder tracking.
 */
export async function updateDocumentRequest(
  ctx: RequestContext,
  requestId: string,
  updates: {
    status?: string;
    reminder_count?: number;
    last_reminder_at?: Date;
  },
): Promise<DocumentRequest> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const existing = await findOne<DocumentRequest>(
      client,
      `SELECT * FROM document_requests WHERE id = $1 AND ca_firm_id = $2`,
      [requestId, (ctx as any).caFirmId],
    );

    if (!existing) {
      throw new FcError(
        'FC_ERR_DOCUMENT_REQUEST_NOT_FOUND',
        `Document request ${requestId} not found`,
        { requestId },
        404,
      );
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.reminder_count !== undefined) {
      sets.push(`reminder_count = $${idx++}`);
      values.push(updates.reminder_count);
    }
    if (updates.last_reminder_at !== undefined) {
      sets.push(`last_reminder_at = $${idx++}`);
      values.push(updates.last_reminder_at);
    }

    if (sets.length === 0) return existing;

    sets.push('updated_at = NOW()');
    values.push(requestId);

    const updated = await insertOne<DocumentRequest>(
      client,
      `UPDATE document_requests SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    return updated;
  });
}

/**
 * Bulk create document requests for multiple clients.
 * Useful for periodic batch document collection campaigns.
 */
export async function bulkCreateRequests(
  ctx: RequestContext,
  clientIds: string[],
  requestType: string,
  description: string,
  dueDate: Date,
  channel: 'whatsapp' | 'email' = 'whatsapp',
): Promise<{ created: DocumentRequest[]; failed: Array<{ clientId: string; error: string }> }> {
  const created: DocumentRequest[] = [];
  const failed: Array<{ clientId: string; error: string }> = [];

  for (const clientId of clientIds) {
    try {
      const request = await createDocumentRequest(ctx, {
        client_id: clientId,
        document_type: requestType,
        period: description,
        due_date: dueDate,
        channel,
      });
      created.push(request);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      failed.push({ clientId, error: errorMsg });
      logger.warn({ clientId, error: errorMsg }, 'Failed to create bulk document request');
    }
  }

  logger.info(
    { totalAttempted: clientIds.length, created: created.length, failed: failed.length },
    'Bulk document request creation completed',
  );

  return { created, failed };
}

/**
 * Get collection dashboard stats.
 */
export async function getCollectionDashboard(ctx: RequestContext): Promise<DocumentCollectionDashboard> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const result = await client.query<{
      status: string;
      count: number;
    }>(
      `SELECT status, COUNT(*) as count FROM document_requests
       WHERE ca_firm_id = $1 GROUP BY status`,
      [(ctx as any).caFirmId],
    );

    const counts = new Map<string, number>();
    for (const row of result.rows) {
      counts.set(row.status, row.count);
    }

    // Get total count
    const totalResult = await client.query<{ total: number }>(
      `SELECT COUNT(*) as total FROM document_requests WHERE ca_firm_id = $1`,
      [(ctx as any).caFirmId],
    );
    const total = totalResult.rows[0]?.total || 0;

    // Get overdue count
    const overdueResult = await client.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM document_requests
       WHERE ca_firm_id = $1 AND status = 'sent' AND due_date < NOW()`,
      [(ctx as any).caFirmId],
    );
    const overdueCount = overdueResult.rows[0]?.count || 0;

    return {
      total,
      pending: counts.get('pending') || 0,
      sent: counts.get('sent') || 0,
      received: counts.get('received') || 0,
      verified: counts.get('verified') || 0,
      expired: counts.get('expired') || 0,
      overdueCount,
    };
  });
}

/**
 * For internal use by auto-chase worker: increment reminder count and update timestamp.
 */
export async function incrementReminder(ctx: RequestContext, requestId: string): Promise<DocumentRequest> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const existing = await findOne<DocumentRequest>(
      client,
      `SELECT * FROM document_requests WHERE id = $1 AND ca_firm_id = $2`,
      [requestId, (ctx as any).caFirmId],
    );

    if (!existing) {
      throw new FcError(
        'FC_ERR_DOCUMENT_REQUEST_NOT_FOUND',
        `Document request ${requestId} not found`,
        { requestId },
        404,
      );
    }

    const newReminder = existing.reminder_count + 1;
    const newStatus = newReminder >= existing.max_reminders ? 'expired' : existing.status;

    const updated = await insertOne<DocumentRequest>(
      client,
      `UPDATE document_requests
       SET reminder_count = $2, last_reminder_at = NOW(), status = $3, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [requestId, newReminder, newStatus],
    );

    if (newStatus === 'expired') {
      logger.info(
        { requestId, reminderCount: newReminder, maxReminders: existing.max_reminders },
        'Document request expired (max reminders reached)',
      );
    }

    return updated;
  });
}
