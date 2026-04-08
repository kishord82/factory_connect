const DEFAULT_SEGMENT_TERMINATOR = '~';
const DEFAULT_ELEMENT_SEPARATOR = '*';
/**
 * Parse raw X12 string into structured document.
 * Splits by segment terminator (~) and element separator (*).
 */
export function parseX12(raw) {
    try {
        const lines = raw
            .split(DEFAULT_SEGMENT_TERMINATOR)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        if (lines.length === 0) {
            return { success: false, errors: ['Empty EDI document'] };
        }
        const segments = [];
        let controlNumber = '';
        let senderId = '';
        let receiverId = '';
        let documentType = '';
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
        const docTypeMap = {
            '850': 'PO_850',
            '855': 'PO_ACK_855',
            '856': 'ASN_856',
            '810': 'INVOICE_810',
            '997': 'FUNC_ACK_997',
        };
        const document = {
            standard: 'X12',
            document_type: (docTypeMap[documentType] ?? 'PO_850'),
            control_number: controlNumber,
            sender_id: senderId,
            receiver_id: receiverId,
            segments,
            raw,
            timestamp: new Date(),
        };
        return { success: true, document, errors: [] };
    }
    catch (err) {
        return { success: false, errors: [err instanceof Error ? err.message : 'Parse error'] };
    }
}
/**
 * Parse a single X12 segment line.
 * Handles element and sub-element separation.
 */
export function parseSegment(line, delimiter = DEFAULT_ELEMENT_SEPARATOR) {
    const elements = line.split(delimiter);
    const id = elements[0] ?? '';
    return {
        id,
        elements: elements.slice(1),
    };
}
/**
 * Extract ISA segment details from parsed segments.
 */
export function parseIsaSegment(segment) {
    return {
        authorization: segment.elements[0] ?? '',
        security: segment.elements[1] ?? '',
        senderQualifier: segment.elements[4] ?? 'ZZ',
        senderId: segment.elements[5] ?? '',
        receiverQualifier: segment.elements[6] ?? 'ZZ',
        receiverId: segment.elements[7] ?? '',
        date: segment.elements[8] ?? '',
        time: segment.elements[9] ?? '',
        controlStandard: segment.elements[10] ?? 'U',
        version: segment.elements[11] ?? '00401',
        controlNumber: segment.elements[12] ?? '',
        ackRequested: segment.elements[13] ?? '0',
        usageIndicator: segment.elements[14] ?? 'P',
        subElementSeparator: segment.elements[15] ?? ':',
    };
}
/**
 * Extract GS segment details from parsed segments.
 */
export function parseGsSegment(segment) {
    return {
        functionalId: segment.elements[0] ?? '',
        senderCode: segment.elements[1] ?? '',
        receiverCode: segment.elements[2] ?? '',
        date: segment.elements[3] ?? '',
        time: segment.elements[4] ?? '',
        controlNumber: segment.elements[5] ?? '',
        agency: segment.elements[6] ?? 'X',
        version: segment.elements[7] ?? '004010',
    };
}
/**
 * Validate X12 envelope structure.
 * Checks ISA/GS/ST/SE/GE/IEA counts and control numbers.
 */
export function validateEnvelope(document) {
    const errors = [];
    const warnings = [];
    let isaCount = 0;
    let iaaCount = 0;
    let gsCount = 0;
    let geCount = 0;
    let stCount = 0;
    let seCount = 0;
    let segmentCount = 0;
    const segmentMap = {};
    for (const seg of document.segments) {
        segmentCount++;
        segmentMap[seg.id] = (segmentMap[seg.id] ?? 0) + 1;
        switch (seg.id) {
            case 'ISA':
                isaCount++;
                break;
            case 'IEA':
                iaaCount++;
                break;
            case 'GS':
                gsCount++;
                break;
            case 'GE':
                geCount++;
                break;
            case 'ST':
                stCount++;
                break;
            case 'SE':
                seCount++;
                break;
        }
    }
    // Validate counts
    if (isaCount !== 1)
        errors.push(`Expected 1 ISA, found ${isaCount}`);
    if (iaaCount !== 1)
        errors.push(`Expected 1 IEA, found ${iaaCount}`);
    if (gsCount !== geCount)
        errors.push(`GS count (${gsCount}) != GE count (${geCount})`);
    if (stCount !== seCount)
        errors.push(`ST count (${stCount}) != SE count (${seCount})`);
    // Verify ISA is first, IEA is last
    if (document.segments[0]?.id !== 'ISA') {
        errors.push('First segment must be ISA');
    }
    if (document.segments[document.segments.length - 1]?.id !== 'IEA') {
        errors.push('Last segment must be IEA');
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        details: {
            isa_count: isaCount,
            segment_count: segmentCount,
            transaction_sets: stCount,
            control_numbers: {
                isa: document.control_number,
            },
        },
    };
}
/**
 * Extract transaction sets from a multi-transaction document.
 * Returns array of EdiDocument, one per ST/SE block.
 */
export function extractTransactionSets(document) {
    const results = [];
    let currentTxn = [];
    let isaSegment;
    let gsSegment;
    let stSegment;
    for (const seg of document.segments) {
        if (seg.id === 'ISA') {
            isaSegment = seg;
            currentTxn = [seg];
        }
        else if (seg.id === 'GS') {
            gsSegment = seg;
            if (currentTxn.length > 0) {
                currentTxn.push(seg);
            }
        }
        else if (seg.id === 'ST') {
            stSegment = seg;
            currentTxn.push(seg);
        }
        else if (seg.id === 'SE') {
            currentTxn.push(seg);
            // End of transaction set
            if (isaSegment && gsSegment && stSegment) {
                const txnDoc = {
                    standard: document.standard,
                    document_type: document.document_type,
                    control_number: stSegment.elements[1] ?? '',
                    sender_id: document.sender_id,
                    receiver_id: document.receiver_id,
                    segments: currentTxn,
                    timestamp: new Date(),
                };
                results.push(txnDoc);
                currentTxn = [isaSegment, gsSegment];
            }
        }
        else {
            currentTxn.push(seg);
        }
    }
    // If no SE found, return original document
    if (results.length === 0) {
        results.push(document);
    }
    return results;
}
/**
 * Extract PO data from parsed X12 850 document.
 */
export function extractPOData(document) {
    const data = {
        sender_id: document.sender_id,
        receiver_id: document.receiver_id,
        control_number: document.control_number,
    };
    const lineItems = [];
    let currentItem = {};
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
                }
                else if (seg.elements[0] === 'BT') {
                    data.bill_to_name = seg.elements[1];
                }
                break;
            case 'PO1':
                if (Object.keys(currentItem).length > 0)
                    lineItems.push(currentItem);
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
    if (Object.keys(currentItem).length > 0)
        lineItems.push(currentItem);
    data.line_items = lineItems;
    return data;
}
//# sourceMappingURL=x12-parser.js.map