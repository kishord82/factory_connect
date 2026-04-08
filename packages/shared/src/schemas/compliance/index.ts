/**
 * CA Platform Compliance Schemas
 * Validation schemas for all CA (Chartered Accountant) platform entities
 * matching the 005_ca_platform.sql DB tables and enums.
 */

import { z } from 'zod';
import { UuidSchema, PaginationSchema } from '../index.js';

// ═══════════════════════════════════════════════════════════════════
// ENUM SCHEMAS (matching PostgreSQL ENUMs from 005_ca_platform.sql)
// ═══════════════════════════════════════════════════════════════════

export const FilingStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'review_pending',
  'rejected',
]);

export const ComplianceSeveritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const ExceptionStatusSchema = z.enum([
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
  'escalated',
]);

export const ReconciliationStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'partial_match',
  'failed',
]);

export const MatchStatusSchema = z.enum([
  'matched',
  'unmatched_source',
  'unmatched_target',
  'variance',
  'manual_review',
]);

export const DocumentRequestStatusSchema = z.enum([
  'pending',
  'sent',
  'received',
  'verified',
  'expired',
  'cancelled',
]);

export const NoticeStatusSchema = z.enum([
  'received',
  'acknowledged',
  'in_progress',
  'resolved',
  'escalated',
  'closed',
]);

export const NoticePrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

export const StaffRoleSchema = z.enum([
  'partner',
  'manager',
  'staff',
]);

export const CaSubscriptionTierSchema = z.enum([
  'trial',
  'starter',
  'professional',
  'enterprise',
]);

// ═══════════════════════════════════════════════════════════════════
// CA FIRM SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const CaFirmCreateSchema = z.object({
  name: z.string().min(1).max(255),
  registration_number: z.string().min(1).max(100),
  gst_number: z.string().min(1).max(15),
  subscription_tier: CaSubscriptionTierSchema.default('trial'),
  max_clients: z.number().int().positive().default(20),
  owner_user_id: UuidSchema,
  settings: z.record(z.unknown()).default({}),
});

export const CaFirmSchema = CaFirmCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CaFirmUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subscription_tier: CaSubscriptionTierSchema.optional(),
  max_clients: z.number().int().positive().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const CaFirmListQuerySchema = PaginationSchema.extend({
  subscription_tier: CaSubscriptionTierSchema.optional(),
  search: z.string().max(200).optional(),
});

// ═══════════════════════════════════════════════════════════════════
// CA FIRM STAFF SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const CaFirmStaffCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  user_id: UuidSchema,
  role: StaffRoleSchema,
  assigned_clients: z.array(UuidSchema).default([]),
  is_active: z.boolean().default(true),
});

export const CaFirmStaffSchema = CaFirmStaffCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
});

// ═══════════════════════════════════════════════════════════════════
// CA CLIENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const CaClientCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  factory_id: UuidSchema.optional(),
  business_name: z.string().min(1).max(255),
  gstin_encrypted: z.string().optional(),
  pan_encrypted: z.string().optional(),
  business_type: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  annual_turnover_bracket: z.string().max(50).optional(),
  tally_status: z.string().max(20).default('pending'),
  bridge_agent_id: UuidSchema.optional(),
  primary_contact_name: z.string().max(255).optional(),
  primary_contact_phone: z.string().max(20).optional(),
  primary_contact_email: z.string().email().optional(),
  whatsapp_number: z.string().max(20).optional(),
  preferred_channel: z.string().max(20).default('whatsapp'),
  assigned_staff_id: UuidSchema.optional(),
  settings: z.record(z.unknown()).default({}),
  health_score: z.number().min(0).max(10).optional(),
});

export const CaClientSchema = CaClientCreateSchema.extend({
  id: UuidSchema,
  health_score_updated_at: z.coerce.date().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CaClientUpdateSchema = z.object({
  business_name: z.string().min(1).max(255).optional(),
  business_type: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  annual_turnover_bracket: z.string().max(50).optional(),
  tally_status: z.string().max(20).optional(),
  bridge_agent_id: UuidSchema.optional(),
  primary_contact_name: z.string().max(255).optional(),
  primary_contact_phone: z.string().max(20).optional(),
  primary_contact_email: z.string().email().optional(),
  whatsapp_number: z.string().max(20).optional(),
  preferred_channel: z.string().max(20).optional(),
  assigned_staff_id: UuidSchema.optional(),
  settings: z.record(z.unknown()).optional(),
  health_score: z.number().min(0).max(10).optional(),
});

export const CaClientListQuerySchema = PaginationSchema.extend({
  tally_status: z.string().optional(),
  assigned_staff_id: UuidSchema.optional(),
  search: z.string().max(200).optional(),
});

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE FILING SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const ComplianceFilingCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  client_id: UuidSchema,
  filing_type: z.string().min(1).max(50),
  period: z.string().min(1).max(20),
  status: FilingStatusSchema.default('pending'),
  due_date: z.coerce.date().optional(),
  filed_date: z.coerce.date().optional(),
  data_snapshot: z.record(z.unknown()).optional(),
  validation_results: z.record(z.unknown()).optional(),
  exceptions: z.array(z.unknown()).default([]),
  filed_reference: z.string().max(100).optional(),
  prepared_by: UuidSchema.optional(),
  reviewed_by: UuidSchema.optional(),
});

export const ComplianceFilingSchema = ComplianceFilingCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const ComplianceFilingUpdateSchema = z.object({
  status: FilingStatusSchema.optional(),
  due_date: z.coerce.date().optional(),
  filed_date: z.coerce.date().optional(),
  data_snapshot: z.record(z.unknown()).optional(),
  validation_results: z.record(z.unknown()).optional(),
  exceptions: z.array(z.unknown()).optional(),
  filed_reference: z.string().max(100).optional(),
  prepared_by: UuidSchema.optional(),
  reviewed_by: UuidSchema.optional(),
});

export const ComplianceFilingListQuerySchema = PaginationSchema.extend({
  filing_type: z.string().optional(),
  status: FilingStatusSchema.optional(),
  client_id: UuidSchema.optional(),
  period: z.string().optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
});

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE EXCEPTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const ComplianceExceptionCreateSchema = z.object({
  filing_id: UuidSchema,
  client_id: UuidSchema,
  ca_firm_id: UuidSchema,
  exception_type: z.string().min(1).max(50),
  severity: ComplianceSeveritySchema,
  description: z.string().optional(),
  source_data: z.record(z.unknown()).optional(),
  suggested_fix: z.string().optional(),
  status: ExceptionStatusSchema.default('open'),
  resolved_by: UuidSchema.optional(),
  resolved_at: z.coerce.date().optional(),
  resolution_notes: z.string().optional(),
});

export const ComplianceExceptionSchema = ComplianceExceptionCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
});

export const ComplianceExceptionUpdateSchema = z.object({
  status: ExceptionStatusSchema.optional(),
  resolved_by: UuidSchema.optional(),
  resolved_at: z.coerce.date().optional(),
  resolution_notes: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════
// RECONCILIATION SESSION SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const ReconciliationSessionCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  client_id: UuidSchema,
  recon_type: z.string().min(1).max(50),
  period: z.string().min(1).max(20),
  status: ReconciliationStatusSchema.default('pending'),
  source_count: z.number().int().optional(),
  target_count: z.number().int().optional(),
  summary: z.record(z.unknown()).optional(),
});

export const ReconciliationSessionSchema = ReconciliationSessionCreateSchema.extend({
  id: UuidSchema,
  matched_count: z.number().int().default(0),
  unmatched_source: z.number().int().default(0),
  unmatched_target: z.number().int().default(0),
  variance_amount: z.number().default(0),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().optional(),
});

export const ReconciliationSessionListQuerySchema = PaginationSchema.extend({
  status: ReconciliationStatusSchema.optional(),
  client_id: UuidSchema.optional(),
  recon_type: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════
// RECONCILIATION ITEM SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const ReconciliationItemCreateSchema = z.object({
  session_id: UuidSchema,
  source_record: z.record(z.unknown()).optional(),
  target_record: z.record(z.unknown()).optional(),
  match_status: MatchStatusSchema.optional(),
  variance_amount: z.number().optional(),
  variance_reason: z.string().optional(),
  resolution: z.string().optional(),
  resolved_by: UuidSchema.optional(),
});

export const ReconciliationItemSchema = ReconciliationItemCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
});

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT REQUEST SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const DocumentRequestCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  client_id: UuidSchema,
  request_type: z.string().min(1).max(50),
  description: z.string().optional(),
  due_date: z.coerce.date().optional(),
  status: DocumentRequestStatusSchema.default('pending'),
  channel: z.string().max(20).default('whatsapp'),
  sent_at: z.coerce.date().optional(),
  reminder_count: z.number().int().default(0),
  last_reminder_at: z.coerce.date().optional(),
  max_reminders: z.number().int().default(3),
  reminder_interval_days: z.number().int().default(3),
  received_at: z.coerce.date().optional(),
  document_url: z.string().optional(),
  verified_by: UuidSchema.optional(),
  verified_at: z.coerce.date().optional(),
});

export const DocumentRequestSchema = DocumentRequestCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
});

export const DocumentRequestUpdateSchema = z.object({
  status: DocumentRequestStatusSchema.optional(),
  sent_at: z.coerce.date().optional(),
  reminder_count: z.number().int().optional(),
  last_reminder_at: z.coerce.date().optional(),
  received_at: z.coerce.date().optional(),
  document_url: z.string().optional(),
  verified_by: UuidSchema.optional(),
  verified_at: z.coerce.date().optional(),
});

export const DocumentRequestListQuerySchema = PaginationSchema.extend({
  status: DocumentRequestStatusSchema.optional(),
  client_id: UuidSchema.optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
});

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT TEMPLATE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const DocumentTemplateCreateSchema = z.object({
  ca_firm_id: UuidSchema.optional(),
  template_type: z.string().min(1).max(50),
  channel: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  subject: z.string().max(500).optional(),
  body_template: z.string().min(1),
  variables: z.record(z.unknown()).optional(),
  language: z.string().max(10).default('en'),
  is_active: z.boolean().default(true),
});

export const DocumentTemplateSchema = DocumentTemplateCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
});

// ═══════════════════════════════════════════════════════════════════
// NOTICE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const NoticeCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  client_id: UuidSchema,
  notice_type: z.string().min(1).max(50),
  reference_number: z.string().max(100).optional(),
  issuing_authority: z.string().max(255).optional(),
  received_date: z.coerce.date().optional(),
  response_due_date: z.coerce.date().optional(),
  amount_demanded: z.number().optional(),
  status: NoticeStatusSchema.default('received'),
  priority: NoticePrioritySchema.default('medium'),
  description: z.string().optional(),
  document_url: z.string().optional(),
  response_document_url: z.string().optional(),
  assigned_to: UuidSchema.optional(),
  resolution_notes: z.string().optional(),
  resolved_at: z.coerce.date().optional(),
});

export const NoticeSchema = NoticeCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const NoticeUpdateSchema = z.object({
  status: NoticeStatusSchema.optional(),
  priority: NoticePrioritySchema.optional(),
  description: z.string().optional(),
  document_url: z.string().optional(),
  response_document_url: z.string().optional(),
  assigned_to: UuidSchema.optional(),
  resolution_notes: z.string().optional(),
  resolved_at: z.coerce.date().optional(),
});

export const NoticeListQuerySchema = PaginationSchema.extend({
  status: NoticeStatusSchema.optional(),
  priority: NoticePrioritySchema.optional(),
  client_id: UuidSchema.optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
});

// ═══════════════════════════════════════════════════════════════════
// CLIENT HEALTH SCORE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const ClientHealthScoreCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  client_id: UuidSchema,
  score_date: z.coerce.date(),
  overall_score: z.number().min(0).max(10).optional(),
  compliance_score: z.number().min(0).max(10).optional(),
  financial_score: z.number().min(0).max(10).optional(),
  data_quality_score: z.number().min(0).max(10).optional(),
  attention_needed: z.boolean().default(false),
  risk_factors: z.record(z.unknown()).optional(),
  recommendations: z.record(z.unknown()).optional(),
});

export const ClientHealthScoreSchema = ClientHealthScoreCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
});

// ═══════════════════════════════════════════════════════════════════
// STAFF ACTIVITY LOG SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const StaffActivityLogCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  staff_id: UuidSchema,
  client_id: UuidSchema.optional(),
  activity_type: z.string().min(1).max(100),
  duration_minutes: z.number().int().optional(),
  description: z.string().optional(),
  activity_date: z.coerce.date(),
});

export const StaffActivityLogSchema = StaffActivityLogCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
});

export const StaffActivityLogListQuerySchema = PaginationSchema.extend({
  staff_id: UuidSchema.optional(),
  client_id: UuidSchema.optional(),
  activity_type: z.string().optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
});

// ═══════════════════════════════════════════════════════════════════
// COMMUNICATION LOG SCHEMAS
// ═══════════════════════════════════════════════════════════════════

export const CommunicationLogCreateSchema = z.object({
  ca_firm_id: UuidSchema,
  client_id: UuidSchema,
  channel: z.string().min(1).max(20),
  direction: z.string().min(1).max(20),
  message_type: z.string().max(50).optional(),
  template_id: UuidSchema.optional(),
  content: z.string().optional(),
  status: z.string().max(20).default('queued'),
  external_id: z.string().max(100).optional(),
  error_message: z.string().optional(),
  sent_at: z.coerce.date().optional(),
  delivered_at: z.coerce.date().optional(),
  read_at: z.coerce.date().optional(),
});

export const CommunicationLogSchema = CommunicationLogCreateSchema.extend({
  id: UuidSchema,
  created_at: z.coerce.date(),
});

// ═══════════════════════════════════════════════════════════════════
// SUBSCRIPTION TIER SCHEMAS (read-only)
// ═══════════════════════════════════════════════════════════════════

export const SubscriptionTierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  max_clients: z.number().int().positive(),
  price_per_client_monthly: z.number().optional(),
  base_price_monthly: z.number().optional(),
  features: z.array(z.string()).default([]),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

// ═══════════════════════════════════════════════════════════════════
// TYPE EXPORTS (inferred from Zod schemas)
// Note: Enum types are in types/compliance.ts to avoid duplication
// ═══════════════════════════════════════════════════════════════════

export type CaFirmCreate = z.infer<typeof CaFirmCreateSchema>;
export type CaFirm = z.infer<typeof CaFirmSchema>;
export type CaFirmUpdate = z.infer<typeof CaFirmUpdateSchema>;
export type CaFirmListQuery = z.infer<typeof CaFirmListQuerySchema>;

export type CaFirmStaffCreate = z.infer<typeof CaFirmStaffCreateSchema>;
export type CaFirmStaff = z.infer<typeof CaFirmStaffSchema>;

export type CaClientCreate = z.infer<typeof CaClientCreateSchema>;
export type CaClient = z.infer<typeof CaClientSchema>;
export type CaClientUpdate = z.infer<typeof CaClientUpdateSchema>;
export type CaClientListQuery = z.infer<typeof CaClientListQuerySchema>;

export type ComplianceFilingCreate = z.infer<typeof ComplianceFilingCreateSchema>;
export type ComplianceFiling = z.infer<typeof ComplianceFilingSchema>;
export type ComplianceFilingUpdate = z.infer<typeof ComplianceFilingUpdateSchema>;
export type ComplianceFilingListQuery = z.infer<typeof ComplianceFilingListQuerySchema>;

export type ComplianceExceptionCreate = z.infer<typeof ComplianceExceptionCreateSchema>;
export type ComplianceException = z.infer<typeof ComplianceExceptionSchema>;
export type ComplianceExceptionUpdate = z.infer<typeof ComplianceExceptionUpdateSchema>;

export type ReconciliationSessionCreate = z.infer<typeof ReconciliationSessionCreateSchema>;
export type ReconciliationSession = z.infer<typeof ReconciliationSessionSchema>;
export type ReconciliationSessionListQuery = z.infer<typeof ReconciliationSessionListQuerySchema>;

export type ReconciliationItemCreate = z.infer<typeof ReconciliationItemCreateSchema>;
export type ReconciliationItem = z.infer<typeof ReconciliationItemSchema>;

export type DocumentRequestCreate = z.infer<typeof DocumentRequestCreateSchema>;
export type DocumentRequest = z.infer<typeof DocumentRequestSchema>;
export type DocumentRequestUpdate = z.infer<typeof DocumentRequestUpdateSchema>;
export type DocumentRequestListQuery = z.infer<typeof DocumentRequestListQuerySchema>;

export type DocumentTemplateCreate = z.infer<typeof DocumentTemplateCreateSchema>;
export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>;

export type NoticeCreate = z.infer<typeof NoticeCreateSchema>;
export type Notice = z.infer<typeof NoticeSchema>;
export type NoticeUpdate = z.infer<typeof NoticeUpdateSchema>;
export type NoticeListQuery = z.infer<typeof NoticeListQuerySchema>;

export type ClientHealthScoreCreate = z.infer<typeof ClientHealthScoreCreateSchema>;
export type ClientHealthScore = z.infer<typeof ClientHealthScoreSchema>;

export type StaffActivityLogCreate = z.infer<typeof StaffActivityLogCreateSchema>;
export type StaffActivityLog = z.infer<typeof StaffActivityLogSchema>;
export type StaffActivityLogListQuery = z.infer<typeof StaffActivityLogListQuerySchema>;

export type CommunicationLogCreate = z.infer<typeof CommunicationLogCreateSchema>;
export type CommunicationLog = z.infer<typeof CommunicationLogSchema>;

export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;
