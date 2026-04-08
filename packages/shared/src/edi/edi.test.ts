import { describe, it, expect } from 'vitest';
import {
  parseX12,
  parseSegment,
  parseIsaSegment,
  parseGsSegment,
  validateEnvelope,
  extractTransactionSets,
  extractPOData,
} from './x12-parser.js';
import {
  padField,
  padFieldNum,
  formatEdiDate,
  formatEdiTime,
  generate855,
  generate856,
  generate810,
} from './x12-generator.js';
import {
  parseJsonOrder,
  ediToJson,
  jsonToEdi,
  mapSegmentToJson,
  generateJsonAcknowledgment,
  generateJsonShipNotice,
} from './json-rest-adapter.js';
import {
  parseCxmlOrderRequest,
  buildCxmlEnvelope,
  generateCxmlOrderConfirmation,
  generateCxmlShipNotice,
} from './cxml-adapter.js';

// Sample X12 documents
const sampleX12_850 = [
  'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240101*1200*U*00401*000000001*0*T*:~',
  'GS*PO*SENDER*RECEIVER*20240101*1200*1*X*004010~',
  'ST*850*0001~',
  'BEG*00*NE*PO-12345**20240101~',
  'PO1*1*10*EA*25.00***VP*SKU-001~',
  'PID*F****Widget A~',
  'PO1*2*5*EA*50.00***VP*SKU-002~',
  'CTT*2~',
  'SE*7*0001~',
  'GE*1*1~',
  'IEA*1*000000001~',
].join('~');

const sampleX12_855 = [
  'ISA*00*          *00*          *ZZ*SUPPLIER       *ZZ*BUYER         *240101*1200*U*00401*000000002*0*P*:~',
  'GS*PR*SUPPLIER*BUYER*20240101*1200*2*X*004010~',
  'ST*855*0001~',
  'BAK*00*AC*PO-999**20240101~',
  'SE*3*0001~',
  'GE*1*2~',
  'IEA*1*000000002~',
].join('~');

describe('X12 Parser', () => {
  describe('parseX12', () => {
    it('parses X12 850 document', () => {
      const result = parseX12(sampleX12_850);
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.standard).toBe('X12');
      expect(result.document!.document_type).toBe('PO_850');
      expect(result.document!.sender_id).toBe('SENDER');
      expect(result.document!.receiver_id).toBe('RECEIVER');
    });

    it('parses X12 855 document', () => {
      const result = parseX12(sampleX12_855);
      expect(result.success).toBe(true);
      expect(result.document!.document_type).toBe('PO_ACK_855');
    });

    it('handles empty document gracefully', () => {
      const result = parseX12('');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('extracts control number from ISA segment', () => {
      const result = parseX12(sampleX12_850);
      expect(result.document!.control_number).toBe('000000001');
    });
  });

  describe('parseSegment', () => {
    it('parses single segment', () => {
      const segment = parseSegment('BEG*00*NE*PO-123**20240101', '*');
      expect(segment.id).toBe('BEG');
      expect(segment.elements.length).toBe(5);
      expect(segment.elements[2]).toBe('PO-123');
    });
  });

  describe('parseIsaSegment', () => {
    it('extracts ISA fields', () => {
      const result = parseX12(sampleX12_850);
      const isaSeg = result.document!.segments.find((s) => s.id === 'ISA');
      expect(isaSeg).toBeDefined();
      const isa = parseIsaSegment(isaSeg!);
      expect(isa.senderQualifier).toBe('ZZ');
      expect(isa.version).toBe('00401');
    });
  });

  describe('parseGsSegment', () => {
    it('extracts GS fields', () => {
      const result = parseX12(sampleX12_850);
      const gsSeg = result.document!.segments.find((s) => s.id === 'GS');
      expect(gsSeg).toBeDefined();
      const gs = parseGsSegment(gsSeg!);
      expect(gs.functionalId).toBe('PO');
      expect(gs.version).toBe('004010');
    });
  });

  describe('extractPOData', () => {
    it('extracts PO data from 850 document', () => {
      const parseResult = parseX12(sampleX12_850);
      const data = extractPOData(parseResult.document!);
      expect(data.po_number).toBe('PO-12345');
      expect(data.po_date).toBe('20240101');
      expect((data.line_items as Record<string, unknown>[])).toHaveLength(2);
    });

    it('extracts line item details', () => {
      const parseResult = parseX12(sampleX12_850);
      const data = extractPOData(parseResult.document!);
      const items = data.line_items as Array<Record<string, unknown>>;
      expect(items[0].buyer_sku).toBe('SKU-001');
      expect(items[0].quantity).toBe('10');
      expect(items[0].unit_price).toBe('25.00');
    });
  });

  describe('validateEnvelope', () => {
    it('validates correct envelope structure', () => {
      const parseResult = parseX12(sampleX12_850);
      const validation = validateEnvelope(parseResult.document!);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('detects missing ISA segment', () => {
      const result = parseX12(sampleX12_850);
      const doc = result.document!;
      // Remove ISA
      doc.segments = doc.segments.filter((s) => s.id !== 'ISA');
      const validation = validateEnvelope(doc);
      expect(validation.valid).toBe(false);
    });
  });

  describe('extractTransactionSets', () => {
    it('extracts transaction sets from multi-txn document', () => {
      const result = parseX12(sampleX12_850);
      const txns = extractTransactionSets(result.document!);
      expect(txns.length).toBeGreaterThan(0);
      expect(txns[0].document_type).toBe('PO_850');
    });
  });
});

describe('X12 Generator', () => {
  describe('Field padding utilities', () => {
    it('pads string right', () => {
      expect(padField('AB', 5, ' ', 'right')).toBe('AB   ');
    });

    it('pads string left', () => {
      expect(padField('AB', 5, ' ', 'left')).toBe('   AB');
    });

    it('pads numeric with leading zeros', () => {
      expect(padFieldNum('1', 9)).toBe('000000001');
      expect(padFieldNum(123, 5)).toBe('00123');
    });
  });

  describe('Date/time formatting', () => {
    it('formats date as YYMMDD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatEdiDate(date);
      expect(formatted).toBe('240115');
    });

    it('formats date as CCYYMMDD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatEdiDate(date, true);
      expect(formatted).toBe('20240115');
    });

    it('formats time as HHMM', () => {
      const date = new Date('2024-01-15T10:30:45Z');
      const formatted = formatEdiTime(date);
      expect(formatted).toBe('1030');
    });
  });

  describe('generate855', () => {
    it('generates valid 855 document', () => {
      const result = generate855({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '001',
        po_number: 'PO-123',
        po_date: '20240101',
        ack_status: 'AC',
      });
      expect(result.success).toBe(true);
      expect(result.document).toContain('ST*855');
      expect(result.document).toContain('BAK');
    });

    it('generates 855 with line items', () => {
      const result = generate855({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '001',
        po_number: 'PO-123',
        po_date: '20240101',
        ack_status: 'AC',
        line_items: [
          { line_number: '1', quantity: '10', uom: 'EA', status: 'AC' },
          { line_number: '2', quantity: '5', uom: 'EA', status: 'AC' },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.document).toContain('PO1');
      expect(result.document).toContain('ACK');
    });
  });

  describe('generate856', () => {
    it('generates valid 856 ASN', () => {
      const result = generate856({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '002',
        shipment_id: 'SHIP-001',
        po_number: 'PO-123',
        ship_date: '20240115',
        carrier_name: 'FedEx',
        tracking_number: 'TRACK123',
      });
      expect(result.success).toBe(true);
      expect(result.document).toContain('ST*856');
      expect(result.document).toContain('BSN');
    });

    it('generates 856 with packs', () => {
      const result = generate856({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '002',
        shipment_id: 'SHIP-001',
        po_number: 'PO-123',
        ship_date: '20240115',
        packs: [
          {
            sscc: '12345678901234567890',
            items: [{ sku: 'SKU-1', quantity: '10', uom: 'EA' }],
          },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.document).toContain('MAN');
      expect(result.document).toContain('LIN');
    });
  });

  describe('generate810', () => {
    it('generates valid 810 invoice', () => {
      const result = generate810({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '003',
        invoice_number: 'INV-001',
        invoice_date: '20240120',
        po_number: 'PO-123',
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
      expect(result.document).toContain('ST*810');
      expect(result.document).toContain('BIG');
      expect(result.document).toContain('IT1');
    });

    it('handles multiple line items', () => {
      const result = generate810({
        sender_id: 'FACTORY',
        receiver_id: 'BUYER',
        control_number: '003',
        invoice_number: 'INV-001',
        invoice_date: '20240120',
        po_number: 'PO-123',
        total_amount: '750.00',
        line_items: [
          {
            line_number: '1',
            quantity: '10',
            uom: 'EA',
            unit_price: '25.00',
            description: 'Widget A',
          },
          {
            line_number: '2',
            quantity: '5',
            uom: 'EA',
            unit_price: '50.00',
            description: 'Widget B',
          },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.document).toContain('PID');
    });
  });
});

describe('JSON REST Adapter', () => {
  describe('parseJsonOrder', () => {
    it('parses standard JSON order format', () => {
      const result = parseJsonOrder({
        po_number: 'PO-100',
        order_date: '2024-01-01',
        currency: 'INR',
        total: 5000,
        line_items: [{ sku: 'SKU-1', quantity: 10, price: 500, uom: 'EA' }],
      });
      expect(result.success).toBe(true);
      expect(result.data!.po_number).toBe('PO-100');
      expect(result.data!.currency).toBe('INR');
    });

    it('normalizes alternate field names', () => {
      const result = parseJsonOrder({
        order_number: 'ORD-200',
        created_at: '2024-02-01',
        items: [{ part_number: 'P-1', qty: 5, price: 100 }],
      });
      expect(result.success).toBe(true);
      expect(result.data!.po_number).toBe('ORD-200');
    });

    it('normalizes shipping address variants', () => {
      const result1 = parseJsonOrder({
        id: 'ID1',
        ship_to: { city: 'NYC' },
      });
      expect(result1.data!.ship_to).toBeDefined();

      const result2 = parseJsonOrder({
        id: 'ID2',
        shipping_address: { city: 'LA' },
      });
      expect(result2.data!.ship_to).toBeDefined();
    });

    it('handles missing line items gracefully', () => {
      const result = parseJsonOrder({
        po_number: 'PO-50',
      });
      expect(result.success).toBe(true);
      expect(result.data!.line_items).toEqual([]);
    });
  });

  describe('ediToJson', () => {
    it('converts EDI document to JSON', () => {
      const parseResult = parseX12(sampleX12_850);
      const json = ediToJson(parseResult.document!);
      expect(json.standard).toBe('X12');
      expect(json.document_type).toBe('PO_850');
      expect(json.segments).toBeDefined();
    });
  });

  describe('jsonToEdi', () => {
    it('converts JSON back to EDI', () => {
      const parseResult = parseX12(sampleX12_850);
      const json = ediToJson(parseResult.document!);
      const edi = jsonToEdi(json, 'PO_850', {});
      expect(edi.standard).toBe('JSON_REST');
      expect(edi.segments.length).toBeGreaterThan(0);
    });
  });

  describe('mapSegmentToJson', () => {
    it('maps EDI segment to JSON with element fields', () => {
      const segment = parseSegment('BEG*00*NE*PO-123**20240101', '*');
      const json = mapSegmentToJson(segment);
      expect(json.id).toBe('BEG');
      expect(json.po_number).toBe('PO-123');
    });
  });

  describe('generateJsonAcknowledgment', () => {
    it('generates JSON acknowledgment', () => {
      const result = generateJsonAcknowledgment({
        order_id: 'ORD-1',
        status: 'accepted',
      });
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.document!);
      expect(parsed.type).toBe('order_acknowledgment');
      expect(parsed.status).toBe('accepted');
      expect(parsed.acknowledged_at).toBeDefined();
    });

    it('generates JSON ack with line items', () => {
      const result = generateJsonAcknowledgment({
        order_id: 'ORD-1',
        status: 'accepted',
        line_items: [
          { line_number: 1, status: 'accepted', quantity_accepted: 10 },
        ],
      });
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.document!);
      expect(parsed.line_items.length).toBe(1);
    });
  });

  describe('generateJsonShipNotice', () => {
    it('generates JSON ship notice', () => {
      const result = generateJsonShipNotice({
        order_id: 'ORD-1',
        shipment_id: 'SHIP-1',
        carrier: 'FedEx',
        tracking_number: 'TRACK123',
        ship_date: '2024-01-15',
        packs: [
          {
            sscc: '123456',
            items: [{ sku: 'SKU-1', quantity: 10 }],
          },
        ],
      });
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.document!);
      expect(parsed.type).toBe('advance_ship_notice');
      expect(parsed.packs.length).toBe(1);
    });
  });
});

describe('cXML Adapter', () => {
  describe('parseCxmlOrderRequest', () => {
    it('parses basic cXML order', () => {
      const xml = `<?xml version="1.0"?>
<OrderRequest>
  <OrderRequestHeader orderID="PO-500" orderDate="2024-01-01">
    <Total><Money currency="USD">1000.00</Money></Total>
  </OrderRequestHeader>
  <ItemOut quantity="10">
    <SupplierPartID>SUP-1</SupplierPartID>
    <Description>Test Item</Description>
  </ItemOut>
</OrderRequest>`;
      const result = parseCxmlOrderRequest(xml);
      expect(result.success).toBe(true);
      expect(result.data!.po_number).toBe('PO-500');
      expect(result.data!.currency).toBe('USD');
    });

    it('handles multiple line items', () => {
      const xml = `<?xml version="1.0"?>
<OrderRequest>
  <OrderRequestHeader orderID="PO-600" orderDate="2024-02-01">
    <Total><Money currency="INR">50000</Money></Total>
  </OrderRequestHeader>
  <ItemOut quantity="10">
    <SupplierPartID>SUP-1</SupplierPartID>
  </ItemOut>
  <ItemOut quantity="20">
    <SupplierPartID>SUP-2</SupplierPartID>
  </ItemOut>
</OrderRequest>`;
      const result = parseCxmlOrderRequest(xml);
      expect(result.success).toBe(true);
      expect((result.data!.line_items as unknown[]).length).toBe(2);
    });
  });

  describe('buildCxmlEnvelope', () => {
    it('wraps content in cXML envelope', () => {
      const content = '<Request></Request>';
      const result = buildCxmlEnvelope(content, {
        seller_id: 'FACTORY',
        buyer_id: 'BUYER',
        edi_version: '1.2.014',
        standard: 'cXML',
      });
      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<cXML');
      expect(result).toContain('FACTORY');
      expect(result).toContain('BUYER');
    });
  });

  describe('generateCxmlOrderConfirmation', () => {
    it('generates cXML order confirmation', () => {
      const result = generateCxmlOrderConfirmation({
        payload_id: 'PAYLOAD-1',
        order_id: 'PO-123',
        confirmation_status: 'AC',
      });
      expect(result.success).toBe(true);
      expect(result.document).toContain('<?xml version="1.0"?>');
      expect(result.document).toContain('ConfirmationRequest');
      expect(result.document).toContain('PO-123');
    });

    it('maps confirmation status codes', () => {
      const acResult = generateCxmlOrderConfirmation({
        payload_id: 'P1',
        order_id: 'O1',
        confirmation_status: 'AC',
      });
      expect(acResult.document).toContain('Accepted');

      const djResult = generateCxmlOrderConfirmation({
        payload_id: 'P2',
        order_id: 'O2',
        confirmation_status: 'DJ',
      });
      expect(djResult.document).toContain('Rejected');
    });
  });

  describe('generateCxmlShipNotice', () => {
    it('generates cXML ship notice', () => {
      const result = generateCxmlShipNotice({
        payload_id: 'PAYLOAD-1',
        po_number: 'PO-123',
        shipment_id: 'SHIP-1',
        carrier: 'FedEx',
        tracking_number: 'TRACK123',
        ship_date: '2024-01-15',
      });
      expect(result.success).toBe(true);
      expect(result.document).toContain('ShipNoticeRequest');
      expect(result.document).toContain('SHIP-1');
      expect(result.document).toContain('TRACK123');
    });

    it('includes pack items in ship notice', () => {
      const result = generateCxmlShipNotice({
        payload_id: 'P1',
        po_number: 'PO-1',
        shipment_id: 'SHIP-1',
        carrier: 'UPS',
        tracking_number: 'T1',
        ship_date: '2024-01-20',
        packs: [
          {
            sscc: 'SSCC1',
            items: [{ buyer_sku: 'SKU-1', quantity: 10 }],
          },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.document).toContain('ShipNoticeItem');
    });
  });
});
