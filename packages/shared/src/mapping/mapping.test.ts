import { describe, it, expect } from 'vitest';
import { applyMapping, getNestedValue, setNestedValue, getLeafPaths } from './engine.js';
import { applyTransform, getAvailableTransforms } from './transform.js';
import { heuristicMap, suggestionsToMappings } from './ai-mapper.js';
import type { MappingConfigDef } from './types.js';

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
      fields: [
        { source_path: 'po_number', target_path: 'buyer_po_number', required: true },
        {
          source_path: 'date',
          target_path: 'order_date',
          required: true,
          transform: { type: 'format_date', params: { format: 'YYYY-MM-DD' } },
        },
        {
          source_path: 'total',
          target_path: 'total_amount',
          required: false,
          transform: { type: 'to_fixed', params: { decimals: 2 } },
        },
        {
          source_path: 'missing_field',
          target_path: 'optional_val',
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
      expect(result.errors[0].code).toBe('REQUIRED_FIELD_MISSING');
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
    expect(mappings[0].required).toBe(true);
  });
});
