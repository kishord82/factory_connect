/**
 * C8-C9: EDI spec engine types.
 */

export type EdiStandard = 'X12' | 'EDIFACT' | 'cXML' | 'JSON_REST';

export type EdiDocumentType =
  | 'PO_850'        // Purchase Order
  | 'PO_ACK_855'    // PO Acknowledgment
  | 'ASN_856'       // Advance Ship Notice
  | 'INVOICE_810'   // Invoice
  | 'FUNC_ACK_997'; // Functional Acknowledgment

export interface EdiSegment {
  id: string;
  elements: string[];
}

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

export interface EdiSpec {
  standard: EdiStandard;
  document_type: EdiDocumentType;
  version: string;
  required_segments: string[];
  optional_segments: string[];
}
