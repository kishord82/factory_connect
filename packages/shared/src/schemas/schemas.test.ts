/**
 * TEST-004 through TEST-006: Zod Schema Validation Tests
 * Verifies canonical order, shipment, and invoice schema validation.
 */

import { describe, it, expect } from 'vitest';
import {
  CanonicalOrderCreateSchema,
  CanonicalShipmentCreateSchema,
  CanonicalInvoiceCreateSchema,
  AddressSchema,
  LineItemSchema,
  PaginationSchema,
  OrderListQuerySchema,
} from './index.js';

const validAddress = {
  name: 'Test Warehouse',
  line1: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  postal_code: '400001',
  country: 'IN',
};

const validLineItem = {
  line_number: 1,
  buyer_sku: 'SKU-001',
  quantity_ordered: 10,
  quantity_uom: 'EA',
  unit_price: 100,
  line_total: 1000,
};

describe('Zod Canonical Schemas', () => {
  describe('AddressSchema', () => {
    it('validates a complete address', () => {
      const result = AddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('rejects address missing required fields', () => {
      const result = AddressSchema.safeParse({ name: 'Test' });
      expect(result.success).toBe(false);
    });
  });

  describe('LineItemSchema', () => {
    it('validates a line item', () => {
      const result = LineItemSchema.safeParse(validLineItem);
      expect(result.success).toBe(true);
    });

    it('rejects negative quantities', () => {
      const result = LineItemSchema.safeParse({
        ...validLineItem,
        quantity_ordered: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TEST-004: CanonicalOrderCreateSchema', () => {
    const validOrder = {
      buyer_id: '550e8400-e29b-41d4-a716-446655440001',
      connection_id: '550e8400-e29b-41d4-a716-446655440002',
      buyer_po_number: 'PO-2024-001',
      order_date: '2024-06-15T10:00:00Z',
      currency: 'INR',
      subtotal: 1000,
      tax_amount: 180,
      total_amount: 1180,
      source_type: 'tally' as const,
      line_items: [validLineItem],
    };

    it('validates a complete order', () => {
      const result = CanonicalOrderCreateSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('rejects order without line items', () => {
      const result = CanonicalOrderCreateSchema.safeParse({
        ...validOrder,
        line_items: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects order with empty PO number', () => {
      const result = CanonicalOrderCreateSchema.safeParse({
        ...validOrder,
        buyer_po_number: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid source_type', () => {
      const result = CanonicalOrderCreateSchema.safeParse({
        ...validOrder,
        source_type: 'invalid_erp',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional fields', () => {
      const result = CanonicalOrderCreateSchema.safeParse({
        ...validOrder,
        ship_to: validAddress,
        bill_to: validAddress,
        factory_order_number: 'FC-001',
        requested_ship_date: '2024-06-20T00:00:00Z',
        idempotency_key: 'idem-key-001',
      });
      expect(result.success).toBe(true);
    });

    it('coerces date strings to Date objects', () => {
      const result = CanonicalOrderCreateSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order_date).toBeInstanceOf(Date);
      }
    });
  });

  describe('TEST-005: CanonicalShipmentCreateSchema', () => {
    const validShipment = {
      order_id: '550e8400-e29b-41d4-a716-446655440003',
      connection_id: '550e8400-e29b-41d4-a716-446655440004',
      shipment_date: '2024-06-18T10:00:00Z',
      carrier_name: 'BlueDart',
      tracking_number: 'BD123456789',
    };

    it('validates a shipment', () => {
      const result = CanonicalShipmentCreateSchema.safeParse(validShipment);
      expect(result.success).toBe(true);
    });

    it('validates shipment with packs', () => {
      const result = CanonicalShipmentCreateSchema.safeParse({
        ...validShipment,
        packs: [
          {
            sscc: '00012345678901234567',
            pack_type: 'CARTON',
            weight: 15.5,
            items: [{ buyer_sku: 'SKU-001', quantity: 10 }],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects shipment without order_id', () => {
      const { order_id, ...noOrder } = validShipment;
      const result = CanonicalShipmentCreateSchema.safeParse(noOrder);
      expect(result.success).toBe(false);
    });
  });

  describe('TEST-006: CanonicalInvoiceCreateSchema', () => {
    const validInvoice = {
      order_id: '550e8400-e29b-41d4-a716-446655440005',
      connection_id: '550e8400-e29b-41d4-a716-446655440006',
      invoice_number: 'INV-2024-001',
      invoice_date: '2024-06-19T10:00:00Z',
      subtotal: 1000,
      tax_amount: 180,
      total_amount: 1180,
      line_items: [
        {
          buyer_sku: 'SKU-001',
          quantity: 10,
          unit_price: 100,
          line_total: 1000,
        },
      ],
    };

    it('validates a complete invoice', () => {
      const result = CanonicalInvoiceCreateSchema.safeParse(validInvoice);
      expect(result.success).toBe(true);
    });

    it('validates invoice with tax breakdown', () => {
      const result = CanonicalInvoiceCreateSchema.safeParse({
        ...validInvoice,
        tax_breakdown: {
          cgst_rate: 9,
          cgst_amount: 90,
          sgst_rate: 9,
          sgst_amount: 90,
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects invoice with no line items', () => {
      const result = CanonicalInvoiceCreateSchema.safeParse({
        ...validInvoice,
        line_items: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PaginationSchema', () => {
    it('provides defaults', () => {
      const result = PaginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(25);
      }
    });

    it('coerces string numbers', () => {
      const result = PaginationSchema.safeParse({ page: '3', pageSize: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(50);
      }
    });

    it('rejects pageSize over 100', () => {
      const result = PaginationSchema.safeParse({ pageSize: 200 });
      expect(result.success).toBe(false);
    });
  });

  describe('OrderListQuerySchema', () => {
    it('accepts combined filters', () => {
      const result = OrderListQuerySchema.safeParse({
        page: 1,
        pageSize: 25,
        status: 'CONFIRMED',
        buyer_id: '550e8400-e29b-41d4-a716-446655440001',
        search: 'PO-2024',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = OrderListQuerySchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });
  });
});
