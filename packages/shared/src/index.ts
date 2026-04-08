export * from './errors/index.js';
export { FcError } from './errors/index.js';
export * from './types/index.js';
export * from './constants/index.js';
export * from './edi/index.js';
export * from './llm/index.js';

// Mapping exports - explicitly listed to avoid conflicts with schemas
export type {
  FieldType,
  FieldMapping as MappingFieldType,
  MappingFieldDef,
  TransformRule,
  TransformType,
  MappingConfig as MappingConfigType,
  MappingConfigDef,
  MappingContext,
  MappingResult,
  MappingError,
  ValidationError,
  SourceAdapter,
} from './mapping/types.js';

export {
  applyMapping,
  validateMappingConfig,
  validateRequiredFields,
  getNestedValue,
  setNestedValue,
  getLeafPaths,
  applyTransform,
  applyTransformChain,
  getAvailableTransforms,
  registerProvider,
  getProvider,
  listProviders,
  heuristicMap,
  generateMappingSuggestions,
  suggestionsToMappings,
  createClaudeProvider,
  createTestProvider,
} from './mapping/index.js';

export type { LlmProvider, MappingSuggestion } from './mapping/ai-mapper.js';

// Schemas - directly export all schemas to avoid namespace issues
export {
  // Enum schemas
  SourceTypeSchema,
  OrderStatusSchema,
  SagaStepSchema,
  ConnectionModeSchema,
  ResyncStatusSchema,
  OutboxEventTypeSchema,
  AuditActionSchema,
  // Common schemas
  UuidSchema,
  AddressSchema,
  ContactSchema,
  PaginationSchema,
  DateRangeSchema,
  LineItemSchema,
  LineItemCreateSchema,
  // Order schemas
  CanonicalOrderCreateSchema,
  CanonicalOrderSchema,
  CanonicalOrderWithItemsSchema,
  CanonicalOrderUpdateSchema,
  OrderListQuerySchema,
  // Shipment schemas
  ShipmentPackSchema,
  CanonicalShipmentCreateSchema,
  CanonicalShipmentSchema,
  CanonicalShipmentWithPacksSchema,
  // Invoice schemas
  InvoiceLineItemSchema,
  TaxBreakdownSchema,
  CanonicalInvoiceCreateSchema,
  CanonicalInvoiceSchema,
  // Connection schemas
  ConnectionCreateSchema,
  ConnectionSchema,
  // Factory/Buyer schemas
  FactoryCreateSchema,
  FactorySchema,
  BuyerCreateSchema,
  BuyerSchema,
  // Audit/Outbox schemas
  AuditLogEntrySchema,
  OutboxEventSchema,
  // Mapping schemas
  FieldMappingSchema,
  MappingConfigSchema,
  // Resync schemas
  ResyncRequestCreateSchema,
  ResyncRequestSchema,
  // Type exports
  type Address,
  type Contact,
  type Pagination,
  type LineItem,
  type CanonicalOrderCreate,
  type CanonicalOrder,
  type CanonicalOrderWithItems,
  type CanonicalOrderUpdate,
  type OrderListQuery,
  type CanonicalShipmentCreate,
  type CanonicalShipment,
  type CanonicalShipmentWithPacks,
  type ShipmentPack,
  type InvoiceLineItem,
  type TaxBreakdown,
  type CanonicalInvoiceCreate,
  type CanonicalInvoice,
  type ConnectionCreate,
  type Connection,
  type FactoryCreate,
  type Factory,
  type BuyerCreate,
  type Buyer,
  type AuditLogEntry,
  type OutboxEvent,
  type FieldMapping,
  type MappingConfig,
  type ResyncRequestCreate,
  type ResyncRequest,
} from './schemas/index.js';

// Compliance schemas - export directly
export * from './schemas/compliance/index.js';

// Schemas - use namespace to avoid conflicts with mapping types
export * as Schemas from './schemas/index.js';
