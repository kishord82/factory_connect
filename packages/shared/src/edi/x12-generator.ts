/**
 * C9: X12 EDI generator — generates X12 documents from canonical data.
 */
import type { EdiGenerationResult } from './types.js';

const SEP = '*';
const TERM = '~';

function pad(val: string, len: number, char: string = ' '): string {
  return val.padEnd(len, char).substring(0, len);
}

function padNum(val: string, len: number): string {
  return val.padStart(len, '0').substring(0, len);
}

function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function formatTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(11, 16).replace(':', '');
}

interface IsaParams {
  sender_id: string;
  receiver_id: string;
  control_number: string;
  test_mode?: boolean;
}

function generateISA(p: IsaParams): string {
  const now = new Date();
  return [
    'ISA', '00', pad('', 10), '00', pad('', 10),
    'ZZ', pad(p.sender_id, 15), 'ZZ', pad(p.receiver_id, 15),
    formatDate(now).slice(2), formatTime(now),
    'U', '00401', padNum(p.control_number, 9),
    '0', p.test_mode ? 'T' : 'P', ':',
  ].join(SEP) + TERM;
}

function generateIEA(controlNumber: string): string {
  return `IEA${SEP}1${SEP}${padNum(controlNumber, 9)}${TERM}`;
}

function generateGS(docType: string, senderId: string, receiverId: string, controlNumber: string): string {
  const now = new Date();
  const codeMap: Record<string, string> = { '855': 'PR', '856': 'SH', '810': 'IN', '997': 'FA' };
  return [
    'GS', codeMap[docType] ?? 'PO', senderId, receiverId,
    formatDate(now), formatTime(now), controlNumber, 'X', '004010',
  ].join(SEP) + TERM;
}

function generateGE(controlNumber: string): string {
  return `GE${SEP}1${SEP}${controlNumber}${TERM}`;
}

export function generate855(data: {
  sender_id: string;
  receiver_id: string;
  control_number: string;
  po_number: string;
  po_date: string;
  ack_status: string;
  line_items?: Array<{ line_number: string; quantity: string; uom: string; status: string }>;
  test_mode?: boolean;
}): EdiGenerationResult {
  try {
    const lines: string[] = [];
    lines.push(generateISA({ sender_id: data.sender_id, receiver_id: data.receiver_id, control_number: data.control_number, test_mode: data.test_mode }));
    lines.push(generateGS('855', data.sender_id, data.receiver_id, data.control_number));
    lines.push(`ST${SEP}855${SEP}${padNum(data.control_number, 4)}${TERM}`);
    lines.push(`BAK${SEP}00${SEP}${data.ack_status}${SEP}${data.po_number}${SEP}${data.po_date}${TERM}`);

    let segCount = 3; // ST + BAK + SE
    if (data.line_items) {
      for (const item of data.line_items) {
        lines.push(`PO1${SEP}${item.line_number}${SEP}${item.quantity}${SEP}${item.uom}${SEP}${SEP}${SEP}${SEP}${TERM}`);
        lines.push(`ACK${SEP}${item.status}${SEP}${item.quantity}${SEP}${item.uom}${TERM}`);
        segCount += 2;
      }
    }

    lines.push(`SE${SEP}${segCount}${SEP}${padNum(data.control_number, 4)}${TERM}`);
    lines.push(generateGE(data.control_number));
    lines.push(generateIEA(data.control_number));

    return { success: true, document: lines.join('\n'), errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'Generation error'] };
  }
}

export function generate856(data: {
  sender_id: string;
  receiver_id: string;
  control_number: string;
  shipment_id: string;
  po_number: string;
  carrier_name?: string;
  tracking_number?: string;
  ship_date: string;
  packs?: Array<{ sscc: string; items: Array<{ sku: string; quantity: string; uom: string }> }>;
  test_mode?: boolean;
}): EdiGenerationResult {
  try {
    const lines: string[] = [];
    lines.push(generateISA({ sender_id: data.sender_id, receiver_id: data.receiver_id, control_number: data.control_number, test_mode: data.test_mode }));
    lines.push(generateGS('856', data.sender_id, data.receiver_id, data.control_number));
    lines.push(`ST${SEP}856${SEP}${padNum(data.control_number, 4)}${TERM}`);
    lines.push(`BSN${SEP}00${SEP}${data.shipment_id}${SEP}${data.ship_date}${SEP}${formatTime(new Date())}${TERM}`);

    let segCount = 3;
    // Shipment level
    lines.push(`HL${SEP}1${SEP}${SEP}S${TERM}`);
    lines.push(`TD5${SEP}${SEP}2${SEP}${data.carrier_name ?? ''}${SEP}${SEP}${data.tracking_number ?? ''}${TERM}`);
    lines.push(`REF${SEP}BM${SEP}${data.po_number}${TERM}`);
    segCount += 3;

    if (data.packs) {
      let hlCount = 2;
      for (const pack of data.packs) {
        lines.push(`HL${SEP}${hlCount}${SEP}1${SEP}P${TERM}`);
        lines.push(`MAN${SEP}GM${SEP}${pack.sscc}${TERM}`);
        segCount += 2;
        hlCount++;
        for (const item of pack.items) {
          lines.push(`HL${SEP}${hlCount}${SEP}${hlCount - 1}${SEP}I${TERM}`);
          lines.push(`SN1${SEP}${SEP}${item.quantity}${SEP}${item.uom}${TERM}`);
          lines.push(`LIN${SEP}${SEP}VP${SEP}${item.sku}${TERM}`);
          segCount += 3;
          hlCount++;
        }
      }
    }

    lines.push(`SE${SEP}${segCount}${SEP}${padNum(data.control_number, 4)}${TERM}`);
    lines.push(generateGE(data.control_number));
    lines.push(generateIEA(data.control_number));

    return { success: true, document: lines.join('\n'), errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'Generation error'] };
  }
}

export function generate810(data: {
  sender_id: string;
  receiver_id: string;
  control_number: string;
  invoice_number: string;
  invoice_date: string;
  po_number: string;
  total_amount: string;
  line_items: Array<{ line_number: string; quantity: string; uom: string; unit_price: string; description?: string }>;
  test_mode?: boolean;
}): EdiGenerationResult {
  try {
    const lines: string[] = [];
    lines.push(generateISA({ sender_id: data.sender_id, receiver_id: data.receiver_id, control_number: data.control_number, test_mode: data.test_mode }));
    lines.push(generateGS('810', data.sender_id, data.receiver_id, data.control_number));
    lines.push(`ST${SEP}810${SEP}${padNum(data.control_number, 4)}${TERM}`);
    lines.push(`BIG${SEP}${data.invoice_date}${SEP}${data.invoice_number}${SEP}${SEP}${data.po_number}${TERM}`);

    let segCount = 3;
    for (const item of data.line_items) {
      lines.push(`IT1${SEP}${item.line_number}${SEP}${item.quantity}${SEP}${item.uom}${SEP}${item.unit_price}${TERM}`);
      segCount++;
      if (item.description) {
        lines.push(`PID${SEP}F${SEP}${SEP}${SEP}${SEP}${item.description}${TERM}`);
        segCount++;
      }
    }

    lines.push(`TDS${SEP}${data.total_amount.replace('.', '')}${TERM}`);
    segCount++;

    lines.push(`SE${SEP}${segCount}${SEP}${padNum(data.control_number, 4)}${TERM}`);
    lines.push(generateGE(data.control_number));
    lines.push(generateIEA(data.control_number));

    return { success: true, document: lines.join('\n'), errors: [] };
  } catch (err) {
    return { success: false, errors: [err instanceof Error ? err.message : 'Generation error'] };
  }
}
