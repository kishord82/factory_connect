/**
 * F13: Notice & Demand Management Service
 * Tracks tax notices, manages deadlines, escalations, and response lifecycle
 */

import type { CaRequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, findMany } from '@fc/database';
import type { PoolClient } from '@fc/database';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface Notice {
  id: string;
  ca_firm_id: string;
  client_id: string;
  notice_type: string;
  reference: string;
  authority: string;
  issued_date: Date;
  received_date: Date;
  response_due_date: Date | null;
  appeal_due_date: Date | null;
  amount: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'received' | 'acknowledged' | 'in_progress' | 'resolved' | 'escalated' | 'closed';
  assigned_to: string | null;
  response_notes: string | null;
  resolved_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NoticeFilter {
  status?: string;
  priority?: string;
  clientId?: string;
  dueDateStart?: Date;
  dueDateEnd?: Date;
}

export interface UpcomingDeadline {
  noticeId: string;
  clientName: string;
  noticeType: string;
  dueDate: Date;
  daysRemaining: number;
  priority: string;
}

export interface NoticeDashboard {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdueCount: number;
  dueThisWeek: number;
  dueThisMonth: number;
}

// ═══════════════════════════════════════════════════════════════════
// CREATE NOTICE
// ═══════════════════════════════════════════════════════════════════

export async function createNotice(
  ctx: CaRequestContext,
  clientId: string,
  data: {
    noticeType: string;
    reference: string;
    authority: string;
    issuedDate: Date;
    receivedDate: Date;
    responseDueDate?: Date | null;
    appealDueDate?: Date | null;
    amount?: string | null;
    priority: 'low' | 'medium' | 'high' | 'critical';
  },
): Promise<Notice> {
  return withTenantTransaction(ctx as any, async (client: PoolClient) => {
    // Validate notice type
    const validTypes = ['IT_NOTICE', 'GST_NOTICE', 'TDS_NOTICE', 'INCOME_TAX_SHOW_CAUSE', 'GST_DEMAND'];
    if (!validTypes.includes(data.noticeType)) {
      throw new FcError('FC_ERR_NOTICE_INVALID_TYPE', `Invalid notice type: ${data.noticeType}`, {
        type: data.noticeType,
      }, 400);
    }

    const result = await insertOne<Notice>(
      client,
      `INSERT INTO ca_notices (
        ca_firm_id, client_id, notice_type, reference, authority,
        issued_date, received_date, response_due_date, appeal_due_date,
        amount, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        ctx.caFirmId,
        clientId,
        data.noticeType,
        data.reference,
        data.authority,
        data.issuedDate,
        data.receivedDate,
        data.responseDueDate ?? null,
        data.appealDueDate ?? null,
        data.amount ?? null,
        data.priority,
        'received',
      ],
    );

    return result;
  });
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE NOTICE
// ═══════════════════════════════════════════════════════════════════

export async function updateNotice(
  ctx: CaRequestContext,
  noticeId: string,
  updates: {
    status?: string;
    assignedTo?: string | null;
    responseNotes?: string | null;
  },
): Promise<Notice> {
  return withTenantTransaction(ctx as any, async (client: PoolClient) => {
    const current = await findOne<Notice>(
      client,
      `SELECT * FROM ca_notices WHERE id = $1`,
      [noticeId],
    );

    if (!current) {
      throw new FcError('FC_ERR_NOTICE_NOT_FOUND', 'Notice not found', {
        id: noticeId,
      }, 404);
    }

    // Validate status transitions
    const validStatuses = [
      'received',
      'acknowledged',
      'in_progress',
      'resolved',
      'escalated',
      'closed',
    ];
    if (updates.status && !validStatuses.includes(updates.status)) {
      throw new FcError('FC_ERR_NOTICE_INVALID_STATUS', `Invalid status: ${updates.status}`, {
        status: updates.status,
      }, 400);
    }

    const resolvedDate =
      updates.status === 'resolved' ? new Date() : (current.resolved_date ?? null);

    const result = await findOne<Notice>(
      client,
      `UPDATE ca_notices SET
        status = COALESCE($2, status),
        assigned_to = COALESCE($3, assigned_to),
        response_notes = COALESCE($4, response_notes),
        resolved_date = $5,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        noticeId,
        updates.status ?? null,
        updates.assignedTo !== undefined ? updates.assignedTo : null,
        updates.responseNotes ?? null,
        resolvedDate,
      ],
    );

    if (!result) {
      throw new FcError('FC_ERR_NOTICE_UPDATE_FAILED', 'Failed to update notice', {
        id: noticeId,
      });
    }

    return result;
  });
}

// ═══════════════════════════════════════════════════════════════════
// LIST NOTICES (PAGINATED)
// ═══════════════════════════════════════════════════════════════════

export async function listNotices(
  ctx: CaRequestContext,
  filter: NoticeFilter = {},
  page = 1,
  pageSize = 20,
) {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    let query = `SELECT * FROM ca_notices WHERE ca_firm_id = $1`;
    const params: unknown[] = [ctx.caFirmId];

    if (filter.status) {
      params.push(filter.status);
      query += ` AND status = $${params.length}`;
    }

    if (filter.priority) {
      params.push(filter.priority);
      query += ` AND priority = $${params.length}`;
    }

    if (filter.clientId) {
      params.push(filter.clientId);
      query += ` AND client_id = $${params.length}`;
    }

    if (filter.dueDateStart) {
      params.push(filter.dueDateStart);
      query += ` AND response_due_date >= $${params.length}`;
    }

    if (filter.dueDateEnd) {
      params.push(filter.dueDateEnd);
      query += ` AND response_due_date <= $${params.length}`;
    }

    query += ` ORDER BY response_due_date ASC NULLS LAST
               LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    params.push(pageSize);
    params.push((page - 1) * pageSize);

    const notices = await findMany<Notice>(client, query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM ca_notices WHERE ca_firm_id = $1`;
    const countParams: unknown[] = [ctx.caFirmId];

    if (filter.status) {
      countParams.push(filter.status);
      countQuery += ` AND status = $${countParams.length}`;
    }
    if (filter.priority) {
      countParams.push(filter.priority);
      countQuery += ` AND priority = $${countParams.length}`;
    }
    if (filter.clientId) {
      countParams.push(filter.clientId);
      countQuery += ` AND client_id = $${countParams.length}`;
    }

    const countResult = await findOne<{ count: number }>(client, countQuery, countParams);
    const total = countResult?.count ?? 0;

    return {
      notices,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET NOTICE BY ID
// ═══════════════════════════════════════════════════════════════════

export async function getNoticeById(ctx: CaRequestContext, noticeId: string): Promise<Notice> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const notice = await findOne<Notice>(
      client,
      `SELECT * FROM ca_notices WHERE id = $1`,
      [noticeId],
    );

    if (!notice) {
      throw new FcError('FC_ERR_NOTICE_NOT_FOUND', 'Notice not found', {
        id: noticeId,
      }, 404);
    }

    return notice;
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET UPCOMING DEADLINES
// ═══════════════════════════════════════════════════════════════════

export async function getUpcomingDeadlines(
  ctx: CaRequestContext,
  daysAhead = 30,
): Promise<UpcomingDeadline[]> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const notices = await findMany<{
      id: string;
      client_id: string;
      notice_type: string;
      response_due_date: Date | null;
      priority: string;
    }>(
      client,
      `SELECT n.id, n.client_id, n.notice_type, n.response_due_date, n.priority
       FROM ca_notices n
       WHERE n.ca_firm_id = $1
       AND n.response_due_date IS NOT NULL
       AND n.response_due_date <= $2
       AND n.status NOT IN ('resolved', 'closed')
       ORDER BY n.response_due_date ASC`,
      [ctx.caFirmId, cutoffDate],
    );

    const deadlines: UpcomingDeadline[] = [];

    for (const notice of notices) {
      const clientInfo = await findOne<{ name: string }>(
        client,
        `SELECT name FROM ca_clients WHERE id = $1`,
        [notice.client_id],
      );

      if (notice.response_due_date) {
        const today = new Date();
        const daysRemaining = Math.ceil(
          (notice.response_due_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        deadlines.push({
          noticeId: notice.id,
          clientName: clientInfo?.name ?? 'Unknown',
          noticeType: notice.notice_type,
          dueDate: notice.response_due_date,
          daysRemaining,
          priority: notice.priority,
        });
      }
    }

    return deadlines;
  });
}

// ═══════════════════════════════════════════════════════════════════
// ESCALATE NOTICE
// ═══════════════════════════════════════════════════════════════════

export async function escalateNotice(
  ctx: CaRequestContext,
  noticeId: string,
  escalationReason: string,
): Promise<Notice> {
  return withTenantTransaction(ctx as any, async () => {
    const notice = await updateNotice(ctx, noticeId, {
      status: 'escalated',
      responseNotes: escalationReason,
    });

    // Notify managers (in production, would send actual notification)
    // For now, log to audit trail

    return notice;
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET NOTICE DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export async function getNoticeDashboard(ctx: CaRequestContext): Promise<NoticeDashboard> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    // By status
    const byStatusRows = await findMany<{
      status: string;
      count: number;
    }>(
      client,
      `SELECT status, COUNT(*) as count FROM ca_notices
       WHERE ca_firm_id = $1
       GROUP BY status`,
      [ctx.caFirmId],
    );

    const byStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      byStatus[row.status] = row.count;
    }

    // By priority
    const byPriorityRows = await findMany<{
      priority: string;
      count: number;
    }>(
      client,
      `SELECT priority, COUNT(*) as count FROM ca_notices
       WHERE ca_firm_id = $1
       GROUP BY priority`,
      [ctx.caFirmId],
    );

    const byPriority: Record<string, number> = {};
    for (const row of byPriorityRows) {
      byPriority[row.priority] = row.count;
    }

    // Overdue count
    const overdueStats = await findOne<{ count: number }>(
      client,
      `SELECT COUNT(*) as count FROM ca_notices
       WHERE ca_firm_id = $1
       AND response_due_date < NOW()
       AND status NOT IN ('resolved', 'closed')`,
      [ctx.caFirmId],
    );

    const overdueCount = overdueStats?.count ?? 0;

    // Due this week
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const dueWeekStats = await findOne<{ count: number }>(
      client,
      `SELECT COUNT(*) as count FROM ca_notices
       WHERE ca_firm_id = $1
       AND response_due_date >= NOW()
       AND response_due_date <= $2
       AND status NOT IN ('resolved', 'closed')`,
      [ctx.caFirmId, weekFromNow],
    );

    const dueThisWeek = dueWeekStats?.count ?? 0;

    // Due this month
    const monthFromNow = new Date();
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);

    const dueMonthStats = await findOne<{ count: number }>(
      client,
      `SELECT COUNT(*) as count FROM ca_notices
       WHERE ca_firm_id = $1
       AND response_due_date >= NOW()
       AND response_due_date <= $2
       AND status NOT IN ('resolved', 'closed')`,
      [ctx.caFirmId, monthFromNow],
    );

    const dueThisMonth = dueMonthStats?.count ?? 0;

    return {
      byStatus,
      byPriority,
      overdueCount,
      dueThisWeek,
      dueThisMonth,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE RESPONSE TEMPLATE
// ═══════════════════════════════════════════════════════════════════

export async function generateResponseTemplate(
  noticeType: string,
): Promise<string> {
  const templates: Record<string, string> = {
    IT_NOTICE: `Tax Notice Response

Authority: [Authority Name]
Notice Reference: [Reference Number]
Issued Date: [Date]
Response Due: [Due Date]

We acknowledge receipt of the above notice and wish to respond as follows:

[Your response details]

Regards,
[Firm Name]`,

    GST_NOTICE: `GST Notice Response

GSTIN: [Your GSTIN]
Notice Type: [Notice Type]
Reference: [Reference Number]
Period: [Period]

Response to the notice:

[Detailed explanation]

Attachments:
- [Documentary evidence]

Regards,
[Authorized Representative]`,

    TDS_NOTICE: `TDS Notice Response

PAN: [Your PAN]
Notice Reference: [Reference]
Financial Year: [FY]

We submit this response to the TDS-related notice:

[Response content]

Regards,
[Firm Name]`,

    INCOME_TAX_SHOW_CAUSE: `Show Cause Response

Case Reference: [Reference]
Showing Cause Against: [Allegation]

We hereby show cause why the proposed action should not be taken:

[Detailed response]

Regards,
[Authorized Person]`,

    GST_DEMAND: `GST Demand Response

GSTIN: [Your GSTIN]
Demand Reference: [Reference]
Disputed Amount: [Amount]

We dispute the above demand on the following grounds:

[Grounds for dispute]

Regards,
[Firm Name]`,
  };

  const template = templates[noticeType];
  if (!template) {
    throw new FcError(
      'FC_ERR_NOTICE_TEMPLATE_NOT_FOUND',
      `No template for notice type: ${noticeType}`,
      { noticeType },
      400,
    );
  }

  return template;
}
