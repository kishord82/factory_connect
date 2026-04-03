/**
 * C9: X12 EDI parser — parses X12 documents into structured data.
 */
import type { EdiDocument, EdiSegment, EdiParseResult } from './types.js';

const DEFAULT_SEGMENT_TERMINATOR = '~';
const DEFAULT_ELEMENT_SEPARATOR = '*';
// Sub-element separator used in ISA16 — reserved for future use
// const SUB_ELEMENT_SEPARATOR = ':';

export function parseX12(raw: string): EdiParseResult {
  try {
    const lines = raw
      .split(DEFAULT_SEGMENT_TERMINATOR)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (lines.length === 0) {
      return { success: false, errors: ['Empty EDI document'] };
    }

    const segments: EdiSegment[] = [];
    let controlNumber = '';
    let senderId = '';
    let receiverId = '';
    let documentType: string = '';

    for (const line of lines) {
      const elements = line.split(DEFAULT_ELEMENT_SEPARATOR);
      const segmentId = elements[0];
      segments.push({ id: segmentId, elements: elements.slice(1) });

      if (segmentId === 'ISA') {
        senderId = (elements[6] ?? '').trim();
        receiverId = (elements[8] ?? '').trim();
        controlNumber = (elements[13] ?? '').trim();
      }

      if (segmentId === 'ST') {
        documentType = elements[1] ?? '';
      }
    }

    const docTypeMap: Record<string, string> = {
      '850': 'PO_850',
      '855': 'PO_ACK_855',
      '856': 'ASN_856',
      '810': 'INVOICE_810',
      '997': 'FUNC_ACK_997',
    };

    const document: EdiDocument = {
      standard: 'X12',
      document_type: (docTypeMap[documentType] ?? 'PO_850') as EdiDocument['document_type'],
      control_number: controlNumber,
      sender_id: senderId,
      receiver_id: receiverId,
      segments,
      raw,
      timestamp: new Date(),
    };

    return { success: true, document, errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'Parse error'] };
  }
}

export function extractPOData(document: EdiDocument): Record<string, unknown> {
  const data: Record<string, unknown> = {
    sender_id: document.sender_id,
    receiver_id: document.receiver_id,
    control_number: document.control_number,
  };

  const lineItems: Record<string, unknown>[] = [];
  let currentItem: Record<string, unknown> = {};

  for (const seg of document.segments) {
    switch (seg.id) {
      case 'BEG':
        data.po_number = seg.elements[2];
        data.po_date = seg.elements[4];
        data.po_type = seg.elements[0];
        break;
      case 'N1':
        if (seg.elements[0] === 'ST') {
          data.ship_to_name = seg.elements[1];
        } else if (seg.elements[0] === 'BT') {
          data.bill_to_name = seg.elements[1];
        }
        break;
      case 'PO1':
        if (Object.keys(currentItem).length > 0) lineItems.push(currentItem);
        currentItem = {
          line_number: seg.elements[0],
          quantity: seg.elements[1],
          uom: seg.elements[2],
          unit_price: seg.elements[3],
          buyer_sku: seg.elements[6] ?? seg.elements[4],
        };
        break;
      case 'PID':
        currentItem.description = seg.elements[4];
        break;
      case 'CTT':
        data.total_line_items = seg.elements[0];
        break;
    }
  }
  if (Object.keys(currentItem).length > 0) lineItems.push(currentItem);
  data.line_items = lineItems;

  return data;
}
