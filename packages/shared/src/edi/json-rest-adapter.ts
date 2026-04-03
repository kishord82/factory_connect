/**
 * C10: JSON REST adapter for Coupa-style APIs.
 */
import type { EdiParseResult, EdiGenerationResult } from './types.js';

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

export function generateJsonAcknowledgment(data: {
  order_id: string;
  status: string;
  line_items?: Array<{ line_number: number; status: string; quantity_accepted: number }>;
}): EdiGenerationResult {
  try {
    const doc = JSON.stringify({
      type: 'order_acknowledgment',
      order_id: data.order_id,
      status: data.status,
      acknowledged_at: new Date().toISOString(),
      line_items: data.line_items ?? [],
    }, null, 2);
    return { success: true, document: doc, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'JSON generation error'] };
  }
}

export function generateJsonShipNotice(data: {
  order_id: string;
  shipment_id: string;
  carrier: string;
  tracking_number: string;
  ship_date: string;
  packs: Array<{ sscc: string; items: Array<{ sku: string; quantity: number }> }>;
}): EdiGenerationResult {
  try {
    const doc = JSON.stringify({
      type: 'advance_ship_notice',
      order_id: data.order_id,
      shipment_id: data.shipment_id,
      carrier: data.carrier,
      tracking_number: data.tracking_number,
      ship_date: data.ship_date,
      packs: data.packs,
      created_at: new Date().toISOString(),
    }, null, 2);
    return { success: true, document: doc, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'JSON generation error'] };
  }
}
