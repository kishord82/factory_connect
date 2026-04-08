/**
 * C1-C2: Core mapping engine — applies field mappings with transforms.
 * Validates inputs, applies transforms, detects unmapped fields.
 */
import type {
  MappingConfig,
  MappingConfigDef,
  MappingContext,
  MappingResult,
  ValidationError,
  FieldMapping,
  MappingFieldDef,
} from './types.js';
import { applyTransform, applyTransformChain } from './transform.js';

/**
 * Get a nested value from an object using dot-notation path.
 * Supports array indexing: "items[0].sku"
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Set a nested value on an object using dot-notation path.
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      // Check if next part is a number (array index)
      const nextPart = parts[i + 1];
      current[part] = /^\d+$/.test(nextPart) ? [] : {};
    }
    current = current[part] as Record<string, unknown>;
  }
  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

/**
 * Get all leaf paths from a source object for unmapped field detection.
 */
function getLeafPaths(obj: Record<string, unknown>, prefix: string = ''): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getLeafPaths(value as Record<string, unknown>, fullPath));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

/**
 * Validate a mapping configuration structure.
 * Returns validation errors if config is invalid.
 */
export function validateMappingConfig(
  config: MappingConfig | MappingConfigDef,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config.id || typeof config.id !== 'string') {
    errors.push({
      path: 'config.id',
      message: 'Mapping ID is required and must be a string',
      severity: 'error',
    });
  }

  if (!config.name || typeof config.name !== 'string') {
    errors.push({
      path: 'config.name',
      message: 'Mapping name is required and must be a string',
      severity: 'error',
    });
  }

  if (!config.source_type || typeof config.source_type !== 'string') {
    errors.push({
      path: 'config.source_type',
      message: 'Source type is required',
      severity: 'error',
    });
  }

  if (!config.target_type || typeof config.target_type !== 'string') {
    errors.push({
      path: 'config.target_type',
      message: 'Target type is required',
      severity: 'error',
    });
  }

  // Handle both new and legacy field names
  let fields: (FieldMapping | MappingFieldDef)[] = [];
  if ('field_mappings' in config) {
    fields = config.field_mappings;
  } else if ('fields' in config) {
    fields = (config as MappingConfigDef).fields;
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    errors.push({
      path: 'config.fields',
      message: 'At least one field mapping is required',
      severity: 'error',
    });
    return errors;
  }

  // Validate each field
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (!field.source_path || typeof field.source_path !== 'string') {
      errors.push({
        path: `config.fields[${i}].source_path`,
        message: 'source_path is required',
        severity: 'error',
      });
    }

    if (!field.target_path || typeof field.target_path !== 'string') {
      errors.push({
        path: `config.fields[${i}].target_path`,
        message: 'target_path is required',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate that all required fields are present in source data.
 */
export function validateRequiredFields(
  sourceData: Record<string, unknown>,
  config: MappingConfig | MappingConfigDef,
): ValidationError[] {
  const errors: ValidationError[] = [];
  let fields: (FieldMapping | MappingFieldDef)[] = [];
  if ('field_mappings' in config) {
    fields = config.field_mappings;
  } else if ('fields' in config) {
    fields = (config as MappingConfigDef).fields;
  }

  for (const field of fields) {
    // Check both is_required and required (for backward compat)
    const isRequired = 'is_required' in field ? field.is_required : ('required' in field ? (field as MappingFieldDef).required : false);

    if (isRequired) {
      const value = getNestedValue(sourceData, field.source_path);
      if (value === undefined || value === null) {
        errors.push({
          path: field.source_path,
          message: `Required field missing: ${field.source_path}`,
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

/**
 * Apply a mapping configuration to source data.
 * Supports both new MappingConfig and legacy MappingConfigDef.
 */
export function applyMapping(
  source: Record<string, unknown>,
  config: MappingConfig | MappingConfigDef,
  _context?: MappingContext,
): MappingResult {
  const startTime = performance.now();
  const result: Record<string, unknown> = {};
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const mappedSourcePaths = new Set<string>();

  // Handle both new and legacy field names
  let fields: (FieldMapping | MappingFieldDef)[] = [];
  if ('field_mappings' in config) {
    fields = config.field_mappings;
  } else if ('fields' in config) {
    fields = (config as MappingConfigDef).fields;
  }

  for (const field of fields) {
    mappedSourcePaths.add(field.source_path);

    try {
      let value = getNestedValue(source, field.source_path);

      // Check required status (handle both is_required and required)
      const isRequired = 'is_required' in field ? field.is_required : ('required' in field ? (field as MappingFieldDef).required : false);

      // Apply default if value is missing
      if (value === undefined || value === null) {
        if (field.default_value !== undefined) {
          value = field.default_value;
        } else if (isRequired) {
          errors.push({
            path: field.target_path,
            message: `Required field missing: ${field.source_path}`,
            severity: 'error',
          });
          continue;
        } else {
          continue; // Optional and no default — skip
        }
      }

      // Apply transform(s)
      // Support both single transform (legacy) and chain (new)
      if ('transform_rules' in field && field.transform_rules?.length) {
        value = applyTransformChain(value, field.transform_rules);
      } else if ('transform' in field && field.transform) {
        value = applyTransform(value, field.transform);
      }

      setNestedValue(result, field.target_path, value);
    } catch (err) {
      errors.push({
        path: field.target_path,
        message: err instanceof Error ? err.message : 'Transform failed',
        severity: 'error',
      });
    }
  }

  // Detect unmapped fields
  const allSourcePaths = getLeafPaths(source);
  const unmapped = allSourcePaths.filter((p) => !mappedSourcePaths.has(p));
  if (unmapped.length > 0) {
    warnings.push(`${unmapped.length} source fields not mapped`);
  }

  const executionTime = performance.now() - startTime;

  return {
    success: errors.length === 0,
    data: result,
    errors,
    warnings,
    unmapped_fields: unmapped,
    execution_time_ms: executionTime,
  };
}

export { getNestedValue, setNestedValue, getLeafPaths };
