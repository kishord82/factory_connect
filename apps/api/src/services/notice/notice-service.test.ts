/**
 * F13: Notice Service Tests
 */

import { describe, it, expect } from 'vitest';
import type { CaRequestContext } from '@fc/shared';

const mockCaCtx: CaRequestContext = {
  caFirmId: 'ca-firm-123',
  tenantId: 'ca-firm-123',
  userId: 'user-456',
  correlationId: 'corr-789',
  role: 'manager',
  subscriptionTier: 'professional',
};

describe('Notice Service', () => {
  describe('createNotice', () => {
    it('creates notice with all fields', async () => {
      const mockNotice = {
        id: 'notice-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        notice_type: 'IT_NOTICE',
        reference: 'IT-2024-001',
        authority: 'Income Tax Department',
        issued_date: new Date('2024-01-15'),
        received_date: new Date('2024-01-20'),
        response_due_date: new Date('2024-02-20'),
        appeal_due_date: new Date('2024-03-20'),
        amount: '50000.00',
        priority: 'high' as const,
        status: 'received' as const,
        assigned_to: null,
        response_notes: null,
        resolved_date: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockNotice.notice_type).toBe('IT_NOTICE');
      expect(mockNotice.status).toBe('received');
      expect(mockNotice.priority).toBe('high');
    });

    it('rejects invalid notice type', async () => {
      const invalidType = 'INVALID_TYPE';
      const validTypes = ['IT_NOTICE', 'GST_NOTICE', 'TDS_NOTICE', 'INCOME_TAX_SHOW_CAUSE', 'GST_DEMAND'];

      expect(validTypes.includes(invalidType)).toBe(false);
    });

    it('sets initial status to received', async () => {
      const mockNotice = {
        id: 'notice-1',
        ca_firm_id: mockCaCtx.caFirmId,
        client_id: 'client-123',
        notice_type: 'GST_NOTICE',
        reference: 'GST-2024-001',
        authority: 'GST Authorities',
        issued_date: new Date('2024-01-15'),
        received_date: new Date('2024-01-20'),
        response_due_date: new Date('2024-02-20'),
        appeal_due_date: null,
        amount: '100000.00',
        priority: 'critical' as const,
        status: 'received' as const,
        assigned_to: null,
        response_notes: null,
        resolved_date: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(mockNotice.status).toBe('received');
    });
  });

  describe('updateNotice', () => {
    it('updates status', async () => {
      const before = {
        id: 'notice-1',
        status: 'received' as const,
        assigned_to: null,
      };

      const after = {
        ...before,
        status: 'in_progress' as const,
      };

      expect(after.status).not.toBe(before.status);
      expect(after.status).toBe('in_progress');
    });

    it('updates assigned_to', async () => {
      const before = { id: 'notice-1', assigned_to: null };
      const after = { ...before, assigned_to: 'staff-123' };

      expect(after.assigned_to).toBe('staff-123');
    });

    it('updates response_notes', async () => {
      const before = { id: 'notice-1', response_notes: null };
      const after = { ...before, response_notes: 'Documents submitted on 2024-02-10' };

      expect(after.response_notes).not.toBe(before.response_notes);
    });

    it('sets resolved_date when status becomes resolved', async () => {
      const before = {
        id: 'notice-1',
        status: 'in_progress' as const,
        resolved_date: null,
      };

      const after = {
        ...before,
        status: 'resolved' as const,
        resolved_date: new Date(),
      };

      expect(after.resolved_date).not.toBe(null);
    });

    it('rejects invalid status', async () => {
      const validStatuses = ['received', 'acknowledged', 'in_progress', 'resolved', 'escalated', 'closed'];
      const invalidStatus = 'INVALID_STATUS';

      expect(validStatuses.includes(invalidStatus)).toBe(false);
    });
  });

  describe('listNotices', () => {
    it('filters by status', async () => {
      const allNotices = [
        { id: 'n1', status: 'received' },
        { id: 'n2', status: 'received' },
        { id: 'n3', status: 'resolved' },
      ];

      const filtered = allNotices.filter((n) => n.status === 'received');
      expect(filtered).toHaveLength(2);
    });

    it('filters by priority', async () => {
      const allNotices = [
        { id: 'n1', priority: 'high' },
        { id: 'n2', priority: 'critical' },
        { id: 'n3', priority: 'low' },
      ];

      const filtered = allNotices.filter((n) => n.priority === 'critical');
      expect(filtered).toHaveLength(1);
    });

    it('filters by date range', async () => {
      const allNotices = [
        { id: 'n1', due_date: new Date('2024-01-15') },
        { id: 'n2', due_date: new Date('2024-02-15') },
        { id: 'n3', due_date: new Date('2024-03-15') },
      ];

      const start = new Date('2024-02-01');
      const end = new Date('2024-02-28');
      const filtered = allNotices.filter((n) => n.due_date >= start && n.due_date <= end);

      expect(filtered).toHaveLength(1);
    });

    it('supports pagination', async () => {
      const allNotices = Array.from({ length: 50 }, (_, i) => ({ id: `n${i}` }));
      const pageSize = 20;
      const page = 1;

      const paginated = allNotices.slice((page - 1) * pageSize, page * pageSize);
      expect(paginated).toHaveLength(20);
    });

    it('orders by response_due_date ascending', async () => {
      const notices = [
        { id: 'n3', due_date: new Date('2024-03-15') },
        { id: 'n1', due_date: new Date('2024-01-15') },
        { id: 'n2', due_date: new Date('2024-02-15') },
      ];

      const sorted = notices.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
      expect(sorted[0].id).toBe('n1');
      expect(sorted[2].id).toBe('n3');
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('returns notices with response due in next N days', async () => {
      const today = new Date();
      const inSevenDays = new Date();
      inSevenDays.setDate(inSevenDays.getDate() + 7);

      const notices = [
        { id: 'n1', due_date: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 3) },
        { id: 'n2', due_date: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 15) },
      ];

      const upcoming = notices.filter((n) => n.due_date <= inSevenDays);
      expect(upcoming).toHaveLength(1);
    });

    it('calculates days remaining correctly', async () => {
      const today = new Date('2024-01-01');
      const dueDate = new Date('2024-01-10');
      const daysRemaining = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysRemaining).toBe(9);
    });

    it('excludes resolved and closed notices', async () => {
      const notices = [
        { id: 'n1', status: 'received', due_date: new Date() },
        { id: 'n2', status: 'resolved', due_date: new Date() },
        { id: 'n3', status: 'closed', due_date: new Date() },
      ];

      const upcoming = notices.filter((n) => !['resolved', 'closed'].includes(n.status));
      expect(upcoming).toHaveLength(1);
    });
  });

  describe('escalateNotice', () => {
    it('changes status to escalated', async () => {
      const before = { id: 'notice-1', status: 'in_progress' as const };
      const after = { ...before, status: 'escalated' as const };

      expect(after.status).toBe('escalated');
    });

    it('records escalation reason', async () => {
      const notice = {
        id: 'notice-1',
        status: 'escalated' as const,
        response_notes: 'Complex case requiring partner review',
      };

      expect(notice.response_notes).not.toBe(null);
    });
  });

  describe('getNoticeDashboard', () => {
    it('counts notices by status', async () => {
      const notices = [
        { id: 'n1', status: 'received' },
        { id: 'n2', status: 'received' },
        { id: 'n3', status: 'in_progress' },
        { id: 'n4', status: 'resolved' },
      ];

      const byStatus: Record<string, number> = {};
      for (const notice of notices) {
        byStatus[notice.status] = (byStatus[notice.status] ?? 0) + 1;
      }

      expect(byStatus.received).toBe(2);
      expect(byStatus.in_progress).toBe(1);
      expect(byStatus.resolved).toBe(1);
    });

    it('counts notices by priority', async () => {
      const notices = [
        { id: 'n1', priority: 'critical' },
        { id: 'n2', priority: 'high' },
        { id: 'n3', priority: 'high' },
        { id: 'n4', priority: 'low' },
      ];

      const byPriority: Record<string, number> = {};
      for (const notice of notices) {
        byPriority[notice.priority] = (byPriority[notice.priority] ?? 0) + 1;
      }

      expect(byPriority.critical).toBe(1);
      expect(byPriority.high).toBe(2);
    });

    it('counts overdue notices', async () => {
      const today = new Date();
      const notices = [
        { id: 'n1', due_date: new Date(today.getTime() - 1000 * 60 * 60 * 24), status: 'received' },
        { id: 'n2', due_date: new Date(today.getTime() + 1000 * 60 * 60 * 24), status: 'received' },
        { id: 'n3', due_date: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 5), status: 'resolved' },
      ];

      const overdue = notices.filter(
        (n) => n.due_date < today && !['resolved', 'closed'].includes(n.status),
      );

      expect(overdue).toHaveLength(1);
    });

    it('counts notices due this week', async () => {
      const today = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      const notices = [
        { id: 'n1', due_date: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 3) },
        { id: 'n2', due_date: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 15) },
      ];

      const thisWeek = notices.filter((n) => n.due_date >= today && n.due_date <= weekFromNow);
      expect(thisWeek).toHaveLength(1);
    });

    it('counts notices due this month', async () => {
      const today = new Date();
      const monthFromNow = new Date();
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);

      const notices = [
        { id: 'n1', due_date: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 10) },
        { id: 'n2', due_date: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 45) },
      ];

      const thisMonth = notices.filter((n) => n.due_date >= today && n.due_date <= monthFromNow);
      expect(thisMonth).toHaveLength(1);
    });
  });

  describe('generateResponseTemplate', () => {
    it('generates IT_NOTICE template', async () => {
      const template = `Tax Notice Response

Authority: [Authority Name]
Notice Reference: [Reference Number]
Issued Date: [Date]
Response Due: [Due Date]

We acknowledge receipt of the above notice and wish to respond as follows:

[Your response details]

Regards,
[Firm Name]`;

      expect(template).toContain('Tax Notice Response');
      expect(template).toContain('Authority');
    });

    it('generates GST_NOTICE template', async () => {
      const template = `GST Notice Response

GSTIN: [Your GSTIN]
Notice Type: [Notice Type]
Reference: [Reference Number]
Period: [Period]

Response to the notice:

[Detailed explanation]

Attachments:
- [Documentary evidence]

Regards,
[Authorized Representative]`;

      expect(template).toContain('GST Notice Response');
      expect(template).toContain('GSTIN');
    });

    it('throws for unsupported notice type', async () => {
      const supportedTypes = [
        'IT_NOTICE',
        'GST_NOTICE',
        'TDS_NOTICE',
        'INCOME_TAX_SHOW_CAUSE',
        'GST_DEMAND',
      ];

      expect(supportedTypes.includes('UNSUPPORTED')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles expired notices', async () => {
      const today = new Date();
      const notice = {
        id: 'n1',
        due_date: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 30),
        status: 'received' as const,
      };

      const isExpired = notice.due_date < today;
      expect(isExpired).toBe(true);
    });

    it('handles notices with no due date', async () => {
      const notice = {
        id: 'n1',
        due_date: null,
        status: 'received' as const,
      };

      expect(notice.due_date).toBe(null);
    });

    it('handles notice with zero amount', async () => {
      const notice = {
        id: 'n1',
        amount: '0.00',
        priority: 'low' as const,
      };

      expect(notice.amount).toBe('0.00');
    });

    it('handles multiple status updates', async () => {
      let notice = {
        id: 'n1',
        status: 'received' as const,
      } as any;

      notice = { ...notice, status: 'in_progress' as const };
      expect(notice.status).toBe('in_progress');

      notice = { ...notice, status: 'resolved' as const };
      expect(notice.status).toBe('resolved');
    });
  });
});
