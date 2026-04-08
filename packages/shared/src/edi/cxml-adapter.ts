/**
 * C10: cXML adapter for SAP Ariba.
 * Supports cXML 1.2 protocol for order confirmation and ship notice.
 */
import type { EdiParseResult, EdiGenerationResult, EdiConfig } from './types.js';

/**
 * Simple XML regex helpers (no external XML parser to keep dependencies light).
 */
function extractXmlText(tag: string, content: string): string {
  const match = content.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return match?.[1] ?? '';
}

function extractXmlAttr(tag: string, attr: string, content: string): string {
  const match = content.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
  return match?.[1] ?? '';
}

function extractXmlBlock(tag: string, content: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'g');
  return content.match(regex) ?? [];
}

/**
 * Parse cXML OrderRequest.
 */
export function parseCxmlOrderRequest(xml: string): EdiParseResult {
  try {
    const data: Record<string, unknown> = {
      po_number: extractXmlAttr('OrderRequestHeader', 'orderID', xml),
      order_date: extractXmlAttr('OrderRequestHeader', 'orderDate', xml),
      currency: extractXmlAttr('Money', 'currency', xml) || 'USD',
      total_amount: extractXmlText('Money', xml),
    };

    // Extract line items
    const itemMatches = extractXmlBlock('ItemOut', xml);
    const lineItems: Record<string, unknown>[] = [];
    let lineNum = 1;
    for (const itemXml of itemMatches) {
      lineItems.push({
        line_number: lineNum++,
        quantity: extractXmlAttr('ItemOut', 'quantity', itemXml),
        buyer_sku: extractXmlText('SupplierPartID', itemXml) || extractXmlText('BuyerPartID', itemXml),
        description: extractXmlText('Description', itemXml),
        unit_price: extractXmlText('Money', itemXml),
      });
    }
    data.line_items = lineItems;

    return { success: true, data, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'cXML parse error'] };
  }
}

/**
 * Build cXML envelope wrapper with headers.
 */
export function buildCxmlEnvelope(content: string, config: EdiConfig): string {
  const ts = new Date().toISOString();
  const payloadId = `${config.seller_id}-${Date.now()}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML payloadID="${payloadId}" timestamp="${ts}">
  <Header>
    <From>
      <Credential domain="${config.seller_id}">
        <Identity>${config.seller_name ?? config.seller_id}</Identity>
      </Credential>
    </From>
    <To>
      <Credential domain="${config.buyer_id}">
        <Identity>${config.buyer_name ?? config.buyer_id}</Identity>
      </Credential>
    </To>
    <Sender>
      <Credential domain="${config.seller_id}">
        <Identity>${config.seller_name ?? config.seller_id}</Identity>
      </Credential>
      <UserAgent>FactoryConnect/1.0</UserAgent>
    </Sender>
  </Header>
${content}
</cXML>`;
}

/**
 * Generate cXML PO Acknowledgment (655).
 */
export function generateCxmlOrderConfirmation(data: {
  payload_id: string;
  order_id: string;
  confirmation_status: string;
  timestamp?: string;
  accepted_quantity?: number;
  total_accepted?: number;
  line_items?: Array<{ line_number: number; quantity_ordered: number; quantity_accepted: number }>;
}): EdiGenerationResult {
  try {
    const ts = data.timestamp ?? new Date().toISOString();

    // Map confirmation_status to cXML status
    const statusMap: Record<string, string> = {
      AC: 'Accepted',
      AK: 'Accepted',
      CA: 'Conditionally Accepted',
      DJ: 'Rejected',
    };

    const content = `  <Request>
    <ConfirmationRequest>
      <ConfirmationHeader type="PurchaseOrderConfirmation" noticeDate="${ts}">
        <DocumentReference payloadID="${data.order_id}"/>
        <Status code="200" text="${statusMap[data.confirmation_status] || data.confirmation_status}"/>
      </ConfirmationHeader>
      <ConfirmationItem lineNumber="1" quantity="${data.accepted_quantity ?? 0}">
        <UnitPrice>${data.total_accepted ?? 0}</UnitPrice>
        <Extrinsic name="ReferenceDocumentID">${data.order_id}</Extrinsic>
      </ConfirmationItem>
    </ConfirmationRequest>
  </Request>`;

    const doc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML payloadID="${data.payload_id}" timestamp="${ts}">
  <Response>
    <Status code="200" text="OK"/>
  </Response>
${content}
</cXML>`;

    return { success: true, document: doc, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'cXML generation error'] };
  }
}

/**
 * Generate cXML Ship Notice (656).
 */
export function generateCxmlShipNotice(data: {
  payload_id: string;
  po_number: string;
  shipment_id: string;
  carrier: string;
  tracking_number: string;
  ship_date: string;
  packs?: Array<{
    sscc: string;
    items: Array<{ buyer_sku: string; quantity: number }>;
  }>;
  timestamp?: string;
}): EdiGenerationResult {
  try {
    const ts = data.timestamp ?? new Date().toISOString();

    let itemContent = '';
    if (data.packs) {
      for (const pack of data.packs) {
        for (const item of pack.items) {
          itemContent += `      <ShipNoticeItem lineNumber="1">
        <Description>${item.buyer_sku}</Description>
        <Quantity quantity="${item.quantity}">EA</Quantity>
        <SerialNumber>${pack.sscc}</SerialNumber>
      </ShipNoticeItem>
`;
        }
      }
    }

    const content = `  <Request>
    <ShipNoticeRequest>
      <ShipNoticeHeader shipNoticeID="${data.shipment_id}" noticeDate="${ts}">
        <DocumentReference payloadID="${data.po_number}"/>
        <ShipTo>
          <Address/>
        </ShipTo>
        <ShipFrom>
          <Address/>
        </ShipFrom>
        <Shipper>
          <Contact role="carrierContact"/>
        </Shipper>
        <Carrier transportID="${data.tracking_number}">
          <ContactInfo/>
        </Carrier>
      </ShipNoticeHeader>
      <ShipNoticeLine>
${itemContent}      </ShipNoticeLine>
    </ShipNoticeRequest>
  </Request>`;

    const doc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML payloadID="${data.payload_id}" timestamp="${ts}">
  <Response>
    <Status code="200" text="OK"/>
  </Response>
${content}
</cXML>`;

    return { success: true, document: doc, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'cXML generation error'] };
  }
}
