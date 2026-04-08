/**
 * C8-C9: EDI spec engine types.
 * Complete type definitions for X12, cXML, and JSON REST EDI support.
 */

export type EdiStandard = 'X12' | 'EDIFACT' | 'cXML' | 'JSON_REST';

export type EdiDocumentType =
  | 'PO_850'        // Purchase Order
  | 'PO_ACK_855'    // PO Acknowledgment
  | 'ASN_856'       // Advance Ship Notice
  | 'INVOICE_810'   // Invoice
  | 'FUNC_ACK_997'; // Functional Acknowledgment

/**
 * Single EDI segment with ID and elements.
 * Example: ISA segment has 16 elements
 */
export interface EdiSegment {
  id: string;
  elements: string[];
}

/**
 * Complete EDI document structure.
 * Includes envelope (ISA/IEA, GS/GE, ST/SE) and transaction segments.
 */
export interface EdiDocument {
  standard: EdiStandard;
  document_type: EdiDocumentType;
  control_number: string;
  sender_id: string;
  receiver_id: string;
  segments: EdiSegment[];
  raw?: string;
  timestamp: Date;
}

/**
 * EDI envelope structure — ISA through IEA.
 * Full X12 hierarchical structure for multi-transaction support.
 */
export interface EdiEnvelope {
  isa: EdiSegment;
  gs: EdiSegment;
  st: EdiSegment;
  segments: EdiSegment[];
  se: EdiSegment;
  ge: EdiSegment;
  iea: EdiSegment;
}

/**
 * ISA segment (Interchange Control Header).
 * 16 fixed elements, always 106 characters.
 */
export interface IsaSegment {
  authorization: string;          // ISA01 - 2 chars
  security: string;               // ISA02 - 2 chars
  senderQualifier: string;         // ISA05 - 2 chars (ZZ)
  senderId: string;               // ISA06 - 15 chars (padded)
  receiverQualifier: string;       // ISA07 - 2 chars (ZZ)
  receiverId: string;             // ISA08 - 15 chars (padded)
  date: string;                   // ISA09 - 6 chars (YYMMDD)
  time: string;                   // ISA10 - 4 chars (HHMM)
  controlStandard: string;         // ISA11 - 1 char (U)
  version: string;                // ISA12 - 5 chars (00401)
  controlNumber: string;          // ISA13 - 9 chars (padded)
  ackRequested: string;           // ISA14 - 1 char (0/1)
  usageIndicator: string;         // ISA15 - 1 char (P/T)
  subElementSeparator: string;    // ISA16 - 1 char (:)
}

/**
 * GS segment (Functional Group Header).
 * Groups transaction sets by functional code.
 */
export interface GsSegment {
  functionalId: string;           // GS01 - e.g., PO, PR, SH, IN
  senderCode: string;             // GS02
  receiverCode: string;           // GS03
  date: string;                   // GS04 - CCYYMMDD
  time: string;                   // GS05 - HHMM
  controlNumber: string;          // GS06
  agency: string;                 // GS07 - X (ASC X12)
  version: string;                // GS08 - 004010 (version)
}

/**
 * EDI configuration per buyer/connection.
 * Controls generation behavior, SLA, segment rules.
 */
export interface EdiConfig {
  buyer_id: string;
  seller_id: string;
  seller_name?: string;
  buyer_name?: string;
  edi_version: string;            // 004010, 005010, etc.
  standard: EdiStandard;
  test_mode?: boolean;            // Test indicator in ISA15
  sla_ack_hours?: number;
  sla_ship_hours?: number;
  sla_invoice_hours?: number;
  segment_rules?: Record<string, unknown>;
}

/**
 * EDI validation result from envelope and segment checks.
 */
export interface EdiValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details?: {
    isa_count?: number;
    segment_count?: number;
    transaction_sets?: number;
    control_numbers?: Record<string, unknown>;
  };
}

export interface EdiGenerationResult {
  success: boolean;
  document?: string;
  errors: string[];
}

export interface EdiParseResult {
  success: boolean;
  document?: EdiDocument;
  data?: Record<string, unknown>;
  errors: string[];
}

/**
 * EDI spec definition for a particular transaction/buyer combo.
 * Maps source fields to EDI segment positions.
 */
export interface EdiSpec {
  standard: EdiStandard;
  document_type: EdiDocumentType;
  version: string;
  required_segments: string[];
  optional_segments: string[];
  segment_spec?: Array<{
    id: string;
    loop?: string;
    elements: Array<{
      position: number;
      value?: string;
      source?: string;
      transform?: string;
    }>;
  }>;
  validation_rules?: Array<{
    rule: string;
  }>;
}
