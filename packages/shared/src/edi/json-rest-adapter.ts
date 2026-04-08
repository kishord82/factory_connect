/**
 * C10: JSON REST adapter for Coupa-style APIs.
 * Converts between EDI structures and JSON REST payloads.
 */
import type { EdiDocument, EdiParseResult, EdiGenerationResult, EdiSegment } from './types.js';

/**
 * Parse JSON order from Coupa, SAP Ariba, or custom REST API.
 * Normalizes various field name conventions to canonical form.
 */
export function parseJsonOrder(raw: string | Record<string, unknown>): EdiParseResult {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : raw;

    const normalized: Record<string, unknown> = {
      po_number: data.po_number ?? data.order_number ?? data.id,
      order_date: data.order_date ?? data.created_at ?? data.date,
      currency: data.currency ?? 'USD',
      total_amount: data.total ?? data.total_amount ?? data.amount,
      buyer_id: data.buyer_id ?? data.customer_id ?? data.account_id,
      ship_to: data.ship_to ?? data.shipping_address ?? data.delivery_address,
      bill_to: data.bill_to ?? data.billing_address,
    };

    // Normalize line items from various formats
    const rawItems = (data.line_items ?? data.items ?? data.order_lines ?? []) as Record<string, unknown>[];
    normalized.line_items = rawItems.map((item, idx) => ({
      line_number: item.line_number ?? item.position ?? idx + 1,
      buyer_sku: item.buyer_sku ?? item.sku ?? item.part_number ?? item.item_number,
      description: item.description ?? item.name ?? item.title,
      quantity: item.quantity ?? item.qty ?? item.quantity_ordered,
      quantity_uom: item.uom ?? item.unit ?? item.quantity_uom ?? 'EA',
      unit_price: item.unit_price ?? item.price ?? item.amount,
      line_total: item.line_total ?? item.total ?? item.extended_amount,
    }));

    return { success: true, data: normalized, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'JSON parse error'] };
  }
}

/**
 * Convert EDI document to JSON representation.
 * Flattens segment hierarchy into named fields.
 */
export function ediToJson(document: EdiDocument): Record<string, unknown> {
  const result: Record<string, unknown> = {
    standard: document.standard,
    document_type: document.document_type,
    control_number: document.control_number,
    sender_id: document.sender_id,
    receiver_id: document.receiver_id,
    timestamp: document.timestamp.toISOString(),
    segments: {} as Record<string, unknown>,
  };

  const segments = result.segments as Record<string, unknown>;

  for (const seg of document.segments) {
    if (!segments[seg.id]) {
      segments[seg.id] = [];
    }
    const segArray = segments[seg.id] as unknown[];
    segArray.push(mapSegmentToJson(seg));
  }

  return result;
}

/**
 * Convert JSON to EDI document.
 * Reconstructs segments from flattened JSON.
 */
export function jsonToEdi(
  json: Record<string, unknown>,
  type: string,
  _config: Record<string, unknown>,
): EdiDocument {
  const segments: EdiSegment[] = [];

  // Reconstruct segments from JSON structure
  const segs = json.segments as Record<string, unknown>;
  for (const [segId, segData] of Object.entries(segs)) {
    const segArray = Array.isArray(segData) ? segData : [segData];
    for (const item of segArray) {
      const mapped = item as Record<string, unknown>;
      const elements: string[] = [];
      // Reconstruct in order
      for (let i = 0; i < 100; i++) {
        const key = `element_${i}`;
        if (key in mapped) {
          elements.push(String(mapped[key]));
        }
      }
      segments.push({ id: segId, elements });
    }
  }

  return {
    standard: 'JSON_REST',
    document_type: (type as EdiDocument['document_type']) || 'PO_850',
    control_number: String(json.control_number || ''),
    sender_id: String(json.sender_id || ''),
    receiver_id: String(json.receiver_id || ''),
    segments,
    timestamp: new Date(String(json.timestamp || new Date().toISOString())),
  };
}

/**
 * Map EDI segment to JSON object.
 * Flattens elements into named structure.
 */
export function mapSegmentToJson(segment: EdiSegment): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: segment.id,
  };

  // Map each element to element_N field
  for (let i = 0; i < segment.elements.length; i++) {
    result[`element_${i}`] = segment.elements[i];
  }

  // Also add segment-specific mappings based on segment ID
  switch (segment.id) {
    case 'BEG':
      result.po_number = segment.elements[2];
      result.po_date = segment.elements[4];
      break;
    case 'N1':
      result.entity_code = segment.elements[0];
      result.entity_name = segment.elements[1];
      break;
    case 'PO1':
      result.line_number = segment.elements[0];
      result.quantity = segment.elements[1];
      result.uom = segment.elements[2];
      result.unit_price = segment.elements[3];
      result.buyer_sku = segment.elements[6] ?? segment.elements[4];
      break;
    case 'BAK':
      result.ack_status = segment.elements[2];
      result.po_number = segment.elements[3];
      result.po_date = segment.elements[4];
      break;
    case 'BSN':
      result.shipment_id = segment.elements[2];
      result.ship_date = segment.elements[3];
      break;
  }

  return result;
}

/**
 * Generate JSON acknowledgment from order data.
 */
export function generateJsonAcknowledgment(data: {
  order_id: string;
  status: string;
  line_items?: Array<{ line_number: number; status: string; quantity_accepted: number }>;
}): EdiGenerationResult {
  try {
    const doc = JSON.stringify(
      {
        type: 'order_acknowledgment',
        order_id: data.order_id,
        status: data.status,
        acknowledged_at: new Date().toISOString(),
        line_items: data.line_items ?? [],
      },
      null,
      2,
    );
    return { success: true, document: doc, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'JSON generation error'] };
  }
}

/**
 * Generate JSON ship notice from shipment data.
 */
export function generateJsonShipNotice(data: {
  order_id: string;
  shipment_id: string;
  carrier: string;
  tracking_number: string;
  ship_date: string;
  packs: Array<{ sscc: string; items: Array<{ sku: string; quantity: number }> }>;
}): EdiGenerationResult {
  try {
    const doc = JSON.stringify(
      {
        type: 'advance_ship_notice',
        order_id: data.order_id,
        shipment_id: data.shipment_id,
        carrier: data.carrier,
        tracking_number: data.tracking_number,
        ship_date: data.ship_date,
        packs: data.packs,
        created_at: new Date().toISOString(),
      },
      null,
      2,
    );
    return { success: true, document: doc, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'JSON generation error'] };
  }
}
