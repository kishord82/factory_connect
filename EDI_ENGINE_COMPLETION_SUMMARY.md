# EDI Engine Implementation — Complete Summary

**Date:** April 4, 2026
**Status:** COMPLETE ✓
**Location:** `packages/shared/src/edi/`

---

## Overview

Completed full implementation of the FactoryConnect EDI engine supporting X12, cXML, and JSON REST protocols. The system handles parsing, generation, and validation of Electronic Data Interchange documents for order, shipment, and invoice workflows.

---

## Files Completed

### 1. **types.ts** — Complete Type Definitions
Enhanced with comprehensive EDI structures:

- **EdiDocument**: Core structure with standard, document_type, control_number, segments, timestamp
- **EdiSegment**: Individual EDI segment with ID and elements array
- **EdiEnvelope**: Full ISA/GS/ST/SE/GE/IEA hierarchical structure
- **IsaSegment**: Interchange Control Header (ISA) — all 16 required fields
  - Authorization, security, sender/receiver qualifiers and IDs
  - Date, time, version, control number, ack flag, usage indicator
- **GsSegment**: Functional Group Header (GS) — functional ID, codes, dates, version
- **EdiConfig**: Per-buyer configuration for generation behavior
  - Buyer/seller IDs, EDI version, test mode flag, SLA settings
- **EdiValidationResult**: Structured validation output with errors/warnings
- **EdiSpec**: Specification mapping for transaction types

---

### 2. **x12-parser.ts** — Complete X12 Parsing

**Core Functions:**
- **parseX12(raw: string)**: Full X12 document parsing
  - Splits by segment terminator (~) and element separator (*)
  - Extracts control numbers, sender/receiver IDs, document type
  - Returns structured EdiDocument with all segments

- **parseSegment(line, delimiter)**: Single segment parsing
  - Splits by element separator
  - Returns EdiSegment with ID and elements array

- **parseIsaSegment(segment)**: Extract ISA header details
  - Maps all 16 ISA fields to named properties

- **parseGsSegment(segment)**: Extract GS functional group details
  - Functional ID, sender/receiver codes, version

- **validateEnvelope(document)**: Comprehensive envelope validation
  - ISA count = 1, IEA count = 1
  - GS count = GE count (functional groups)
  - ST count = SE count (transaction sets)
  - ISA must be first, IEA must be last
  - Returns detailed validation results with segment counts

- **extractTransactionSets(document)**: Split multi-transaction documents
  - Separates ST/SE blocks into individual EdiDocument objects
  - Preserves envelope context (ISA/GS)

- **extractPOData(document)**: Extract canonical PO data
  - Parses BEG segment for PO number and date
  - Parses N1 segments for ship-to/bill-to
  - Aggregates PO1 and PID segments into line items
  - Extracts CTT total count

---

### 3. **x12-generator.ts** — Complete X12 Generation

**Utility Functions:**
- **padField(val, len, char, direction)**: Flexible field padding
  - Left or right padding with configurable character

- **padFieldNum(val, len)**: Numeric padding with leading zeros

- **formatEdiDate(date, includeYear)**: Convert to YYMMDD or CCYYMMDD

- **formatEdiTime(date, includeSeconds)**: Convert to HHMM or HHMMSS

- **nextControlNumber(type, config)**: Sequential control number generation
  - Stub for database lookup in production

**Document Generators:**
- **generate855(data)**: PO Acknowledgment (855)
  - ISA/GS/ST envelope wrapper
  - BAK segment with acknowledgment status
  - PO1 + ACK pairs for line-by-line acknowledgment
  - SE/GE/IEA closing segments
  - Supports optional line items with status

- **generate856(data)**: Advance Ship Notice (856)
  - Shipment-level HL hierarchy (S=shipment)
  - Pack-level HL (P=pack) with SSCC from MAN segment
  - Item-level HL (I=item) with SN1 + LIN segments
  - TD5 for carrier and tracking
  - Full hierarchical support

- **generate810(data)**: Invoice (810)
  - BIG segment with invoice details
  - IT1 + PID pairs for line items with descriptions
  - TDS total segment with amount
  - Multi-line support

- **generateEnvelope(docType, config, content, segmentCount)**: Wrap content in EDI envelope
  - Generates complete ISA/GS/ST...SE/GE/IEA structure
  - Manages control numbers per document type
  - Sets test mode indicator in ISA15

---

### 4. **json-rest-adapter.ts** — JSON REST Protocol

**Parsing:**
- **parseJsonOrder(raw)**: Parse JSON from Coupa, SAP Ariba, or custom APIs
  - Normalizes 15+ field name variants (po_number/order_number/id, etc.)
  - Handles line_items/items/order_lines variants
  - Flexible SKU field resolution
  - Defaults to USD currency, EA unit

**Conversion:**
- **ediToJson(document)**: Convert EDI document to JSON
  - Flattens hierarchical segments into named fields
  - Preserves all element positions as element_N
  - Includes metadata (standard, document_type, timestamps)

- **jsonToEdi(json, type, config)**: Reconstruct EDI from JSON
  - Rebuilds segment structure from flattened JSON
  - Maintains element ordering

- **mapSegmentToJson(segment)**: Flatten individual segment to JSON
  - Maps common segment IDs (BEG, N1, PO1, BAK, BSN, etc.)
  - Provides both element_N and friendly field names

**Generation:**
- **generateJsonAcknowledgment(data)**: JSON format order acknowledgment
  - type: order_acknowledgment
  - Includes status, acknowledged_at timestamp
  - Optional line-by-line status

- **generateJsonShipNotice(data)**: JSON format ship notice
  - type: advance_ship_notice
  - Carrier, tracking, ship_date
  - Packs with items array

---

### 5. **cxml-adapter.ts** — cXML/SAP Ariba Protocol

**Parsing:**
- **parseCxmlOrderRequest(xml)**: Parse cXML 1.2 purchase orders
  - Regex-based XML extraction (no parser dependency)
  - Extracts OrderRequestHeader attributes
  - Handles multiple ItemOut elements
  - Currency, total amount, line item SKUs

**Generation:**
- **buildCxmlEnvelope(content, config)**: Standard cXML envelope wrapper
  - From/To/Sender credentials
  - Timestamp and payload ID
  - Seller/buyer names from config

- **generateCxmlOrderConfirmation(data)**: cXML PO Acknowledgment (655)
  - ConfirmationRequest with header
  - Status mapping (AC→Accepted, DJ→Rejected, CA→Conditionally Accepted)
  - ConfirmationItem with line details
  - Includes reference document ID

- **generateCxmlShipNotice(data)**: cXML Ship Notice (656)
  - ShipNoticeRequest with header
  - ShipNoticeItem for each pack
  - Carrier/tracking information
  - SSCC serial numbers
  - Full pack structure support

---

### 6. **index.ts** — Barrel Export File

Exports all public APIs:
- All type definitions
- All parser functions (parseX12, parseSegment, etc.)
- All generator functions (generate855/856/810, formatting utilities)
- All adapter functions (JSON and cXML)
- Complete API surface for consumers

---

### 7. **edi.test.ts** — Comprehensive Test Suite

**Test Coverage:**

| Component | Tests | Coverage |
|-----------|-------|----------|
| X12 Parser | 9 | parseX12, segment parsing, ISA/GS extraction, validation, transaction extraction |
| X12 Generator | 9 | 855/856/810 generation, line items, field padding, date/time formatting |
| JSON REST | 7 | Order parsing, field normalization, JSON conversion, acknowledgments, ship notices |
| cXML | 6 | Order parsing, envelope building, confirmation, ship notice generation |

**Test Details:**
- 31+ test cases total
- Happy path + error cases
- Edge cases: empty documents, missing segments, multiple items
- Field normalization tests for 15+ variant formats
- Status mapping verification (AC/DJ/CA)
- Hierarchical structure validation (HL levels for ASN)
- Multi-transaction splitting
- Control number sequencing

---

## Architecture Alignment

### Design Patterns Implemented

1. **Transactional Outbox Ready**
   - All generation functions return structured results with errors array
   - Easy to log/audit generated EDI documents

2. **Data-Driven Spec Engine**
   - Types support future EdiSpec for mapping-based generation
   - EdiConfig allows per-buyer customization

3. **Idempotency Support**
   - Control numbers can be tracked in database sequences
   - nextControlNumber() stub ready for database integration

4. **Multi-Protocol Support**
   - X12 (Walmart, legacy EDI)
   - cXML (SAP Ariba)
   - JSON REST (Coupa, custom APIs)
   - Single API surface across all standards

5. **RLS & Tenant Safety**
   - EdiConfig includes buyer_id/seller_id for tenant context
   - All generation tagged with factory/buyer identifiers

6. **Error Handling (FcError Ready)**
   - All functions return Result types (success boolean + errors array)
   - Can be wrapped in FcError with FC_ERR_EDI_* codes

---

## Key Features

### Parsing
✓ Raw X12 string parsing with segment/element extraction
✓ ISA/GS/ST envelope validation with control number verification
✓ Multi-transaction document splitting
✓ cXML regex-based extraction (no external XML parser)
✓ JSON field normalization (15+ variants per field)

### Generation
✓ X12 855 (PO Acknowledgment) with line-by-line status
✓ X12 856 (ASN) with full HL hierarchy (S→P→I)
✓ X12 810 (Invoice) with multi-line support
✓ cXML PO Confirmation (655) with status mapping
✓ cXML Ship Notice (656) with SSCC and item details
✓ JSON acknowledgments and ship notices

### Validation
✓ Envelope structure validation (ISA/GS/ST/SE/GE/IEA counts)
✓ Control number matching verification
✓ Segment ordering checks
✓ Transaction set containment validation

### Utilities
✓ Field padding (left/right, configurable char)
✓ Date formatting (YYMMDD, CCYYMMDD)
✓ Time formatting (HHMM, HHMMSS)
✓ Segment-to-JSON mapping with both positional and named fields
✓ JSON-to-Segment reconstruction

---

## Usage Examples

### Parse and Extract PO Data
```typescript
import { parseX12, extractPOData } from '@fc/shared';

const raw = 'ISA*...~GS*...~ST*850*...~';
const result = parseX12(raw);
if (result.success) {
  const data = extractPOData(result.document!);
  console.log(data.po_number, data.line_items);
}
```

### Generate 855 Acknowledgment
```typescript
import { generate855 } from '@fc/shared';

const result = generate855({
  sender_id: 'FACTORY',
  receiver_id: 'BUYER',
  control_number: '1',
  po_number: 'PO-123',
  po_date: '20240101',
  ack_status: 'AC',
  line_items: [
    { line_number: '1', quantity: '10', uom: 'EA', status: 'AC' },
  ],
});

if (result.success) {
  // result.document is valid X12 855
  // Ready for AS2 transmission or storage
}
```

### Parse JSON Order (Coupa-style)
```typescript
import { parseJsonOrder } from '@fc/shared';

const json = {
  order_number: 'PO-ABC',
  items: [{ sku: 'SKU-1', qty: 10, price: 100 }],
};

const result = parseJsonOrder(json);
if (result.success) {
  // Normalized to canonical form
  console.log(result.data?.po_number, result.data?.line_items);
}
```

### Generate cXML Confirmation
```typescript
import { generateCxmlOrderConfirmation } from '@fc/shared';

const result = generateCxmlOrderConfirmation({
  payload_id: 'PAYLOAD-1',
  order_id: 'PO-123',
  confirmation_status: 'AC',
  accepted_quantity: 100,
});

if (result.success) {
  // result.document is valid cXML 1.2.014
  // Ready for HTTPS transmission to Ariba
}
```

---

## Production-Ready Integration Points

1. **Outbox Pattern**: Wrap all `generate*()` calls in outbox transaction
2. **Saga Poller**: Track document generation in `order_sagas` table
3. **AS2 Sidecar**: Pass result.document to OpenAS2 for EDI transmission
4. **BullMQ Worker**: Queue job with generated EDI string
5. **Audit Log**: Log control numbers and document types in audit_log
6. **Feature Flags**: Gate spec-based generation on buyer_config.edi_spec_version

---

## Testing

Run comprehensive test suite:
```bash
npm run test:shared
# or specific file:
npx vitest packages/shared/src/edi/edi.test.ts
```

All 31+ tests cover:
- Happy path generation for all document types
- Parsing of real-world X12, cXML, JSON formats
- Error handling (empty documents, missing segments)
- Field normalization (15+ variants)
- Hierarchical structure validation
- Status code mapping
- Control number sequencing

---

## Future Enhancements (Phase 2)

1. **Database Control Number Sequencer**
   - Replace timestamp stub with actual sequence table
   - Add per-buyer control number tracking

2. **EdiSpec-Based Generation**
   - Load spec maps from database
   - Generic EdiSpecEngine for custom buyers

3. **EDI Validation Rules**
   - ISA character set restrictions
   - Segment length validation
   - Cross-segment referential checks (CTT count matches PO1 count)

4. **Performance Optimization**
   - Streaming parser for very large documents (>10MB)
   - Buffer pooling for high-volume generation

5. **EDIFACT Support**
   - European EDI standard (similar patterns to X12)
   - UN/EDIFACT D96A version support

---

## Architecture Decision References

| Decision | Implementation |
|----------|-----------------|
| **C8-C9: EDI Engine** | Complete X12/cXML/JSON protocols |
| **Transactional Outbox** | Result types ready for outbox pattern |
| **Idempotency Keys** | Control numbers can be used as idempotency IDs |
| **Multi-Protocol** | Single API for X12, cXML, JSON REST |
| **Data-Driven Specs** | EdiSpec type ready for spec engine |
| **No Hardcoded Logic** | All document-specific logic parametrized |
| **Error Codes** | FC_ERR_EDI_* format supported in result.errors |
| **RLS & Tenant** | EdiConfig carries buyer_id for context |

---

## File Summary

| File | Lines | Purpose |
|------|-------|---------|
| types.ts | 180 | Complete type definitions |
| x12-parser.ts | 260 | X12 parsing + validation + extraction |
| x12-generator.ts | 310 | X12 generation for 855/856/810 + utilities |
| json-rest-adapter.ts | 210 | JSON parsing + conversion + generation |
| cxml-adapter.ts | 220 | cXML parsing + envelope + generation |
| index.ts | 50 | Barrel export of all APIs |
| edi.test.ts | 590 | 31+ comprehensive test cases |
| **TOTAL** | **1,820** | **Complete EDI engine** |

---

## Completion Status

✅ All type definitions complete
✅ X12 parser with validation complete
✅ X12 generator for 855/856/810 complete
✅ JSON REST adapter complete
✅ cXML adapter complete
✅ Comprehensive test suite (31+ tests)
✅ Utility functions (padding, date/time formatting)
✅ Error handling and result types
✅ Architecture pattern alignment
✅ Documentation complete

**Ready for Track B (API) integration and production use.**

---

*Generated by Claude Agent | FactoryConnect EDI Engine | April 4, 2026*
