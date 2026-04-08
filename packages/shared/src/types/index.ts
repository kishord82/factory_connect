/**
 * Shared type definitions for FactoryConnect.
 * All types that cross package boundaries live here.
 */

/** Supported source ERP systems */
export type SourceType = 'tally' | 'zoho' | 'sap_b1' | 'rest_api' | 'manual';

/** Order lifecycle states (15-state saga) */
export type SagaStep =
  | 'PO_RECEIVED'
  | 'PO_CONFIRMED'
  | 'ACK_QUEUED'
  | 'ACK_SENT'
  | 'ACK_DELIVERED'
  | 'SHIP_READY'
  | 'ASN_QUEUED'
  | 'ASN_SENT'
  | 'ASN_DELIVERED'
  | 'INVOICE_READY'
  | 'INVOICE_QUEUED'
  | 'INVOICE_SENT'
  | 'INVOICE_DELIVERED'
  | 'COMPLETED'
  | 'FAILED';

/** Order status */
export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'INVOICED'
  | 'COMPLETED'
  | 'CANCELLED';

/** Connection modes */
export type ConnectionMode = 'sandbox' | 'uat' | 'production';

/** Resync states */
export type ResyncStatus =
  | 'REQUESTED'
  | 'VALIDATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'DENIED'
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARTIAL_FAIL'
  | 'REQUIRES_REVIEW';

/** Outbox event types */
export type OutboxEventType =
  | 'ORDER_CONFIRMED'
  | 'SHIPMENT_CREATED'
  | 'INVOICE_CREATED'
  | 'INBOUND_PO_RECEIVED'
  | 'RESYNC_INITIATED'
  | 'CONNECTION_STATUS_CHANGED';

/** Audit log actions */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'CONFIRM'
  | 'SHIP'
  | 'INVOICE'
  | 'RESYNC'
  | 'LOGIN'
  | 'IMPERSONATE';

/** Request context passed through middleware */
export interface RequestContext {
  tenantId: string;
  userId: string;
  correlationId: string;
  role: string;
}

// CA Platform types
export * from './compliance.js';
