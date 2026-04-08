// Types
export type {
  EdiStandard,
  EdiDocumentType,
  EdiSegment,
  EdiDocument,
  EdiEnvelope,
  IsaSegment,
  GsSegment,
  EdiConfig,
  EdiValidationResult,
  EdiGenerationResult,
  EdiParseResult,
  EdiSpec,
} from './types.js';

// X12 Parser
export {
  parseX12,
  parseSegment,
  parseIsaSegment,
  parseGsSegment,
  validateEnvelope,
  extractTransactionSets,
  extractPOData,
} from './x12-parser.js';

// X12 Generator
export {
  padField,
  padFieldNum,
  formatEdiDate,
  formatEdiTime,
  nextControlNumber,
  generateEnvelope,
  generate855,
  generate856,
  generate810,
} from './x12-generator.js';

// JSON REST Adapter
export {
  parseJsonOrder,
  ediToJson,
  jsonToEdi,
  mapSegmentToJson,
  generateJsonAcknowledgment,
  generateJsonShipNotice,
} from './json-rest-adapter.js';

// cXML Adapter
export {
  parseCxmlOrderRequest,
  buildCxmlEnvelope,
  generateCxmlOrderConfirmation,
  generateCxmlShipNotice,
} from './cxml-adapter.js';
