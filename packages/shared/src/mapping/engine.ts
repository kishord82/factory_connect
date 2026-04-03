/**
 * C1-C2: Core mapping engine — applies field mappings with transforms.
 */
import type { MappingConfigDef, MappingContext, MappingResult, MappingError } from './types.js';
import { applyTransform } from './transform.js';

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
 * Apply a mapping configuration to source data.
 */
export function applyMapping(
  source: Record<string, unknown>,
  config: MappingConfigDef,
  _context?: MappingContext,
): MappingResult {
  const result: Record<string, unknown> = {};
  const errors: MappingError[] = [];
  const warnings: string[] = [];
  const mappedSourcePaths = new Set<string>();

  for (const field of config.fields) {
    mappedSourcePaths.add(field.source_path);

    try {
      let value = getNestedValue(source, field.source_path);

      // Apply default if value is missing
      if (value === undefined || value === null) {
        if (field.default_value !== undefined) {
          value = field.default_value;
        } else if (field.required) {
          errors.push({
            field: field.target_path,
            source_path: field.source_path,
            message: `Required field missing: ${field.source_path}`,
            code: 'REQUIRED_FIELD_MISSING',
          });
          continue;
        } else {
          continue; // Optional and no default — skip
        }
      }

      // Apply transform
      if (field.transform) {
        value = applyTransform(value, field.transform);
      }

      setNestedValue(result, field.target_path, value);
    } catch (err) {
      errors.push({
        field: field.target_path,
        source_path: field.source_path,
        message: err instanceof Error ? err.message : 'Transform failed',
        code: 'TRANSFORM_ERROR',
      });
    }
  }

  // Detect unmapped fields
  const allSourcePaths = getLeafPaths(source);
  const unmapped = allSourcePaths.filter((p) => !mappedSourcePaths.has(p));
  if (unmapped.length > 0) {
    warnings.push(`${unmapped.length} source fields not mapped`);
  }

  return {
    success: errors.length === 0,
    data: result,
    errors,
    warnings,
    unmapped_fields: unmapped,
  };
}

export { getNestedValue, setNestedValue, getLeafPaths };
