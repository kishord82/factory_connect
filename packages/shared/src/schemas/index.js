/**
 * FactoryConnect — Zod Canonical Schemas
 * Validation schemas for all canonical entities matching DB tables.
 * Used for API request/response validation, source adapter output, and tests.
 */
import { z } from 'zod';
// ═══════════════════════════════════════════════════════════════════
// ENUMS (matching PostgreSQL ENUM types)
// ═══════════════════════════════════════════════════════════════════
export const SourceTypeSchema = z.enum(['tally', 'zoho', 'sap_b1', 'rest_api', 'manual']);
export const OrderStatusSchema = z.enum([
    'DRAFT',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'INVOICED',
    'COMPLETED',
    'CANCELLED',
]);
export const SagaStepSchema = z.enum([
    'PO_RECEIVED',
    'PO_CONFIRMED',
    'ACK_QUEUED',
    'ACK_SENT',
    'ACK_DELIVERED',
    'SHIP_READY',
    'ASN_QUEUED',
    'ASN_SENT',
    'ASN_DELIVERED',
    'INVOICE_READY',
    'INVOICE_QUEUED',
    'INVOICE_SENT',
    'INVOICE_DELIVERED',
    'COMPLETED',
    'FAILED',
]);
export const ConnectionModeSchema = z.enum(['sandbox', 'uat', 'production']);
export const ResyncStatusSchema = z.enum([
    'REQUESTED',
    'VALIDATED',
    'APPROVED',
    'REJECTED',
    'DENIED',
    'QUEUED',
    'IN_PROGRESS',
    'COMPLETED',
    'PARTIAL_FAIL',
    'REQUIRES_REVIEW',
]);
export const OutboxEventTypeSchema = z.enum([
    'ORDER_CONFIRMED',
    'SHIPMENT_CREATED',
    'INVOICE_CREATED',
    'INBOUND_PO_RECEIVED',
    'RESYNC_INITIATED',
    'CONNECTION_STATUS_CHANGED',
]);
export const AuditActionSchema = z.enum([
    'CREATE',
    'UPDATE',
    'DELETE',
    'CONFIRM',
    'SHIP',
    'INVOICE',
    'RESYNC',
    'LOGIN',
    'IMPERSONATE',
]);
// ═══════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════════════════════
export const UuidSchema = z.string().uuid();
export const AddressSchema = z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(2).max(3),
    phone: z.string().optional(),
    email: z.string().email().optional(),
});
export const ContactSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
});
export const PaginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
});
export const DateRangeSchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});
// ═══════════════════════════════════════════════════════════════════
// LINE ITEM SCHEMA
// ═══════════════════════════════════════════════════════════════════
export const LineItemSchema = z.object({
    line_number: z.number().int().positive(),
    buyer_sku: z.string().min(1).max(100),
    factory_sku: z.string().max(100).optional(),
    description: z.string().optional(),
    quantity_ordered: z.number().positive(),
    quantity_uom: z.string().max(10).default('EA'),
    unit_price: z.number().nonnegative(),
    line_total: z.number().nonnegative(),
    upc: z.string().max(14).optional(),
    hsn_code: z.string().max(10).optional(),
});
export const LineItemCreateSchema = LineItemSchema.omit({});
// ═══════════════════════════════════════════════════════════════════
// CANONICAL ORDER SCHEMAS
// ═══════════════════════════════════════════════════════════════════
export const CanonicalOrderCreateSchema = z.object({
    buyer_id: UuidSchema,
    connection_id: UuidSchema,
    buyer_po_number: z.string().min(1).max(100),
    factory_order_number: z.string().max(100).optional(),
    order_date: z.coerce.date(),
    requested_ship_date: z.coerce.date().optional(),
    ship_to: AddressSchema.optional(),
    bill_to: AddressSchema.optional(),
    buyer_contact: ContactSchema.optional(),
    currency: z.string().length(3).default('INR'),
    subtotal: z.number().nonnegative(),
    tax_amount: z.number().nonnegative().default(0),
    tax_config: z.record(z.unknown()).optional(),
    total_amount: z.number().nonnegative(),
    source_type: SourceTypeSchema,
    source_raw_payload: z.string().optional(),
    source_claim_uri: z.string().max(500).optional(),
    mapping_config_version: z.number().int().positive().default(1),
    idempotency_key: z.string().max(255).optional(),
    line_items: z.array(LineItemSchema).min(1),
});
export const CanonicalOrderSchema = CanonicalOrderCreateSchema.extend({
    id: UuidSchema,
    factory_id: UuidSchema,
    status: OrderStatusSchema,
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
}).omit({ line_items: true });
export const CanonicalOrderWithItemsSchema = CanonicalOrderSchema.extend({
    line_items: z.array(LineItemSchema.extend({
        id: UuidSchema,
        order_id: UuidSchema,
        factory_id: UuidSchema,
        created_at: z.coerce.date(),
    })),
});
export const CanonicalOrderUpdateSchema = z.object({
    factory_order_number: z.string().max(100).optional(),
    requested_ship_date: z.coerce.date().optional(),
    ship_to: AddressSchema.optional(),
    bill_to: AddressSchema.optional(),
    buyer_contact: ContactSchema.optional(),
    status: OrderStatusSchema.optional(),
});
export const OrderListQuerySchema = PaginationSchema.extend({
    status: OrderStatusSchema.optional(),
    buyer_id: UuidSchema.optional(),
    connection_id: UuidSchema.optional(),
    from_date: z.coerce.date().optional(),
    to_date: z.coerce.date().optional(),
    search: z.string().max(200).optional(),
});
// ═══════════════════════════════════════════════════════════════════
// CANONICAL SHIPMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════
export const ShipmentPackSchema = z.object({
    sscc: z.string().max(20).optional(),
    pack_type: z.string().max(20).default('CARTON'),
    weight: z.number().nonnegative().optional(),
    items: z.array(z.object({
        line_item_id: UuidSchema.optional(),
        buyer_sku: z.string().min(1),
        quantity: z.number().positive(),
    })),
});
export const CanonicalShipmentCreateSchema = z.object({
    order_id: UuidSchema,
    connection_id: UuidSchema,
    shipment_date: z.coerce.date(),
    carrier_name: z.string().max(100).optional(),
    tracking_number: z.string().max(100).optional(),
    ship_from: AddressSchema.optional(),
    ship_to: AddressSchema.optional(),
    weight: z.number().nonnegative().optional(),
    weight_uom: z.string().max(5).default('KG'),
    packs: z.array(ShipmentPackSchema).optional(),
});
export const CanonicalShipmentSchema = CanonicalShipmentCreateSchema.extend({
    id: UuidSchema,
    factory_id: UuidSchema,
    status: z.string().max(20),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
}).omit({ packs: true });
export const CanonicalShipmentWithPacksSchema = CanonicalShipmentSchema.extend({
    packs: z.array(ShipmentPackSchema.extend({
        id: UuidSchema,
        shipment_id: UuidSchema,
        factory_id: UuidSchema,
        created_at: z.coerce.date(),
    })),
});
// ═══════════════════════════════════════════════════════════════════
// CANONICAL INVOICE SCHEMAS
// ═══════════════════════════════════════════════════════════════════
export const InvoiceLineItemSchema = z.object({
    buyer_sku: z.string().min(1),
    factory_sku: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative(),
    line_total: z.number().nonnegative(),
    hsn_code: z.string().max(10).optional(),
    tax_rate: z.number().nonnegative().optional(),
    tax_amount: z.number().nonnegative().optional(),
});
export const TaxBreakdownSchema = z.object({
    cgst_rate: z.number().nonnegative().optional(),
    cgst_amount: z.number().nonnegative().optional(),
    sgst_rate: z.number().nonnegative().optional(),
    sgst_amount: z.number().nonnegative().optional(),
    igst_rate: z.number().nonnegative().optional(),
    igst_amount: z.number().nonnegative().optional(),
    cess_rate: z.number().nonnegative().optional(),
    cess_amount: z.number().nonnegative().optional(),
});
export const CanonicalInvoiceCreateSchema = z.object({
    order_id: UuidSchema,
    shipment_id: UuidSchema.optional(),
    connection_id: UuidSchema,
    invoice_number: z.string().min(1).max(100),
    invoice_date: z.coerce.date(),
    due_date: z.coerce.date().optional(),
    subtotal: z.number().nonnegative(),
    tax_amount: z.number().nonnegative(),
    tax_breakdown: TaxBreakdownSchema.optional(),
    total_amount: z.number().nonnegative(),
    line_items: z.array(InvoiceLineItemSchema).min(1),
});
export const CanonicalInvoiceSchema = CanonicalInvoiceCreateSchema.extend({
    id: UuidSchema,
    factory_id: UuidSchema,
    status: z.string().max(20),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
});
// ═══════════════════════════════════════════════════════════════════
// CONNECTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════
export const ConnectionCreateSchema = z.object({
    buyer_id: UuidSchema,
    source_type: SourceTypeSchema,
    connection_mode: ConnectionModeSchema,
    buyer_endpoint: z.string().max(500).optional(),
    protocol: z.string().max(20).default('REST'),
    credentials: z.record(z.unknown()).optional(),
    tax_config: z.record(z.unknown()).optional(),
    currency_config: z.record(z.unknown()).optional(),
    barcode_config: z.record(z.unknown()).optional(),
    partial_shipment_allowed: z.boolean().default(false),
    sla_ack_hours: z.number().int().positive().optional(),
    sla_ship_hours: z.number().int().positive().optional(),
    sla_invoice_hours: z.number().int().positive().optional(),
});
export const ConnectionSchema = ConnectionCreateSchema.extend({
    id: UuidSchema,
    factory_id: UuidSchema,
    status: z.string().max(20),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
});
// ═══════════════════════════════════════════════════════════════════
// FACTORY & BUYER SCHEMAS
// ═══════════════════════════════════════════════════════════════════
export const FactoryCreateSchema = z.object({
    name: z.string().min(1).max(255),
    gstin: z.string().max(20).optional(),
    pan: z.string().max(10).optional(),
    address: AddressSchema.optional(),
    contact_email: z.string().email(),
    contact_phone: z.string().optional(),
    timezone: z.string().default('Asia/Kolkata'),
    plan: z.string().max(50).default('starter'),
});
export const FactorySchema = FactoryCreateSchema.extend({
    id: UuidSchema,
    status: z.string().max(20),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
});
export const BuyerCreateSchema = z.object({
    name: z.string().min(1).max(255),
    buyer_code: z.string().min(1).max(50),
    platform: z.string().max(50),
    country: z.string().max(3).default('US'),
    edi_qualifier: z.string().max(10).optional(),
    edi_id: z.string().max(20).optional(),
    contact_email: z.string().email().optional(),
});
export const BuyerSchema = BuyerCreateSchema.extend({
    id: UuidSchema,
    factory_id: UuidSchema,
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
});
// ═══════════════════════════════════════════════════════════════════
// AUDIT & OUTBOX SCHEMAS
// ═══════════════════════════════════════════════════════════════════
export const AuditLogEntrySchema = z.object({
    id: z.string(),
    tenant_id: UuidSchema,
    action: AuditActionSchema,
    entity_type: z.string().min(1),
    entity_id: UuidSchema,
    actor_id: z.string().min(1),
    old_record: z.record(z.unknown()).nullable(),
    new_record: z.record(z.unknown()).nullable(),
    metadata: z.record(z.unknown()).optional(),
    hash: z.string(),
    prev_hash: z.string().nullable(),
    created_at: z.coerce.date(),
});
export const OutboxEventSchema = z.object({
    aggregate_type: z.string().min(1).max(50),
    aggregate_id: UuidSchema,
    event_type: OutboxEventTypeSchema,
    payload: z.record(z.unknown()),
});
// ═══════════════════════════════════════════════════════════════════
// MAPPING CONFIG SCHEMA
// ═══════════════════════════════════════════════════════════════════
export const FieldMappingSchema = z.object({
    source_field: z.string().min(1),
    target_field: z.string().min(1),
    transform: z.string().optional(),
    default_value: z.unknown().optional(),
    required: z.boolean().default(false),
});
export const MappingConfigSchema = z.object({
    id: UuidSchema,
    factory_id: UuidSchema,
    connection_id: UuidSchema,
    mapping_type: z.string().max(50),
    version: z.number().int().positive(),
    field_mappings: z.array(FieldMappingSchema),
    is_active: z.boolean().default(true),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
});
// ═══════════════════════════════════════════════════════════════════
// RESYNC SCHEMAS
// ═══════════════════════════════════════════════════════════════════
export const ResyncRequestCreateSchema = z.object({
    connection_id: UuidSchema,
    resync_type: z.string().max(50),
    message_ids: z.array(UuidSchema).min(1),
    reason: z.string().max(500),
});
export const ResyncRequestSchema = ResyncRequestCreateSchema.extend({
    id: UuidSchema,
    factory_id: UuidSchema,
    status: ResyncStatusSchema,
    requested_by: z.string(),
    approved_by: z.string().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
});
// CA Platform schemas
export * from './compliance/index.js';
//# sourceMappingURL=index.js.map