// ============ Transform Functions ============
function dateFormat(value, params) {
    const date = value instanceof Date ? value : new Date(String(value));
    const fmt = params?.format ?? 'ISO';
    if (fmt === 'ISO')
        return date.toISOString();
    if (fmt === 'YYYYMMDD')
        return date.toISOString().slice(0, 10).replace(/-/g, '');
    if (fmt === 'YYYY-MM-DD')
        return date.toISOString().slice(0, 10);
    if (fmt === 'MM/DD/YYYY') {
        const [y, m, d] = date.toISOString().slice(0, 10).split('-');
        return `${m}/${d}/${y}`;
    }
    return date.toISOString();
}
function concatenate(value, params) {
    const separator = params?.separator ?? '';
    const parts = Array.isArray(value) ? value : [value];
    const suffix = params?.suffix ?? '';
    const prefix = params?.prefix ?? '';
    return prefix + parts.map(String).join(separator) + suffix;
}
function split(value, params) {
    const sep = params?.separator ?? ',';
    const idx = params?.index;
    const parts = String(value).split(sep);
    return idx !== undefined ? parts[idx] : parts;
}
function valueMap(value, params) {
    const table = params?.table ?? {};
    const key = String(value);
    return table[key] ?? params?.default ?? value;
}
function conditional(value, params) {
    const condition = params?.condition ?? 'eq';
    const compareValue = params?.value;
    const thenValue = params?.then;
    const elseValue = params?.else ?? value;
    let matches = false;
    if (condition === 'eq') {
        matches = value === compareValue;
    }
    else if (condition === 'ne') {
        matches = value !== compareValue;
    }
    else if (condition === 'gt') {
        matches = Number(value) > Number(compareValue);
    }
    else if (condition === 'lt') {
        matches = Number(value) < Number(compareValue);
    }
    else if (condition === 'gte') {
        matches = Number(value) >= Number(compareValue);
    }
    else if (condition === 'lte') {
        matches = Number(value) <= Number(compareValue);
    }
    else if (condition === 'contains') {
        matches = String(value).includes(String(compareValue));
    }
    return matches ? thenValue : elseValue;
}
function arithmetic(value, params) {
    const op = params?.operation ?? 'add';
    const operand = Number(params?.operand ?? 0);
    const num = Number(value);
    if (op === 'add')
        return num + operand;
    if (op === 'subtract')
        return num - operand;
    if (op === 'multiply')
        return num * operand;
    if (op === 'divide')
        return operand === 0 ? 0 : num / operand;
    return num;
}
function defaultValue(value, params) {
    if (value === undefined || value === null || value === '') {
        return params?.value ?? undefined;
    }
    return value;
}
function uppercase(value) {
    return String(value).toUpperCase();
}
function lowercase(value) {
    return String(value).toLowerCase();
}
function trim(value) {
    return String(value).trim();
}
function pad(value, params) {
    const len = params?.length ?? 10;
    const char = params?.char ?? '0';
    const side = params?.side ?? 'left';
    const str = String(value);
    return side === 'right' ? str.padEnd(len, char) : str.padStart(len, char);
}
function substring(value, params) {
    const start = params?.start ?? 0;
    const end = params?.end;
    return String(value).substring(start, end);
}
function regexReplace(value, params) {
    const pattern = params?.pattern ?? '';
    const replacement = params?.replacement ?? '';
    const flags = params?.flags ?? 'g';
    return String(value).replace(new RegExp(pattern, flags), replacement);
}
// ============ Transform Registry ============
const TRANSFORMS = {
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
        const decimals = p?.decimals ?? 2;
        return Number(v).toFixed(decimals);
    },
    currency_convert: (v, p) => {
        const rate = p?.rate ?? 1;
        return (Number(v) * rate).toFixed(2);
    },
    unit_convert: (v, p) => {
        const factor = p?.factor ?? 1;
        return Number(v) * factor;
    },
    custom: (v) => v,
};
// ============ Public API ============
/**
 * Apply a single transform rule to a value.
 */
export function applyTransform(value, rule) {
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
export function applyTransformChain(value, rules) {
    let result = value;
    for (const rule of rules) {
        result = applyTransform(result, rule);
    }
    return result;
}
/**
 * Get list of all available transform types.
 */
export function getAvailableTransforms() {
    return Object.keys(TRANSFORMS);
}
// ============ Individual Transform Exports ============
// Exposed for unit testing and direct use
export { dateFormat, concatenate, split, valueMap, conditional, arithmetic, defaultValue, uppercase, lowercase, trim, pad, substring, regexReplace, };
//# sourceMappingURL=transform.js.map