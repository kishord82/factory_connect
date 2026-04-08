/**
 * CA7: Compliance Exception Management Service
 * CRUD operations for exceptions
 * Status transitions, escalations, resolutions
 */

import type { CaRequestContext } from '@fc/shared';
import type { PoolClient, PaginatedResult } from '@fc/database';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, paginatedQuery } from '@fc/database';

interface ComplianceExceptionRow {
  id: string;
  filing_id: string;
  client_id: string;
  ca_firm_id: string;
  exception_type: string;
  severity: string;
  description: string | null;
  source_data: Record<string, unknown> | null;
  suggested_fix: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: Date | null;
  resolution_notes: string | null;
  created_at: Date;
}

interface ExceptionDashboard {
  total: number;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
}

/**
 * Create a new compliance exception
 */
export async function createException(
  ctx: CaRequestContext,
  data: {
    filing_id: string;
    client_id: string;
    exception_type: string;
    severity: string;
    description?: string;
    source_data?: Record<string, unknown>;
    suggested_fix?: string;
  },
): Promise<ComplianceExceptionRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Validate filing exists
    const filing = await findOne(
      client,
      'SELECT id FROM compliance_filings WHERE id = $1 AND ca_firm_id = $2',
      [data.filing_id, ctx.caFirmId],
    );

    if (!filing) {
      throw new FcError('FC_ERR_COMPLIANCE_FILING_NOT_FOUND', `Filing ${data.filing_id} not found`, {}, 404);
    }

    // Validate client exists
    const caClient = await findOne(
      client,
      'SELECT id FROM ca_clients WHERE id = $1 AND ca_firm_id = $2',
      [data.client_id, ctx.caFirmId],
    );

    if (!caClient) {
      throw new FcError('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND', `Client ${data.client_id} not found`, {}, 404);
    }

    // Validate severity
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    if (!validSeverities.includes(data.severity)) {
      throw new FcError(
        'FC_ERR_COMPLIANCE_INVALID_SEVERITY',
        `Invalid severity: ${data.severity}. Valid values: ${validSeverities.join(', ')}`,
      );
    }

    const exception = await insertOne<ComplianceExceptionRow>(
      client,
      `INSERT INTO compliance_exceptions (
        filing_id, client_id, ca_firm_id, exception_type, severity,
        description, source_data, suggested_fix, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open') RETURNING *`,
      [
        data.filing_id, data.client_id, ctx.caFirmId, data.exception_type, data.severity,
        data.description ?? null, data.source_data ? JSON.stringify(data.source_data) : null,
        data.suggested_fix ?? null,
      ],
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, new_record, metadata)
       VALUES ($1, 'EXCEPTION_CREATE', 'compliance_exceptions', $2, $3, $4, $5)`,
      [
        ctx.caFirmId, exception.id, ctx.userId, JSON.stringify(exception),
        JSON.stringify({ correlationId: ctx.correlationId, exception_type: data.exception_type }),
      ],
    );

    return exception;
  });
}

/**
 * Update exception status and resolution
 */
export async function updateException(
  ctx: CaRequestContext,
  exceptionId: string,
  updates: {
    status?: string;
    resolution_notes?: string;
    resolved_by?: string;
  },
): Promise<ComplianceExceptionRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const exception = await findOne<ComplianceExceptionRow>(
      client,
      'SELECT * FROM compliance_exceptions WHERE id = $1 AND ca_firm_id = $2',
      [exceptionId, ctx.caFirmId],
    );

    if (!exception) {
      throw new FcError('FC_ERR_COMPLIANCE_EXCEPTION_NOT_FOUND', `Exception ${exceptionId} not found`, {}, 404);
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      open: ['acknowledged', 'in_progress', 'escalated'],
      acknowledged: ['in_progress', 'escalated'],
      in_progress: ['resolved', 'escalated'],
      resolved: [],
      escalated: ['in_progress', 'resolved'],
    };

    if (updates.status && !validTransitions[exception.status]?.includes(updates.status)) {
      throw new FcError(
        'FC_ERR_COMPLIANCE_INVALID_TRANSITION',
        `Cannot transition from ${exception.status} to ${updates.status}`,
      );
    }

    const resolvedAt = updates.status === 'resolved' ? new Date() : null;
    const resolvedBy = updates.status === 'resolved' ? ctx.userId : exception.resolved_by;

    const updated = await findOne<ComplianceExceptionRow>(
      client,
      `UPDATE compliance_exceptions
       SET status = COALESCE($1, status),
           resolution_notes = COALESCE($2, resolution_notes),
           resolved_by = COALESCE($3, resolved_by),
           resolved_at = COALESCE($4, resolved_at)
       WHERE id = $5 AND ca_firm_id = $6 RETURNING *`,
      [
        updates.status ?? null,
        updates.resolution_notes ?? null,
        resolvedBy ?? null,
        resolvedAt,
        exceptionId,
        ctx.caFirmId,
      ],
    );

    if (!updated) {
      throw new FcError('FC_ERR_COMPLIANCE_UPDATE_FAILED', 'Failed to update exception');
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, metadata)
       VALUES ($1, 'EXCEPTION_UPDATE', 'compliance_exceptions', $2, $3, $4)`,
      [
        ctx.caFirmId, exceptionId, ctx.userId,
        JSON.stringify({
          old_status: exception.status,
          new_status: updates.status,
          resolution_notes: updates.resolution_notes,
        }),
      ],
    );

    return updated;
  });
}

/**
 * List exceptions with filters and pagination
 */
export async function listExceptions(
  ctx: CaRequestContext,
  filters: {
    severity?: string;
    status?: string;
    client_id?: string;
    filing_id?: string;
  },
  page: number,
  pageSize: number,
): Promise<PaginatedResult<ComplianceExceptionRow>> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const params: unknown[] = [ctx.caFirmId];
    let sql = 'SELECT * FROM compliance_exceptions WHERE ca_firm_id = $1';

    if (filters.severity) {
      sql += ` AND severity = $${params.length + 1}`;
      params.push(filters.severity);
    }
    if (filters.status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }
    if (filters.client_id) {
      sql += ` AND client_id = $${params.length + 1}`;
      params.push(filters.client_id);
    }
    if (filters.filing_id) {
      sql += ` AND filing_id = $${params.length + 1}`;
      params.push(filters.filing_id);
    }

    sql += ' ORDER BY created_at DESC';

    return paginatedQuery<ComplianceExceptionRow>(client, sql, params, page, pageSize);
  });
}

/**
 * Get exception by ID
 */
export async function getExceptionById(ctx: CaRequestContext, exceptionId: string): Promise<ComplianceExceptionRow | null> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<ComplianceExceptionRow>(
      client,
      'SELECT * FROM compliance_exceptions WHERE id = $1 AND ca_firm_id = $2',
      [exceptionId, ctx.caFirmId],
    );
  });
}

/**
 * Acknowledge exception (mark as acknowledged)
 */
export async function acknowledgeException(ctx: CaRequestContext, exceptionId: string): Promise<ComplianceExceptionRow> {
  return updateException(ctx, exceptionId, {
    status: 'acknowledged',
  });
}

/**
 * Resolve exception with notes
 */
export async function resolveException(
  ctx: CaRequestContext,
  exceptionId: string,
  notes: string,
): Promise<ComplianceExceptionRow> {
  return updateException(ctx, exceptionId, {
    status: 'resolved',
    resolution_notes: notes,
  });
}

/**
 * Escalate exception to higher priority
 */
export async function escalateException(ctx: CaRequestContext, exceptionId: string): Promise<ComplianceExceptionRow> {
  return updateException(ctx, exceptionId, {
    status: 'escalated',
  });
}

/**
 * Get exception dashboard with counts by severity and status
 */
export async function getExceptionDashboard(ctx: CaRequestContext, clientId?: string): Promise<ExceptionDashboard> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    // Get total count
    const countQuery = clientId
      ? 'SELECT COUNT(*) as count FROM compliance_exceptions WHERE ca_firm_id = $1 AND client_id = $2'
      : 'SELECT COUNT(*) as count FROM compliance_exceptions WHERE ca_firm_id = $1';

    const countParams = clientId ? [ctx.caFirmId, clientId] : [ctx.caFirmId];
    const countResult = await client.query<{ count: string | number }>(countQuery, countParams);
    const total = typeof countResult.rows[0]?.count === 'string'
      ? parseInt(countResult.rows[0].count, 10)
      : (countResult.rows[0]?.count ?? 0);

    // Get count by severity
    const severityQuery = clientId
      ? `SELECT severity, COUNT(*) as count FROM compliance_exceptions
         WHERE ca_firm_id = $1 AND client_id = $2 GROUP BY severity`
      : `SELECT severity, COUNT(*) as count FROM compliance_exceptions
         WHERE ca_firm_id = $1 GROUP BY severity`;

    const severityParams = clientId ? [ctx.caFirmId, clientId] : [ctx.caFirmId];
    const severityResult = await client.query<{ severity: string; count: number }>(severityQuery, severityParams);

    const bySeverity: Record<string, number> = {};
    for (const row of severityResult.rows) {
      bySeverity[row.severity] = parseInt(row.count.toString(), 10);
    }

    // Get count by status
    const statusQuery = clientId
      ? `SELECT status, COUNT(*) as count FROM compliance_exceptions
         WHERE ca_firm_id = $1 AND client_id = $2 GROUP BY status`
      : `SELECT status, COUNT(*) as count FROM compliance_exceptions
         WHERE ca_firm_id = $1 GROUP BY status`;

    const statusParams = clientId ? [ctx.caFirmId, clientId] : [ctx.caFirmId];
    const statusResult = await client.query<{ status: string; count: number }>(statusQuery, statusParams);

    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[row.status] = parseInt(row.count.toString(), 10);
    }

    return {
      total,
      by_severity: bySeverity,
      by_status: byStatus,
    };
  });
}
