/**
 * C10: cXML adapter for SAP Ariba.
 */
import type { EdiParseResult, EdiGenerationResult } from './types.js';

export function parseCxmlOrderRequest(xml: string): EdiParseResult {
  try {
    // Simple XML extraction (no full XML parser dependency)
    const extract = (tag: string, content: string): string => {
      const match = content.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
      return match?.[1] ?? '';
    };

    const extractAttr = (tag: string, attr: string, content: string): string => {
      const match = content.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
      return match?.[1] ?? '';
    };

    const data: Record<string, unknown> = {
      po_number: extractAttr('OrderRequestHeader', 'orderID', xml),
      order_date: extractAttr('OrderRequestHeader', 'orderDate', xml),
      currency: extractAttr('Money', 'currency', xml) || 'USD',
      total_amount: extract('Money', xml),
    };

    // Extract line items
    const itemMatches = xml.match(/<ItemOut[^>]*>[\s\S]*?<\/ItemOut>/g) ?? [];
    const lineItems: Record<string, unknown>[] = [];
    let lineNum = 1;
    for (const itemXml of itemMatches) {
      lineItems.push({
        line_number: lineNum++,
        quantity: extractAttr('ItemOut', 'quantity', itemXml),
        buyer_sku: extract('SupplierPartID', itemXml) || extract('BuyerPartID', itemXml),
        description: extract('Description', itemXml),
        unit_price: extract('Money', itemXml),
      });
    }
    data.line_items = lineItems;

    return { success: true, data, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'cXML parse error'] };
  }
}

export function generateCxmlOrderConfirmation(data: {
  payload_id: string;
  order_id: string;
  confirmation_status: string;
  timestamp?: string;
}): EdiGenerationResult {
  try {
    const ts = data.timestamp ?? new Date().toISOString();
    const doc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML payloadID="${data.payload_id}" timestamp="${ts}">
  <Response>
    <Status code="200" text="OK"/>
  </Response>
  <Request>
    <ConfirmationRequest>
      <ConfirmationHeader type="${data.confirmation_status}" noticeDate="${ts}">
        <DocumentReference payloadID="${data.order_id}"/>
      </ConfirmationHeader>
    </ConfirmationRequest>
  </Request>
</cXML>`;

    return { success: true, document: doc, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'cXML generation error'] };
  }
}
