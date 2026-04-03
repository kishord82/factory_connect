/**
 * C3: Transform rule execution engine.
 */
import type { TransformRule, TransformType } from './types.js';

type TransformFn = (value: unknown, params?: Record<string, unknown>) => unknown;

const TRANSFORMS: Record<TransformType, TransformFn> = {
  direct: (v) => v,
  concat: (v, p) => {
    const separator = (p?.separator as string) ?? '';
    const parts = Array.isArray(v) ? v : [v];
    const suffix = (p?.suffix as string) ?? '';
    const prefix = (p?.prefix as string) ?? '';
    return prefix + parts.map(String).join(separator) + suffix;
  },
  split: (v, p) => {
    const sep = (p?.separator as string) ?? ',';
    const idx = p?.index as number | undefined;
    const parts = String(v).split(sep);
    return idx !== undefined ? parts[idx] : parts;
  },
  lookup: (v, p) => {
    const table = (p?.table as Record<string, unknown>) ?? {};
    const key = String(v);
    return table[key] ?? p?.default ?? v;
  },
  format_date: (v, p) => {
    const date = v instanceof Date ? v : new Date(String(v));
    const fmt = (p?.format as string) ?? 'ISO';
    if (fmt === 'ISO') return date.toISOString();
    if (fmt === 'YYYYMMDD') return date.toISOString().slice(0, 10).replace(/-/g, '');
    if (fmt === 'YYYY-MM-DD') return date.toISOString().slice(0, 10);
    if (fmt === 'MM/DD/YYYY') {
      const [y, m, d] = date.toISOString().slice(0, 10).split('-');
      return `${m}/${d}/${y}`;
    }
    return date.toISOString();
  },
  to_upper: (v) => String(v).toUpperCase(),
  to_lower: (v) => String(v).toLowerCase(),
  trim: (v) => String(v).trim(),
  pad_left: (v, p) => {
    const len = (p?.length as number) ?? 10;
    const char = (p?.char as string) ?? '0';
    return String(v).padStart(len, char);
  },
  pad_right: (v, p) => {
    const len = (p?.length as number) ?? 10;
    const char = (p?.char as string) ?? ' ';
    return String(v).padEnd(len, char);
  },
  substring: (v, p) => {
    const start = (p?.start as number) ?? 0;
    const end = p?.end as number | undefined;
    return String(v).substring(start, end);
  },
  replace: (v, p) => {
    const pattern = (p?.pattern as string) ?? '';
    const replacement = (p?.replacement as string) ?? '';
    return String(v).replace(new RegExp(pattern, 'g'), replacement);
  },
  math_multiply: (v, p) => {
    const factor = (p?.factor as number) ?? 1;
    return Number(v) * factor;
  },
  math_divide: (v, p) => {
    const divisor = (p?.divisor as number) ?? 1;
    return divisor === 0 ? 0 : Number(v) / divisor;
  },
  math_add: (v, p) => {
    const addend = (p?.addend as number) ?? 0;
    return Number(v) + addend;
  },
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
  custom: (v, _p) => {
    // Custom transforms are no-ops by default — handled by plugins
    return v;
  },
};

export function applyTransform(value: unknown, rule: TransformRule): unknown {
  const fn = TRANSFORMS[rule.type];
  if (!fn) {
    throw new Error(`Unknown transform type: ${rule.type}`);
  }
  return fn(value, rule.params);
}

export function getAvailableTransforms(): TransformType[] {
  return Object.keys(TRANSFORMS) as TransformType[];
}
