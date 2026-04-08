/**
 * CA Platform type definitions.
 * All CA-specific types that cross package boundaries.
 */

// ═══════════════════════════════════════════════════════════════════
// ENUM TYPE ALIASES (matching PostgreSQL ENUMs)
// ═══════════════════════════════════════════════════════════════════

export type FilingStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'review_pending'
  | 'rejected';

export type ComplianceSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ExceptionStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'escalated';

export type ReconciliationStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'partial_match'
  | 'failed';

export type MatchStatus =
  | 'matched'
  | 'unmatched_source'
  | 'unmatched_target'
  | 'variance'
  | 'manual_review';

export type DocumentRequestStatus =
  | 'pending'
  | 'sent'
  | 'received'
  | 'verified'
  | 'expired'
  | 'cancelled';

export type NoticeStatus =
  | 'received'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'escalated'
  | 'closed';

export type NoticePriority = 'low' | 'medium' | 'high' | 'critical';

export type StaffRole = 'partner' | 'manager' | 'staff';

export type CaSubscriptionTier = 'trial' | 'starter' | 'professional' | 'enterprise';

// ═══════════════════════════════════════════════════════════════════
// REQUEST CONTEXT FOR CA PLATFORM
// ═══════════════════════════════════════════════════════════════════

export interface CaRequestContext {
  caFirmId: string;
  tenantId: string; // Alias for caFirmId for compatibility with RequestContext
  userId: string;
  correlationId: string;
  role: string;
  subscriptionTier: CaSubscriptionTier;
}
