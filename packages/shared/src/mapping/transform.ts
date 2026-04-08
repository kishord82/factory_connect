/**
 * C3: Transform rule execution engine.
 * Implements all transform types with consistent parameter handling.
 * Supports chaining multiple transforms in sequence.
 */
import type { TransformRule, TransformType } from './types.js';

type TransformFn = (value: unknown, params?: Record<string, unknown>) => unknown;

// ============ Transform Functions ============

function dateFormat(value: unknown, params?: Record<string, unknown>): unknown {
  const date = value instanceof Date ? value : new Date(String(value));
  const fmt = (params?.format as string) ?? 'ISO';
  if (fmt === 'ISO') return date.toISOString();
  if (fmt === 'YYYYMMDD') return date.toISOString().slice(0, 10).replace(/-/g, '');
  if (fmt === 'YYYY-MM-DD') return date.toISOString().slice(0, 10);
  if (fmt === 'MM/DD/YYYY') {
    const [y, m, d] = date.toISOString().slice(0, 10).split('-');
    return `${m}/${d}/${y}`;
  }
  return date.toISOString();
}

function concatenate(value: unknown, params?: Record<string, unknown>): unknown {
  const separator = (params?.separator as string) ?? '';
  const parts = Array.isArray(value) ? value : [value];
  const suffix = (params?.suffix as string) ?? '';
  const prefix = (params?.prefix as string) ?? '';
  return prefix + parts.map(String).join(separator) + suffix;
}

function split(value: unknown, params?: Record<string, unknown>): unknown {
  const sep = (params?.separator as string) ?? ',';
  const idx = params?.index as number | undefined;
  const parts = String(value).split(sep);
  return idx !== undefined ? parts[idx] : parts;
}

function valueMap(value: unknown, params?: Record<string, unknown>): unknown {
  const table = (params?.table as Record<string, unknown>) ?? {};
  const key = String(value);
  return table[key] ?? params?.default ?? value;
}

function conditional(value: unknown, params?: Record<string, unknown>): unknown {
  const condition = (params?.condition as string) ?? 'eq';
  const compareValue = params?.value;
  const thenValue = params?.then;
  const elseValue = params?.else ?? value;

  let matches = false;
  if (condition === 'eq') {
    matches = value === compareValue;
  } else if (condition === 'ne') {
    matches = value !== compareValue;
  } else if (condition === 'gt') {
    matches = Number(value) > Number(compareValue);
  } else if (condition === 'lt') {
    matches = Number(value) < Number(compareValue);
  } else if (condition === 'gte') {
    matches = Number(value) >= Number(compareValue);
  } else if (condition === 'lte') {
    matches = Number(value) <= Number(compareValue);
  } else if (condition === 'contains') {
    matches = String(value).includes(String(compareValue));
  }

  return matches ? thenValue : elseValue;
}

function arithmetic(value: unknown, params?: Record<string, unknown>): unknown {
  const op = (params?.operation as string) ?? 'add';
  const operand = Number(params?.operand ?? 0);

  const num = Number(value);
  if (op === 'add') return num + operand;
  if (op === 'subtract') return num - operand;
  if (op === 'multiply') return num * operand;
  if (op === 'divide') return operand === 0 ? 0 : num / operand;
  return num;
}

function defaultValue(value: unknown, params?: Record<string, unknown>): unknown {
  if (value === undefined || value === null || value === '') {
    return params?.value ?? undefined;
  }
  return value;
}

function uppercase(value: unknown): unknown {
  return String(value).toUpperCase();
}

function lowercase(value: unknown): unknown {
  return String(value).toLowerCase();
}

function trim(value: unknown): unknown {
  return String(value).trim();
}

function pad(value: unknown, params?: Record<string, unknown>): unknown {
  const len = (params?.length as number) ?? 10;
  const char = (params?.char as string) ?? '0';
  const side = (params?.side as string) ?? 'left';

  const str = String(value);
  return side === 'right' ? str.padEnd(len, char) : str.padStart(len, char);
}

function substring(value: unknown, params?: Record<string, unknown>): unknown {
  const start = (params?.start as number) ?? 0;
  const end = params?.end as number | undefined;
  return String(value).substring(start, end);
}

function regexReplace(value: unknown, params?: Record<string, unknown>): unknown {
  const pattern = (params?.pattern as string) ?? '';
  const replacement = (params?.replacement as string) ?? '';
  const flags = (params?.flags as string) ?? 'g';
  return String(value).replace(new RegExp(pattern, flags), replacement);
}

// ============ Transform Registry ============

const TRANSFORMS: Record<TransformType, TransformFn> = {
  // New names
  direct: (v) => v,
  date_format: dateFormat,
  concatenate,
  split,
  value_map: valueMap,
  conditional,
  arithmetic,
  default_value: defaultValue,
  uppercase,
  lowercase,
  trim,
  pad,
  substring,
  regex_replace: regexReplace,

  // Legacy names (for backward compatibility)
  concat: concatenate,
  lookup: valueMap,
  format_date: dateFormat,
  to_upper: uppercase,
  to_lower: lowercase,
  pad_left: (v, p) => pad(v, { ...p, side: 'left' }),
  pad_right: (v, p) => pad(v, { ...p, side: 'right' }),
  replace: regexReplace,
  math_multiply: (v, p) => arithmetic(v, { operation: 'multiply', operand: p?.factor }),
  math_divide: (v, p) => arithmetic(v, { operation: 'divide', operand: p?.divisor }),
  math_add: (v, p) => arithmetic(v, { operation: 'add', operand: p?.addend }),
  to_fixed: (v, p) => {
    const decimals = (p?.decimals as number) ?? 2;
    return Number(v).toFixed(decimals);
  },
  currency_convert: (v, p) => {
    const rate = (p?.rate as number) ?? 1;
    return (Number(v) * rate).toFixed(2);
  },
  unit_convert: (v, p) => {
    const factor = (p?.factor as number) ?? 1;
    return Number(v) * factor;
  },
  custom: (v) => v,
};

// ============ Public API ============

/**
 * Apply a single transform rule to a value.
 */
export function applyTransform(value: unknown, rule: TransformRule): unknown {
  const fn = TRANSFORMS[rule.type];
  if (!fn) {
    throw new Error(`Unknown transform type: ${rule.type}`);
  }
  return fn(value, rule.params);
}

/**
 * Apply a chain of transforms in sequence.
 * Each transform's output becomes the next transform's input.
 */
export function applyTransformChain(value: unknown, rules: TransformRule[]): unknown {
  let result = value;
  for (const rule of rules) {
    result = applyTransform(result, rule);
  }
  return result;
}

/**
 * Get list of all available transform types.
 */
export function getAvailableTransforms(): TransformType[] {
  return Object.keys(TRANSFORMS) as TransformType[];
}

// ============ Individual Transform Exports ============
// Exposed for unit testing and direct use

export {
  dateFormat,
  concatenate,
  split,
  valueMap,
  conditional,
  arithmetic,
  defaultValue,
  uppercase,
  lowercase,
  trim,
  pad,
  substring,
  regexReplace,
};
