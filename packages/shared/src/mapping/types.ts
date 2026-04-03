/**
 * C1-C2: Mapping engine types.
 */

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

export interface MappingFieldDef {
  source_path: string;
  target_path: string;
  transform?: TransformRule;
  default_value?: unknown;
  required: boolean;
}

export interface TransformRule {
  type: TransformType;
  params?: Record<string, unknown>;
}

export type TransformType =
  | 'direct'
  | 'concat'
  | 'split'
  | 'lookup'
  | 'format_date'
  | 'to_upper'
  | 'to_lower'
  | 'trim'
  | 'pad_left'
  | 'pad_right'
  | 'substring'
  | 'replace'
  | 'math_multiply'
  | 'math_divide'
  | 'math_add'
  | 'to_fixed'
  | 'currency_convert'
  | 'unit_convert'
  | 'custom';

export interface MappingConfigDef {
  id: string;
  name: string;
  version: number;
  source_type: string;
  target_type: string;
  fields: MappingFieldDef[];
  created_at: Date;
  updated_at: Date;
}

export interface MappingContext {
  source_type: string;
  target_type: string;
  factory_id: string;
  connection_id: string;
  metadata?: Record<string, unknown>;
}

export interface MappingResult {
  success: boolean;
  data: Record<string, unknown>;
  errors: MappingError[];
  warnings: string[];
  unmapped_fields: string[];
}

export interface MappingError {
  field: string;
  source_path: string;
  message: string;
  code: string;
}

export interface SourceAdapter {
  name: string;
  parse(raw: string | Buffer): Record<string, unknown>;
  serialize(data: Record<string, unknown>): string | Buffer;
}
