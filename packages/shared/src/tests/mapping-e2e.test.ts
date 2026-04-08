/**
 * E2E: Mapping pipeline — source data → mapping config → transformed canonical output
 * Tests with real Tally and Zoho-like source structures
 */

import { describe, it, expect } from 'vitest';
import { applyMapping } from '../mapping/index.js';
import type { MappingConfig } from '../mapping/types.js';

describe('E2E: Mapping Pipeline', () => {
  describe('Tally → Canonical Order', () => {
    it('should map simple Tally data to canonical order', () => {
      const tallySourceData = {
        po_number: 'PO-2024-001',
        order_date: '04/Jan/2024',
        buyer_name: 'GlobalBuyer Inc',
        buyer_address: '123 Market Street, New York, NY 10001',
        line_items: [
          {
            item_name: 'Widget A',
            quantity: 100,
            unit_price: 25.50,
          },
        ],
      };

      const mappingConfig: MappingConfig = {
        id: 'tally-canonical-v1',
        name: 'Tally to Canonical Order',
        version: 1,
        source_type: 'tally',
        target_type: 'canonical_order',
        field_mappings: [
          {
            source_path: 'po_number',
            target_path: 'buyer_po_number',
            is_required: true,
          },
          {
            source_path: 'order_date',
            target_path: 'order_date',
            is_required: true,
          },
          {
            source_path: 'buyer_name',
            target_path: 'buyer_name',
            is_required: false,
          },
        ],
        is_active: true,
      };

      const result = applyMapping(tallySourceData, mappingConfig);

      expect(result.success).toBe(true);
      expect(result.data.buyer_po_number).toBe('PO-2024-001');
      expect(result.data.order_date).toBe('04/Jan/2024');
      expect(result.data.buyer_name).toBe('GlobalBuyer Inc');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incompleteData = {
        buyer_name: 'GlobalBuyer Inc',
      };

      const mappingConfig: MappingConfig = {
        id: 'test-required',
        name: 'Test Required Fields',
        version: 1,
        source_type: 'tally',
        target_type: 'canonical_order',
        field_mappings: [
          {
            source_path: 'po_number',
            target_path: 'buyer_po_number',
            is_required: true,
          },
          {
            source_path: 'buyer_name',
            target_path: 'buyer_name',
            is_required: false,
          },
        ],
        is_active: true,
      };

      const result = applyMapping(incompleteData, mappingConfig);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.path === 'buyer_po_number')).toBe(true);
    });

    it('should map nested paths with dot notation', () => {
      const sourceData = {
        order: {
          header: {
            po_number: 'PO-2024-002',
            date: '05/Jan/2024',
          },
          buyer: {
            name: 'Acme Corp',
          },
        },
      };

      const mappingConfig: MappingConfig = {
        id: 'nested-mapping',
        name: 'Nested Path Mapping',
        version: 1,
        source_type: 'tally',
        target_type: 'canonical_order',
        field_mappings: [
          {
            source_path: 'order.header.po_number',
            target_path: 'buyer_po_number',
            is_required: true,
          },
          {
            source_path: 'order.header.date',
            target_path: 'order_date',
            is_required: true,
          },
          {
            source_path: 'order.buyer.name',
            target_path: 'buyer_name',
            is_required: false,
          },
        ],
        is_active: true,
      };

      const result = applyMapping(sourceData, mappingConfig);

      expect(result.success).toBe(true);
      expect(result.data.buyer_po_number).toBe('PO-2024-002');
      expect(result.data.order_date).toBe('05/Jan/2024');
      expect(result.data.buyer_name).toBe('Acme Corp');
    });
  });

  describe('Zoho → Canonical Order', () => {
    it('should map Zoho data with alternative field names', () => {
      const zohoData = {
        order_id: 'ZO-001',
        order_created_at: '2024-01-06',
        customer_name: 'Zoho Customer',
        items: [
          {
            product_id: 'P001',
            quantity_ordered: 50,
            price_per_unit: 100.00,
          },
        ],
      };

      const mappingConfig: MappingConfig = {
        id: 'zoho-canonical-v1',
        name: 'Zoho to Canonical Order',
        version: 1,
        source_type: 'zoho',
        target_type: 'canonical_order',
        field_mappings: [
          {
            source_path: 'order_id',
            target_path: 'buyer_po_number',
            is_required: true,
          },
          {
            source_path: 'order_created_at',
            target_path: 'order_date',
            is_required: true,
          },
          {
            source_path: 'customer_name',
            target_path: 'buyer_name',
            is_required: false,
          },
        ],
        is_active: true,
      };

      const result = applyMapping(zohoData, mappingConfig);

      expect(result.success).toBe(true);
      expect(result.data.buyer_po_number).toBe('ZO-001');
      expect(result.data.order_date).toBe('2024-01-06');
    });
  });

  describe('Array handling', () => {
    it('should map array elements with bracket notation', () => {
      const sourceData = {
        items: [
          {
            sku: 'SKU-001',
            quantity: 10,
          },
        ],
      };

      const mappingConfig: MappingConfig = {
        id: 'array-test',
        name: 'Array Test',
        version: 1,
        source_type: 'json',
        target_type: 'canonical_order',
        field_mappings: [
          {
            source_path: 'items[0].sku',
            target_path: 'first_item_sku',
            is_required: false,
          },
          {
            source_path: 'items[0].quantity',
            target_path: 'first_item_quantity',
            is_required: false,
          },
        ],
        is_active: true,
      };

      const result = applyMapping(sourceData, mappingConfig);

      expect(result.success).toBe(true);
      expect(result.data.first_item_sku).toBe('SKU-001');
      expect(result.data.first_item_quantity).toBe(10);
    });
  });

  describe('Unmapped fields detection', () => {
    it('should detect unmapped source fields', () => {
      const sourceData = {
        po_number: 'PO-123',
        extra_field: 'should not be mapped',
        another_field: 'also unmapped',
      };

      const mappingConfig: MappingConfig = {
        id: 'unmapped-test',
        name: 'Unmapped Fields Test',
        version: 1,
        source_type: 'test',
        target_type: 'canonical_order',
        field_mappings: [
          {
            source_path: 'po_number',
            target_path: 'buyer_po_number',
            is_required: true,
          },
        ],
        is_active: true,
      };

      const result = applyMapping(sourceData, mappingConfig);

      expect(result.success).toBe(true);
      expect(result.unmapped_fields).toContain('extra_field');
      expect(result.unmapped_fields).toContain('another_field');
    });
  });
});
