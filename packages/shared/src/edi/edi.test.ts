import { describe, it, expect } from 'vitest';
import { parseX12, extractPOData } from './x12-parser.js';
import { generate855, generate856, generate810 } from './x12-generator.js';
import { parseJsonOrder, generateJsonAcknowledgment } from './json-rest-adapter.js';
import { parseCxmlOrderRequest } from './cxml-adapter.js';

describe('X12 Parser', () => {
  const sampleX12 = [
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
  ].join('\n');

  it('parses X12 document', () => {
    const result = parseX12(sampleX12);
    expect(result.success).toBe(true);
    expect(result.document).toBeDefined();
    expect(result.document!.standard).toBe('X12');
    expect(result.document!.document_type).toBe('PO_850');
    expect(result.document!.sender_id).toBe('SENDER');
  });

  it('extracts PO data from parsed document', () => {
    const parseResult = parseX12(sampleX12);
    const data = extractPOData(parseResult.document!);
    expect(data.po_number).toBe('PO-12345');
    expect((data.line_items as Array<Record<string, unknown>>).length).toBe(2);
  });

  it('handles empty document', () => {
    const result = parseX12('');
    expect(result.success).toBe(false);
  });
});

describe('X12 Generator', () => {
  it('generates 855 PO Acknowledgment', () => {
    const result = generate855({
      sender_id: 'FACTORY',
      receiver_id: 'BUYER',
      control_number: '1',
      po_number: 'PO-123',
      po_date: '20240101',
      ack_status: 'AC',
      test_mode: true,
    });
    expect(result.success).toBe(true);
    expect(result.document).toContain('ST*855');
    expect(result.document).toContain('BAK*00*AC*PO-123');
  });

  it('generates 856 ASN', () => {
    const result = generate856({
      sender_id: 'FACTORY',
      receiver_id: 'BUYER',
      control_number: '2',
      shipment_id: 'SHIP-001',
      po_number: 'PO-123',
      ship_date: '20240115',
      carrier_name: 'FedEx',
      tracking_number: 'TRACK123',
      test_mode: true,
    });
    expect(result.success).toBe(true);
    expect(result.document).toContain('ST*856');
    expect(result.document).toContain('BSN*00*SHIP-001');
  });

  it('generates 810 Invoice', () => {
    const result = generate810({
      sender_id: 'FACTORY',
      receiver_id: 'BUYER',
      control_number: '3',
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
        },
      ],
      test_mode: true,
    });
    expect(result.success).toBe(true);
    expect(result.document).toContain('ST*810');
    expect(result.document).toContain('BIG*20240120*INV-001');
    expect(result.document).toContain('TDS*75000');
  });
});

describe('JSON REST Adapter', () => {
  it('parses standard JSON order', () => {
    const result = parseJsonOrder({
      po_number: 'PO-100',
      order_date: '2024-01-01',
      currency: 'INR',
      total: 5000,
      line_items: [
        { sku: 'SKU-1', quantity: 10, price: 500, uom: 'EA' },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data!.po_number).toBe('PO-100');
    expect(
      (result.data!.line_items as Array<Record<string, unknown>>)[0]
        .buyer_sku,
    ).toBe('SKU-1');
  });

  it('normalizes alternate field names', () => {
    const result = parseJsonOrder({
      order_number: 'ORD-200',
      created_at: '2024-02-01',
      items: [{ part_number: 'P-1', qty: 5 }],
    });
    expect(result.success).toBe(true);
    expect(result.data!.po_number).toBe('ORD-200');
  });

  it('generates JSON acknowledgment', () => {
    const result = generateJsonAcknowledgment({
      order_id: 'ORD-1',
      status: 'accepted',
    });
    expect(result.success).toBe(true);
    const parsed = JSON.parse(result.document!);
    expect(parsed.type).toBe('order_acknowledgment');
    expect(parsed.status).toBe('accepted');
  });
});

describe('cXML Adapter', () => {
  it('parses basic cXML order', () => {
    const xml = `<OrderRequest>
      <OrderRequestHeader orderID="PO-500" orderDate="2024-01-01">
        <Total><Money currency="USD">1000.00</Money></Total>
      </OrderRequestHeader>
      <ItemOut quantity="10">
        <SupplierPartID>SUP-1</SupplierPartID>
        <Description>Test Item</Description>
        <UnitPrice><Money currency="USD">100.00</Money></UnitPrice>
      </ItemOut>
    </OrderRequest>`;
    const result = parseCxmlOrderRequest(xml);
    expect(result.success).toBe(true);
    expect(result.data!.po_number).toBe('PO-500');
  });
});
