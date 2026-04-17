/**
 * Transform tests — comprehensive coverage of all transform functions.
 */

import { describe, it, expect } from 'vitest';

import {
  applyTransform,
  applyTransformChain,
  getAvailableTransforms,
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
} from './transform.js';

const HELLO_LOWER = 'hello';
const HELLO_UPPER = 'HELLO';
const HELLO_WORLD_STR = 'hello world';
const DATE_ISO_STR = '2024-03-15T00:00:00Z';
const DATE_FORMAT_YMD = 'YYYY-MM-DD';
const DATE_FORMATTED_YMD = '2024-03-15';
const APPLIES_VIA = 'applies via applyTransform';

describe('Transform Registry', () => {
  it('lists available transforms', () => {
    const transforms = getAvailableTransforms();
    expect(transforms).toContain('direct');
    expect(transforms).toContain('uppercase');
    expect(transforms).toContain('lowercase');
    expect(transforms.length).toBeGreaterThan(10);
  });

  it('throws on unknown transform type', () => {
    expect(() => {
      applyTransform('value', { type: 'unknown_transform' as never });
    }).toThrow();
  });
});

describe('Direct Transform', () => {
  it('returns value unchanged', () => {
    expect(applyTransform(HELLO_LOWER, { type: 'direct' })).toBe(HELLO_LOWER);
    expect(applyTransform(42, { type: 'direct' })).toBe(42);
    expect(applyTransform(null, { type: 'direct' })).toBe(null);
  });
});

describe('String Transforms', () => {
  describe('uppercase', () => {
    it('converts to uppercase', () => {
      expect(uppercase(HELLO_LOWER)).toBe(HELLO_UPPER);
      expect(uppercase('Hello World')).toBe('HELLO WORLD');
    });

    it('handles numbers', () => {
      expect(uppercase(123)).toBe('123');
    });

    it(APPLIES_VIA, () => {
      expect(applyTransform(HELLO_LOWER, { type: 'uppercase' })).toBe(HELLO_UPPER);
      expect(applyTransform(HELLO_LOWER, { type: 'to_upper' })).toBe(HELLO_UPPER); // legacy
    });
  });

  describe('lowercase', () => {
    it('converts to lowercase', () => {
      expect(lowercase(HELLO_UPPER)).toBe(HELLO_LOWER);
      expect(lowercase('Hello World')).toBe(HELLO_WORLD_STR);
    });

    it(APPLIES_VIA, () => {
      expect(applyTransform(HELLO_UPPER, { type: 'lowercase' })).toBe(HELLO_LOWER);
      expect(applyTransform(HELLO_UPPER, { type: 'to_lower' })).toBe(HELLO_LOWER); // legacy
    });
  });

  describe('trim', () => {
    it('removes leading/trailing whitespace', () => {
      expect(trim('  hello  ')).toBe(HELLO_LOWER);
      expect(trim('\nhello\n')).toBe(HELLO_LOWER);
    });

    it(APPLIES_VIA, () => {
      expect(applyTransform('  hello  ', { type: 'trim' })).toBe(HELLO_LOWER);
    });
  });

  describe('concatenate', () => {
    it('joins array with separator', () => {
      expect(
        concatenate(['a', 'b', 'c'], {
          separator: '-',
        }),
      ).toBe('a-b-c');
    });

    it('handles single value', () => {
      expect(concatenate(HELLO_LOWER, { separator: '-' })).toBe(HELLO_LOWER);
    });

    it('adds prefix and suffix', () => {
      expect(
        concatenate(['first', 'last'], {
          separator: ' ',
          prefix: 'Mr. ',
          suffix: ' Esq.',
        }),
      ).toBe('Mr. first last Esq.');
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform(['a', 'b', 'c'], {
          type: 'concatenate',
          params: { separator: '-' },
        }),
      ).toBe('a-b-c');

      // legacy
      expect(
        applyTransform(['a', 'b', 'c'], {
          type: 'concat',
          params: { separator: '-' },
        }),
      ).toBe('a-b-c');
    });
  });

  describe('split', () => {
    it('splits string by separator', () => {
      const result = split('a,b,c', { separator: ',' }) as string[];
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('extracts specific index', () => {
      expect(
        split('a,b,c', {
          separator: ',',
          index: 1,
        }),
      ).toBe('b');
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform('a,b,c', {
          type: 'split',
          params: { separator: ',', index: 1 },
        }),
      ).toBe('b');
    });
  });

  describe('substring', () => {
    it('extracts substring with start and end', () => {
      expect(substring(HELLO_WORLD_STR, { start: 0, end: 5 })).toBe(HELLO_LOWER);
    });

    it('extracts from start to end', () => {
      expect(substring(HELLO_WORLD_STR, { start: 6 })).toBe('world');
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform(HELLO_WORLD_STR, {
          type: 'substring',
          params: { start: 0, end: 5 },
        }),
      ).toBe(HELLO_LOWER);
    });
  });

  describe('pad', () => {
    it('pads left by default', () => {
      expect(pad('42', { length: 5, char: '0' })).toBe('00042');
    });

    it('pads right when specified', () => {
      expect(pad(HELLO_LOWER, { length: 10, char: '*', side: 'right' })).toBe('hello*****');
    });

    it('uses space as default char for right padding', () => {
      expect(pad('test', { length: 8, side: 'right' })).toBe('test    ');
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform('42', {
          type: 'pad',
          params: { length: 5, char: '0' },
        }),
      ).toBe('00042');

      // legacy pad_left
      expect(
        applyTransform('42', {
          type: 'pad_left',
          params: { length: 5, char: '0' },
        }),
      ).toBe('00042');

      // legacy pad_right
      expect(
        applyTransform('test', {
          type: 'pad_right',
          params: { length: 8, char: '*' },
        }),
      ).toBe('test****');
    });
  });

  describe('regexReplace', () => {
    it('replaces all matches', () => {
      expect(
        regexReplace('foo-bar-baz', {
          pattern: '-',
          replacement: '_',
        }),
      ).toBe('foo_bar_baz');
    });

    it('respects regex flags', () => {
      expect(
        regexReplace('FOO foo FOO', {
          pattern: 'foo',
          replacement: 'bar',
          flags: 'i',
        }),
      ).toBe('bar bar bar');
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform('foo-bar', {
          type: 'regex_replace',
          params: { pattern: '-', replacement: '_' },
        }),
      ).toBe('foo_bar');

      // legacy
      expect(
        applyTransform('foo-bar', {
          type: 'replace',
          params: { pattern: '-', replacement: '_' },
        }),
      ).toBe('foo_bar');
    });
  });
});

describe('Date Transforms', () => {
  describe('dateFormat', () => {
    it('formats to ISO', () => {
      const result = dateFormat(DATE_ISO_STR, { format: 'ISO' });
      expect(result).toBe('2024-03-15T00:00:00.000Z');
    });

    it('formats to YYYYMMDD', () => {
      expect(dateFormat(DATE_ISO_STR, { format: 'YYYYMMDD' })).toBe('20240315');
    });

    it('formats to YYYY-MM-DD', () => {
      expect(dateFormat(DATE_ISO_STR, { format: DATE_FORMAT_YMD })).toBe(DATE_FORMATTED_YMD);
    });

    it('formats to MM/DD/YYYY', () => {
      expect(dateFormat(DATE_ISO_STR, { format: 'MM/DD/YYYY' })).toBe('03/15/2024');
    });

    it('defaults to ISO format', () => {
      const result = dateFormat(DATE_ISO_STR);
      expect(result).toBe('2024-03-15T00:00:00.000Z');
    });

    it('handles Date objects', () => {
      const date = new Date(DATE_ISO_STR);
      expect(dateFormat(date, { format: DATE_FORMAT_YMD })).toBe(DATE_FORMATTED_YMD);
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform(DATE_ISO_STR, {
          type: 'date_format',
          params: { format: DATE_FORMAT_YMD },
        }),
      ).toBe(DATE_FORMATTED_YMD);

      // legacy
      expect(
        applyTransform(DATE_ISO_STR, {
          type: 'format_date',
          params: { format: DATE_FORMAT_YMD },
        }),
      ).toBe(DATE_FORMATTED_YMD);
    });
  });
});

describe('Lookup/Mapping Transforms', () => {
  describe('valueMap', () => {
    it('maps value using lookup table', () => {
      expect(
        valueMap('USD', {
          table: { USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound' },
        }),
      ).toBe('US Dollar');
    });

    it('returns default for unmapped value', () => {
      expect(
        valueMap('XYZ', {
          table: { USD: 'US Dollar' },
          default: 'Unknown Currency',
        }),
      ).toBe('Unknown Currency');
    });

    it('returns original value if no default', () => {
      expect(
        valueMap('XYZ', {
          table: { USD: 'US Dollar' },
        }),
      ).toBe('XYZ');
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform('USD', {
          type: 'value_map',
          params: { table: { USD: 'US Dollar' } },
        }),
      ).toBe('US Dollar');

      // legacy
      expect(
        applyTransform('USD', {
          type: 'lookup',
          params: { table: { USD: 'US Dollar' } },
        }),
      ).toBe('US Dollar');
    });
  });
});

describe('Conditional Transforms', () => {
  describe('conditional', () => {
    it('evaluates eq condition', () => {
      expect(
        conditional('USD', {
          condition: 'eq',
          value: 'USD',
          then: 'match',
          else: 'no',
        }),
      ).toBe('match');

      expect(
        conditional('EUR', {
          condition: 'eq',
          value: 'USD',
          then: 'match',
          else: 'no',
        }),
      ).toBe('no');
    });

    it('evaluates ne condition', () => {
      expect(
        conditional('EUR', {
          condition: 'ne',
          value: 'USD',
          then: 'different',
          else: 'same',
        }),
      ).toBe('different');
    });

    it('evaluates gt condition', () => {
      expect(
        conditional(10, {
          condition: 'gt',
          value: 5,
          then: 'greater',
          else: 'less',
        }),
      ).toBe('greater');
    });

    it('evaluates lt condition', () => {
      expect(
        conditional(3, {
          condition: 'lt',
          value: 5,
          then: 'less',
          else: 'greater',
        }),
      ).toBe('less');
    });

    it('evaluates gte condition', () => {
      expect(
        conditional(5, {
          condition: 'gte',
          value: 5,
          then: 'yes',
          else: 'no',
        }),
      ).toBe('yes');
    });

    it('evaluates lte condition', () => {
      expect(
        conditional(5, {
          condition: 'lte',
          value: 5,
          then: 'yes',
          else: 'no',
        }),
      ).toBe('yes');
    });

    it('evaluates contains condition', () => {
      expect(
        conditional(HELLO_WORLD_STR, {
          condition: 'contains',
          value: 'world',
          then: 'found',
          else: 'notfound',
        }),
      ).toBe('found');
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform('USD', {
          type: 'conditional',
          params: {
            condition: 'eq',
            value: 'USD',
            then: 'match',
            else: 'no',
          },
        }),
      ).toBe('match');
    });
  });
});

describe('Arithmetic Transforms', () => {
  describe('arithmetic', () => {
    it('adds operand', () => {
      expect(arithmetic(10, { operation: 'add', operand: 5 })).toBe(15);
    });

    it('subtracts operand', () => {
      expect(arithmetic(10, { operation: 'subtract', operand: 3 })).toBe(7);
    });

    it('multiplies by operand', () => {
      expect(arithmetic(10, { operation: 'multiply', operand: 2 })).toBe(20);
    });

    it('divides by operand', () => {
      expect(arithmetic(10, { operation: 'divide', operand: 2 })).toBe(5);
    });

    it('handles division by zero gracefully', () => {
      expect(arithmetic(10, { operation: 'divide', operand: 0 })).toBe(0);
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform(10, {
          type: 'arithmetic',
          params: { operation: 'multiply', operand: 2 },
        }),
      ).toBe(20);

      // legacy math_multiply
      expect(
        applyTransform(10, {
          type: 'math_multiply',
          params: { factor: 2.5 },
        }),
      ).toBe(25);

      // legacy math_add
      expect(
        applyTransform(10, {
          type: 'math_add',
          params: { addend: 5 },
        }),
      ).toBe(15);

      // legacy math_divide
      expect(
        applyTransform(10, {
          type: 'math_divide',
          params: { divisor: 2 },
        }),
      ).toBe(5);
    });
  });

  describe('to_fixed', () => {
    it('formats number to fixed decimals', () => {
      expect(
        applyTransform(1234.56789, {
          type: 'to_fixed',
          params: { decimals: 2 },
        }),
      ).toBe('1234.57');
    });
  });

  describe('currency_convert', () => {
    it('converts currency with rate', () => {
      expect(
        applyTransform(100, {
          type: 'currency_convert',
          params: { rate: 1.25 },
        }),
      ).toBe('125.00');
    });
  });

  describe('unit_convert', () => {
    it('converts units with factor', () => {
      expect(
        applyTransform(100, {
          type: 'unit_convert',
          params: { factor: 2.54 },
        }),
      ).toBe(254);
    });
  });
});

describe('Default Value Transforms', () => {
  describe('defaultValue', () => {
    it('returns default when value is undefined', () => {
      expect(defaultValue(undefined, { value: 'default' })).toBe('default');
    });

    it('returns default when value is null', () => {
      expect(defaultValue(null, { value: 'default' })).toBe('default');
    });

    it('returns default when value is empty string', () => {
      expect(defaultValue('', { value: 'default' })).toBe('default');
    });

    it('returns original value if not empty', () => {
      expect(defaultValue('actual', { value: 'default' })).toBe('actual');
    });

    it(APPLIES_VIA, () => {
      expect(
        applyTransform(undefined, {
          type: 'default_value',
          params: { value: 'fallback' },
        }),
      ).toBe('fallback');
    });
  });
});

describe('Transform Chaining', () => {
  it('applies multiple transforms in sequence', () => {
    const result = applyTransformChain(HELLO_WORLD_STR, [
      { type: 'uppercase' },
      { type: 'pad', params: { length: 15, char: '*', side: 'right' } },
    ]);
    expect(result).toBe('HELLO WORLD****');
  });

  it('chains conditional and arithmetic', () => {
    const result = applyTransformChain(10, [
      { type: 'conditional', params: { condition: 'gt', value: 5, then: 100, else: 10 } },
      { type: 'arithmetic', params: { operation: 'multiply', operand: 2 } },
    ]);
    expect(result).toBe(200);
  });

  it('chains date formatting and padding', () => {
    const result = applyTransformChain('2024-03-15T00:00:00Z', [
      { type: 'date_format', params: { format: 'YYYYMMDD' } },
      { type: 'pad', params: { length: 12, char: '0', side: 'left' } },
    ]);
    expect(result).toBe('000020240315');
  });

  it('chains lookup and uppercase', () => {
    const result = applyTransformChain('usd', [
      {
        type: 'value_map',
        params: {
          table: { usd: 'united states dollar', eur: 'euro' },
        },
      },
      { type: 'uppercase' },
    ]);
    expect(result).toBe('UNITED STATES DOLLAR');
  });

  it('returns original value for empty chain', () => {
    const result = applyTransformChain(HELLO_LOWER, []);
    expect(result).toBe(HELLO_LOWER);
  });
});

describe('Custom Transform', () => {
  it('applies custom transform (no-op by default)', () => {
    expect(applyTransform('value', { type: 'custom' })).toBe('value');
  });
});
