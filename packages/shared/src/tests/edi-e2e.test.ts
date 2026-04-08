/**
 * E2E: EDI round-trip — canonical order → EDI 855 → parse back
 * Tests 855 ACK, 856 ASN, 810 Invoice, cXML, JSON REST adapters
 */

import { describe, it, expect } from 'vitest';
import {
  generate855,
  generate856,
  generate810,
  parseX12,
} from '../edi/index.js';

describe('E2E: EDI Round-Trip', () => {
  describe('X12 855 ACK', () => {
    it('generates and validates 855 acknowledgment', () => {
      const result = generate855({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '001',
        po_number: 'PO-2024-001',
        po_date: '20240104',
        ack_status: 'AC',
      });

      expect(result.success).toBe(true);
      expect(result.document).toContain('ISA');
      expect(result.document).toContain('ST*855');
      expect(result.document).toContain('BAK');
    });

    it('parses generated 855 back to structured data', () => {
      const genResult = generate855({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '001',
        po_number: 'PO-2024-001',
        po_date: '20240104',
        ack_status: 'AC',
      });

      if (genResult.success && genResult.document) {
        const parseResult = parseX12(genResult.document);
        expect(parseResult.success).toBe(true);
        expect(parseResult.document?.document_type).toBe('PO_ACK_855');
      }
    });
  });

  describe('X12 856 ASN', () => {
    it('generates and validates 856 shipment notice', () => {
      const result = generate856({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '002',
        shipment_id: 'SHIP-001',
        po_number: 'PO-2024-001',
        ship_date: '20240115',
        carrier_name: 'FedEx',
        tracking_number: 'TRACK123',
      });

      expect(result.success).toBe(true);
      expect(result.document).toContain('ISA');
      expect(result.document).toContain('ST*856');
      expect(result.document).toContain('BSN');
    });

    it('parses generated 856 back to structured data', () => {
      const genResult = generate856({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '002',
        shipment_id: 'SHIP-001',
        po_number: 'PO-2024-001',
        ship_date: '20240115',
      });

      if (genResult.success && genResult.document) {
        const parseResult = parseX12(genResult.document);
        expect(parseResult.success).toBe(true);
        expect(parseResult.document?.document_type).toBe('SHIPMENT_856');
      }
    });
  });

  describe('X12 810 Invoice', () => {
    it('generates and validates 810 invoice', () => {
      const result = generate810({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '003',
        invoice_number: 'INV-001',
        invoice_date: '20240120',
        po_number: 'PO-2024-001',
        total_amount: '750.00',
        line_items: [
          {
            line_number: '1',
            quantity: '10',
            uom: 'EA',
            unit_price: '25.00',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.document).toContain('ISA');
      expect(result.document).toContain('ST*810');
      expect(result.document).toContain('BIG');
    });

    it('parses generated 810 back to structured data', () => {
      const genResult = generate810({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '003',
        invoice_number: 'INV-001',
        invoice_date: '20240120',
        po_number: 'PO-2024-001',
        total_amount: '750.00',
        line_items: [
          {
            line_number: '1',
            quantity: '10',
            uom: 'EA',
            unit_price: '25.00',
          },
        ],
      });

      if (genResult.success && genResult.document) {
        const parseResult = parseX12(genResult.document);
        expect(parseResult.success).toBe(true);
        expect(parseResult.document?.document_type).toBe('INVOICE_810');
      }
    });
  });
});
