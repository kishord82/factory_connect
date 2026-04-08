import { describe, it, expect } from 'vitest';
import {
  applyMapping,
  validateMappingConfig,
  validateRequiredFields,
  getNestedValue,
  setNestedValue,
  getLeafPaths,
} from './engine.js';
import {
  applyTransform,
  applyTransformChain,
  getAvailableTransforms,
  dateFormat,
  conditional,
  arithmetic,
  defaultValue,
  pad,
  substring,
  regexReplace,
} from './transform.js';
import {
  heuristicMap,
  suggestionsToMappings,
  createTestProvider,
  registerProvider,
  generateMappingSuggestions,
} from './ai-mapper.js';
import type { MappingConfig, MappingConfigDef } from './types.js';

describe('Mapping Engine', () => {
  describe('getNestedValue', () => {
    it('gets top-level value', () => {
      expect(getNestedValue({ foo: 'bar' }, 'foo')).toBe('bar');
    });
    it('gets nested value', () => {
      expect(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
    });
    it('returns undefined for missing path', () => {
      expect(getNestedValue({ a: 1 }, 'b.c')).toBeUndefined();
    });
    it('handles array indexing', () => {
      expect(getNestedValue({ items: ['a', 'b', 'c'] }, 'items[1]')).toBe('b');
    });
  });

  describe('setNestedValue', () => {
    it('sets top-level value', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'foo', 'bar');
      expect(obj.foo).toBe('bar');
    });
    it('sets nested value, creating intermediate objects', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'a.b.c', 42);
      expect((obj.a as Record<string, unknown>).b).toEqual({ c: 42 });
    });
  });

  describe('getLeafPaths', () => {
    it('returns leaf paths from nested object', () => {
      const paths = getLeafPaths({ a: 1, b: { c: 2, d: 3 }, e: 'x' });
      expect(paths).toEqual(expect.arrayContaining(['a', 'b.c', 'b.d', 'e']));
    });
  });

  describe('applyMapping', () => {
    const config: MappingConfigDef = {
      id: 'test',
      name: 'Test Mapping',
      version: 1,
      source_type: 'X12',
      target_type: 'canonical',
      field_mappings: [],
      is_active: true,
      fields: [
        { source_path: 'po_number', target_path: 'buyer_po_number', is_required: true, required: true },
        {
          source_path: 'date',
          target_path: 'order_date',
          is_required: true,
          required: true,
          transform: { type: 'format_date', params: { format: 'YYYY-MM-DD' } },
        },
        {
          source_path: 'total',
          target_path: 'total_amount',
          is_required: false,
          required: false,
          transform: { type: 'to_fixed', params: { decimals: 2 } },
        },
        {
          source_path: 'missing_field',
          target_path: 'optional_val',
          is_required: false,
          required: false,
          default_value: 'N/A',
        },
      ],
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('maps fields with transforms', () => {
      const source = {
        po_number: 'PO-123',
        date: '2024-01-15T00:00:00Z',
        total: 1234.5,
        extra: 'x',
      };
      const result = applyMapping(source, config);
      expect(result.success).toBe(true);
      expect(result.data.buyer_po_number).toBe('PO-123');
      expect(result.data.order_date).toBe('2024-01-15');
      expect(result.data.total_amount).toBe('1234.50');
      expect(result.data.optional_val).toBe('N/A');
    });

    it('reports error for missing required field', () => {
      const source = { date: '2024-01-15T00:00:00Z' };
      const result = applyMapping(source, config);
      expect(result.success).toBe(false);
      expect(result.errors[0].severity).toBe('error');
    });

    it('detects unmapped fields', () => {
      const source = {
        po_number: 'PO-1',
        date: '2024-01-15T00:00:00Z',
        unknown_field: 'value',
      };
      const result = applyMapping(source, config);
      expect(result.unmapped_fields).toContain('unknown_field');
    });
  });
});

describe('Transform Engine', () => {
  it('applies direct transform', () => {
    expect(applyTransform('hello', { type: 'direct' })).toBe('hello');
  });
  it('applies to_upper', () => {
    expect(applyTransform('hello', { type: 'to_upper' })).toBe('HELLO');
  });
  it('applies concat with separator', () => {
    expect(
      applyTransform(['a', 'b', 'c'], {
        type: 'concat',
        params: { separator: '-' },
      }),
    ).toBe('a-b-c');
  });
  it('applies pad_left', () => {
    expect(
      applyTransform('42', {
        type: 'pad_left',
        params: { length: 5, char: '0' },
      }),
    ).toBe('00042');
  });
  it('applies math_multiply', () => {
    expect(
      applyTransform(10, {
        type: 'math_multiply',
        params: { factor: 2.5 },
      }),
    ).toBe(25);
  });
  it('applies lookup', () => {
    expect(
      applyTransform('USD', {
        type: 'lookup',
        params: { table: { USD: 'US Dollar', EUR: 'Euro' } },
      }),
    ).toBe('US Dollar');
  });
  it('applies format_date YYYYMMDD', () => {
    expect(
      applyTransform('2024-03-15T00:00:00Z', {
        type: 'format_date',
        params: { format: 'YYYYMMDD' },
      }),
    ).toBe('20240315');
  });
  it('applies split with index', () => {
    expect(
      applyTransform('a,b,c', {
        type: 'split',
        params: { separator: ',', index: 1 },
      }),
    ).toBe('b');
  });
  it('applies replace', () => {
    expect(
      applyTransform('foo-bar-baz', {
        type: 'replace',
        params: { pattern: '-', replacement: '_' },
      }),
    ).toBe('foo_bar_baz');
  });
  it('lists available transforms', () => {
    const transforms = getAvailableTransforms();
    expect(transforms).toContain('direct');
    expect(transforms).toContain('to_upper');
    expect(transforms.length).toBeGreaterThan(10);
  });
});

describe('Transform Chain', () => {
  it('applies multiple transforms in sequence', () => {
    const result = applyTransformChain('hello world', [
      { type: 'uppercase' },
      { type: 'pad', params: { length: 15, char: '*', side: 'right' } },
    ]);
    expect(result).toBe('HELLO WORLD****');
  });

  it('chains conditional and arithmetic transforms', () => {
    const result = applyTransformChain(10, [
      { type: 'conditional', params: { condition: 'gt', value: 5, then: 100, else: 10 } },
      { type: 'arithmetic', params: { operation: 'multiply', operand: 2 } },
    ]);
    expect(result).toBe(200);
  });
});

describe('Individual Transform Functions', () => {
  describe('dateFormat', () => {
    it('formats to ISO', () => {
      expect(dateFormat('2024-03-15T00:00:00Z', { format: 'ISO' })).toBe(
        '2024-03-15T00:00:00.000Z',
      );
    });
    it('formats to YYYYMMDD', () => {
      expect(dateFormat('2024-03-15T00:00:00Z', { format: 'YYYYMMDD' })).toBe('20240315');
    });
    it('formats to YYYY-MM-DD', () => {
      expect(dateFormat('2024-03-15T00:00:00Z', { format: 'YYYY-MM-DD' })).toBe('2024-03-15');
    });
  });

  describe('conditional', () => {
    it('evaluates eq condition', () => {
      expect(conditional('USD', { condition: 'eq', value: 'USD', then: 'match', else: 'no' })).toBe(
        'match',
      );
    });
    it('evaluates gt condition', () => {
      expect(
        conditional(10, { condition: 'gt', value: 5, then: 'greater', else: 'less' }),
      ).toBe('greater');
    });
    it('evaluates contains condition', () => {
      expect(
        conditional('hello world', {
          condition: 'contains',
          value: 'world',
          then: 'found',
          else: 'notfound',
        }),
      ).toBe('found');
    });
  });

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
  });

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
  });

  describe('pad', () => {
    it('pads left by default', () => {
      expect(pad('42', { length: 5, char: '0' })).toBe('00042');
    });
    it('pads right when specified', () => {
      expect(pad('hello', { length: 10, char: '*', side: 'right' })).toBe('hello*****');
    });
  });

  describe('substring', () => {
    it('extracts substring with start and end', () => {
      expect(substring('hello world', { start: 0, end: 5 })).toBe('hello');
    });
    it('extracts from start to end of string', () => {
      expect(substring('hello world', { start: 6 })).toBe('world');
    });
  });

  describe('regexReplace', () => {
    it('replaces all matches', () => {
      expect(regexReplace('foo-bar-baz', { pattern: '-', replacement: '_' })).toBe(
        'foo_bar_baz',
      );
    });
    it('respects flags parameter', () => {
      expect(
        regexReplace('FOO foo FOO', {
          pattern: 'foo',
          replacement: 'bar',
          flags: 'i',
        }),
      ).toBe('bar bar bar');
    });
  });
});

describe('Validation', () => {
  describe('validateMappingConfig', () => {
    it('rejects config without id', () => {
      const errors = validateMappingConfig({
        id: '',
        name: 'Test',
        version: 1,
        source_type: 'x12',
        target_type: 'canonical',
        field_mappings: [],
        is_active: true,
      });
      expect(errors.some((e) => e.path === 'config.id')).toBe(true);
    });

    it('rejects config without field mappings', () => {
      const errors = validateMappingConfig({
        id: 'test',
        name: 'Test',
        version: 1,
        source_type: 'x12',
        target_type: 'canonical',
        field_mappings: [],
        is_active: true,
      });
      expect(errors.some((e) => e.path === 'config.fields')).toBe(true);
    });

    it('accepts valid config', () => {
      const errors = validateMappingConfig({
        id: 'test',
        name: 'Test',
        version: 1,
        source_type: 'x12',
        target_type: 'canonical',
        field_mappings: [
          {
            source_path: 'po_number',
            target_path: 'buyer_po_number',
            is_required: true,
          },
        ],
        is_active: true,
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateRequiredFields', () => {
    it('detects missing required fields', () => {
      const config: MappingConfig = {
        id: 'test',
        name: 'Test',
        version: 1,
        source_type: 'x12',
        target_type: 'canonical',
        field_mappings: [
          {
            source_path: 'po_number',
            target_path: 'buyer_po_number',
            is_required: true,
          },
        ],
        is_active: true,
      };
      const errors = validateRequiredFields({}, config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].path).toBe('po_number');
    });

    it('passes when all required fields present', () => {
      const config: MappingConfig = {
        id: 'test',
        name: 'Test',
        version: 1,
        source_type: 'x12',
        target_type: 'canonical',
        field_mappings: [
          {
            source_path: 'po_number',
            target_path: 'buyer_po_number',
            is_required: true,
          },
        ],
        is_active: true,
      };
      const errors = validateRequiredFields({ po_number: 'PO-123' }, config);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('AI Mapper (Heuristic)', () => {
  it('maps identical field names', () => {
    const suggestions = heuristicMap(
      ['po_number', 'order_date'],
      ['po_number', 'order_date'],
    );
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].confidence).toBe(1.0);
  });

  it('maps similar field names', () => {
    const suggestions = heuristicMap(
      ['buyer_po_num', 'ship_date'],
      ['po_number', 'shipment_date'],
    );
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('converts suggestions to mappings', () => {
    const suggestions = heuristicMap(['po_number'], ['po_number']);
    const mappings = suggestionsToMappings(suggestions);
    expect(mappings).toHaveLength(1);
    expect(mappings[0].source_path).toBe('po_number');
    expect(mappings[0].is_required).toBe(true);
  });

  it('uses test provider for suggestions', async () => {
    const testProvider = createTestProvider({
      po_number: 'buyer_po_number',
      order_date: 'date_ordered',
    });
    registerProvider(testProvider);

    const suggestions = await generateMappingSuggestions(
      ['po_number', 'order_date'],
      ['buyer_po_number', 'date_ordered'],
      'test',
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].source_path).toBe('po_number');
    expect(suggestions[0].target_path).toBe('buyer_po_number');
  });
});
