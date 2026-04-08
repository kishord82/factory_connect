/**
 * C1-C2: Mapping engine types — core contracts for all mapping operations.
 */

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

/**
 * Field-level mapping configuration.
 * Maps from source_path (dot-notation) to target_path with optional transforms.
 */
export interface FieldMapping {
  source_path: string; // Dot-notation path, e.g., "order.items[0].sku"
  target_path: string; // Target path in canonical format
  transform_rules?: TransformRule[]; // Chain of transforms to apply
  is_required: boolean;
  default_value?: unknown;
}

/**
 * Legacy alias for backward compatibility.
 */
export interface MappingFieldDef extends FieldMapping {
  required: boolean; // Alias for is_required
  transform?: TransformRule; // Single transform (legacy)
}

/**
 * Single transform rule — type + params.
 */
export interface TransformRule {
  type: TransformType;
  params?: Record<string, unknown>;
}

/**
 * All supported transform types.
 * Each type is self-documenting via its name.
 */
export type TransformType =
  | 'direct'
  | 'date_format'
  | 'concatenate'
  | 'split'
  | 'value_map'
  | 'conditional'
  | 'arithmetic'
  | 'default_value'
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'pad'
  | 'substring'
  | 'regex_replace'
  // Legacy aliases for backward compatibility
  | 'concat'
  | 'lookup'
  | 'format_date'
  | 'to_upper'
  | 'to_lower'
  | 'trim'
  | 'pad_left'
  | 'pad_right'
  | 'replace'
  | 'math_multiply'
  | 'math_divide'
  | 'math_add'
  | 'to_fixed'
  | 'currency_convert'
  | 'unit_convert'
  | 'custom';

/**
 * Complete mapping configuration — contract between all services.
 */
export interface MappingConfig {
  id: string;
  name: string;
  version: number;
  source_type: string; // e.g., "tally_xml", "sap_idoc", "x12_850"
  target_type: string; // e.g., "canonical_order"
  field_mappings: FieldMapping[]; // All field mappings
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Legacy alias for backward compatibility.
 */
export interface MappingConfigDef extends MappingConfig {
  fields: MappingFieldDef[]; // Legacy
}

/**
 * Mapping execution context — metadata about the mapping run.
 */
export interface MappingContext {
  source_type: string;
  target_type: string;
  factory_id: string;
  connection_id: string;
  correlation_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Single validation error from mapping.
 */
export interface ValidationError {
  path: string; // Field path
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Complete mapping result — success/failure with detailed errors.
 */
export interface MappingResult {
  success: boolean;
  data: Record<string, unknown>;
  errors: ValidationError[];
  warnings: string[];
  unmapped_fields: string[];
  execution_time_ms?: number;
}

/**
 * Legacy alias for backward compatibility.
 */
export interface MappingError {
  field: string;
  source_path: string;
  message: string;
  code: string;
}

/**
 * Source format adapter — parse and serialize different formats.
 */
export interface SourceAdapter {
  name: string;
  parse(raw: string | Buffer): Record<string, unknown>;
  serialize(data: Record<string, unknown>): string | Buffer;
}
